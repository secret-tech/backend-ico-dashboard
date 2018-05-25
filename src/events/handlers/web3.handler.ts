import config from '../../config';
import { injectable } from 'inversify';
import * as redis from 'redis';
import { promisify } from 'util';

const Web3 = require('web3');
const net = require('net');

import {
  Transaction,
  TRANSACTION_STATUS_PENDING,
  TOKEN_TRANSFER,
  TRANSACTION_STATUS_CONFIRMED,
  REFERRAL_TRANSFER
} from '../../entities/transaction';
import { getConnection } from 'typeorm';
import { TransactionServiceInterface } from '../../services/transaction.service';
import * as Bull from 'bull';
import { Logger } from '../../logger';

export interface Web3HandlerInterface {

}

/* istanbul ignore next */
@injectable()
export class Web3Handler implements Web3HandlerInterface {
  private logger = Logger.getInstance('WEB3_HANDLER');
  web3: any;
  ico: any;
  token: any;
  private txService: TransactionServiceInterface;
  private queueWrapper: any;
  private redisClient: redis.RedisClient;
  private redisGetAsync: any;
  private redisSetAsync: any;

  constructor(
    txService
  ) {
    this.redisClient = redis.createClient({
      url: config.redis.url,
      prefix: config.redis.prefix
    });
    this.redisGetAsync = promisify(this.redisClient.get).bind(this.redisClient);
    this.redisSetAsync = promisify(this.redisClient.set).bind(this.redisClient);

    this.txService = txService;

    switch (config.rpc.type) {
      case 'ipc':
        this.web3 = new Web3(new Web3.providers.IpcProvider(config.rpc.address, net));
        break;
      case 'ws':
        const webSocketProvider = new Web3.providers.WebsocketProvider(config.rpc.address);

        webSocketProvider.connection.onclose = () => {
          this.logger.info('Web3 socket connection closed');
          this.onWsClose();
        };

        this.web3 = new Web3(webSocketProvider);
        break;
      case 'http':
        this.web3 = new Web3(config.rpc.address);
        break;
      default:
        throw Error('Unknown Web3 RPC type!');
    }

    this.createContracts();

    if (config.rpc.type !== 'http') {
      this.attachHandlers();
    }

    this.queueWrapper = new Bull('check_transaction', config.redis.url);
    this.queueWrapper.process((job) => {
      return this.checkAndRestoreTransactions(job);
    });
    this.queueWrapper.add({}, {repeat: {cron: '*/10 * * * *'}});
    this.queueWrapper.on('error', (error) => {
      this.logger.exception(error);
    });
    this.logger.verbose('Web3 transactions job worker started');
  }

  async processNewBlockHeaders(data: any): Promise<void> {
    if (!data.number) {
      // skip pending blocks
      return;
    }

    const blockData = await this.web3.eth.getBlock(data.hash, true);
    const transactions = blockData.transactions;
    for (let transaction of transactions) {
      const transactionReceipt = await this.web3.eth.getTransactionReceipt(transaction.hash);
      if (transactionReceipt) {
        await this.saveConfirmedTransaction(transaction, blockData, transactionReceipt);
      }
    }
  }

  /**
   * This method saves only confirmed ETH transactions.
   * To process confirmed success token transfers use token Transfer event.
   * @param transactionData
   * @param blockData
   * @param transactionReceipt
   * @returns {Promise<void>}
   */
  async saveConfirmedTransaction(transactionData: any, blockData: any, transactionReceipt: any): Promise<void> {
    const tx = await this.txService.getTxByTxData(transactionData);
    const status = this.txService.getTxStatusByReceipt(transactionReceipt);

    if (tx && ((tx.type === TOKEN_TRANSFER && status === TRANSACTION_STATUS_CONFIRMED) || tx.status !== TRANSACTION_STATUS_PENDING)) {
      // success token transfer or transaction already processed
      return;
    }

    const userCount = await this.txService.getUserCountByTxData(transactionData);

    // save only transactions of investor addresses
    if (userCount > 0) {
      if (tx) {
        await this.txService.updateTx(tx, status, blockData);
        return;
      }

      await this.txService.createAndSaveTransaction(transactionData, status, blockData);
    }
  }

  // process pending transaction by transaction hash
  async processPendingTransaction(txHash: string): Promise<void> {
    const data = await this.web3.eth.getTransaction(txHash);

    if (!data) {
      return;
    }

    const tx = await this.txService.getTxByTxData(data);

    if (tx) {
      // tx is already processed
      return;
    }

    const userCount = await this.txService.getUserCountByTxData(data);

    // save only transactions of investor addresses
    if (userCount > 0) {
      await this.txService.createAndSaveTransaction(data, TRANSACTION_STATUS_PENDING);
    }
  }

  async processTokenTransfer(data: any): Promise<void> {
    const txRepo = getConnection().getMongoRepository(Transaction);

    const tx = await txRepo.findOne({
      transactionHash: data.transactionHash,
      type: TOKEN_TRANSFER,
      from: data.returnValues.from,
      to: data.returnValues.to
    });

    const transactionReceipt = await this.web3.eth.getTransactionReceipt(data.transactionHash);
    if (transactionReceipt) {
      const blockData = await this.web3.eth.getBlock(data.blockNumber);
      const status = this.txService.getTxStatusByReceipt(transactionReceipt);

      const transformedTxData = {
        transactionHash: data.transactionHash,
        from: data.returnValues.from,
        type: TOKEN_TRANSFER,
        to: data.returnValues.to,
        ethAmount: '0',
        tokenAmount: this.web3.utils.fromWei(data.returnValues.value).toString(),
        status: status,
        timestamp: blockData.timestamp,
        blockNumber: blockData.number
      };

      if (!tx) {
        const newTx = txRepo.create(transformedTxData);
        await txRepo.save(newTx);
      } else if (tx.status === TRANSACTION_STATUS_PENDING) {
        tx.status = status;
        await txRepo.save(tx);
      }
    }
  }

  async processReferralTransfer(data: any): Promise<void> {
    const txRepo = getConnection().getMongoRepository(Transaction);

    const existing = await txRepo.findOne({
      transactionHash: data.transactionHash,
      type: REFERRAL_TRANSFER,
      from: data.returnValues.investor,
      to: data.returnValues.referral
    });

    if (existing) {
      return;
    }

    const transactionReceipt = await this.web3.eth.getTransactionReceipt(data.transactionHash);

    if (transactionReceipt) {
      const blockData = await this.web3.eth.getBlock(data.blockNumber);
      const status = this.txService.getTxStatusByReceipt(transactionReceipt);

      const transformedTxData = {
        transactionHash: data.transactionHash,
        from: data.returnValues.investor,
        type: REFERRAL_TRANSFER,
        to: data.returnValues.referral,
        ethAmount: '0',
        tokenAmount: this.web3.utils.fromWei(data.returnValues.tokenAmount).toString(),
        status: status,
        timestamp: blockData.timestamp,
        blockNumber: blockData.number
      };

      const newTx = txRepo.create(transformedTxData);
      await txRepo.save(newTx);
    }
  }

  async checkAndRestoreTransactions(job: any): Promise<boolean> {
    const transferEvents = await this.token.getPastEvents('Transfer', { fromBlock: 0 });

    for (let event of transferEvents) {
      await this.processTokenTransfer(event);
    }

    const referralEvents = await this.ico.getPastEvents('NewReferralTransfer', { fromBlock: 0 });

    for (let event of referralEvents) {
      await this.processReferralTransfer(event);
    }

    const currentBlock = await this.web3.eth.getBlockNumber();
    const lastCheckedBlock = await this.redisGetAsync('lastCheckedBlock');
    const startBlock = lastCheckedBlock ? lastCheckedBlock : config.web3.startBlock;

    for (let i = startBlock - config.web3.blockOffset; i < currentBlock; i++) {
      const blockData = await this.web3.eth.getBlock(i, true);
      const transactions = blockData.transactions;
      for (let transaction of transactions) {
        const transactionReceipt = await this.web3.eth.getTransactionReceipt(transaction.hash);
        if (transactionReceipt) {
          await this.saveConfirmedTransaction(transaction, blockData, transactionReceipt);
        }
      }
    }

    await this.redisSetAsync('lastCheckedBlock', currentBlock);

    return true;
  }

  onWsClose() {
    this.logger.error('Web3 socket connection closed. Trying to reconnect');
    const webSocketProvider = new Web3.providers.WebsocketProvider(config.rpc.address);
    webSocketProvider.connection.onclose = () => {
      this.logger.info('Web3 socket connection closed');
      setTimeout(() => {
        this.onWsClose();
      }, config.rpc.reconnectTimeout);
    };

    this.web3.setProvider(webSocketProvider);
    this.createContracts();
    this.attachHandlers();
  }

  createContracts() {
    this.ico = new this.web3.eth.Contract(config.contracts.ico.abi, config.contracts.ico.address);
    this.token = new this.web3.eth.Contract(config.contracts.token.abi, config.contracts.token.address);
  }

  attachHandlers() {
    // process new blocks
    this.web3.eth.subscribe('newBlockHeaders')
      .on('data', (data) => this.processNewBlockHeaders(data));

    // process pending transactions
    this.web3.eth.subscribe('pendingTransactions')
      .on('data', (txHash) => this.processPendingTransaction(txHash));

    // process token transfers
    this.token.events.Transfer()
      .on('data', (data) => this.processTokenTransfer(data));

    // process referral transfers
    this.ico.events.NewReferralTransfer()
      .on('data', (data) => this.processReferralTransfer(data));
  }
}

const Web3HandlerType = Symbol('Web3HandlerInterface');

export { Web3HandlerType };
