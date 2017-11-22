const Web3 = require('web3');
const net = require('net');
import config from '../../config';
import { injectable } from 'inversify';

import {
  Transaction,
  TRANSACTION_STATUS_PENDING,
  JCR_TRANSFER,
  TRANSACTION_STATUS_CONFIRMED,
  REFERRAL_TRANSFER
} from '../../entities/transaction';
import { getConnection } from 'typeorm';
import { TransactionServiceInterface } from '../../services/transaction.service';
import * as Bull from 'bull';

export interface Web3HandlerInterface {

}

/* istanbul ignore next */
@injectable()
export class Web3Handler implements Web3HandlerInterface {
  web3: any;
  ico: any;
  jcrToken: any;
  private txService: TransactionServiceInterface;
  private queueWrapper: any;

  constructor(
    txService
  ) {
    if (config.rpc.type === 'ipc') {
      this.web3 = new Web3(new Web3.providers.IpcProvider(config.rpc.address, net));
    } else {
      this.web3 = new Web3(config.rpc.address);
    }
    this.txService = txService;
    this.ico = new this.web3.eth.Contract(config.contracts.ico.abi, config.contracts.ico.address);
    this.jcrToken = new this.web3.eth.Contract(config.contracts.jcrToken.abi, config.contracts.jcrToken.address);

    // process new blocks
    this.web3.eth.subscribe('newBlockHeaders')
      .on('data', (data) => this.processNewBlockHeaders(data));

    // process pending transactions
    this.web3.eth.subscribe('pendingTransactions')
      .on('data', (txHash) => this.processPendingTransaction(txHash));

    // process JCR transfers
    this.jcrToken.events.Transfer()
      .on('data', (data) => this.processJcrTransfer(data));

    // process referral transfers
    this.ico.events.NewReferralTransfer()
      .on('data', (data) => this.processReferralTransfer(data));

    this.queueWrapper = new Bull('check_transaction', config.redis.url);
    this.queueWrapper.process((job) => {
      return this.checkAndRestoreTransactions(job);
    });
    this.queueWrapper.add({}, {repeat: {cron: '*/10 * * * *'}});
    this.queueWrapper.on('error', (error) => {
      console.error(error);
    });
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
      await this.saveConfirmedTransaction(transaction, blockData, transactionReceipt);
    }
  }

  /**
   * This method saves only confirmed ETH transactions.
   * To process confirmed success JCR transfers use JCR token Transfer event.
   * @param transactionData
   * @param blockData
   * @param transactionReceipt
   * @returns {Promise<void>}
   */
  async saveConfirmedTransaction(transactionData: any, blockData: any, transactionReceipt: any): Promise<void> {
    const tx = await this.txService.getTxByTxData(transactionData);
    const status = this.txService.getTxStatusByReceipt(transactionReceipt);

    if (tx && ((tx.type === JCR_TRANSFER && status === TRANSACTION_STATUS_CONFIRMED) || tx.status !== TRANSACTION_STATUS_PENDING)) {
      // success jcr transfer or transaction already processed
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

  async processJcrTransfer(data: any): Promise<void> {
    const txRepo = getConnection().getMongoRepository(Transaction);

    const tx = await txRepo.findOne({
      transactionHash: data.transactionHash,
      type: JCR_TRANSFER,
      from: data.returnValues.from,
      to: data.returnValues.to
    });

    const transactionReceipt = await this.web3.eth.getTransactionReceipt(data.transactionHash);
    const blockData = await this.web3.eth.getBlock(data.blockNumber);
    const status = this.txService.getTxStatusByReceipt(transactionReceipt);

    const transformedTxData = {
      transactionHash: data.transactionHash,
      from: data.returnValues.from,
      type: JCR_TRANSFER,
      to: data.returnValues.to,
      ethAmount: '0',
      jcrAmount: this.web3.utils.fromWei(data.returnValues.value).toString(),
      status: status,
      timestamp: blockData.timestamp,
      blockNumber: blockData.number
    };

    if (tx) {
      await txRepo.updateOne({
        transactionHash: data.transactionHash,
        type: JCR_TRANSFER
      }, transformedTxData);
    } else {
      const newTx = txRepo.create(transformedTxData);
      await txRepo.save(newTx);
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
    const blockData = await this.web3.eth.getBlock(data.blockNumber);
    const status = this.txService.getTxStatusByReceipt(transactionReceipt);

    const transformedTxData = {
      transactionHash: data.transactionHash,
      from: data.returnValues.investor,
      type: REFERRAL_TRANSFER,
      to: data.returnValues.referral,
      ethAmount: '0',
      jcrAmount: this.web3.utils.fromWei(data.returnValues.tokenAmount).toString(),
      status: status,
      timestamp: blockData.timestamp,
      blockNumber: blockData.number
    };

    const newTx = txRepo.create(transformedTxData);
    await txRepo.save(newTx);
  }

  async checkAndRestoreTransactions(job: any): Promise<boolean> {
    const transferEvents = await this.jcrToken.getPastEvents('Transfer', { fromBlock: 0 });

    for (let event of transferEvents) {
      await this.processJcrTransfer(event);
    }

    const referralEvents = await this.ico.getPastEvents('NewReferralTransfer', { fromBlock: 0 });

    for (let event of referralEvents) {
      await this.processReferralTransfer(event);
    }

    const currentBlock = await this.web3.eth.getBlockNumber();
    for (let i = config.web3.startBlock; i < currentBlock; i++) {
      const blockData = await this.web3.eth.getBlock(i, true);
      const transactions = blockData.transactions;
      for (let transaction of transactions) {
        const transactionReceipt = await this.web3.eth.getTransactionReceipt(transaction.hash);
        await this.saveConfirmedTransaction(transaction, blockData, transactionReceipt);
      }
    }

    return true;
  }
}

const Web3HandlerType = Symbol('Web3HandlerInterface');

export { Web3HandlerType };
