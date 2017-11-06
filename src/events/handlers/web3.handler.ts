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
    this.txService = txService;
    this.web3 = new Web3(new Web3.providers.IpcProvider('/home/ethereum/geth.ipc', net));
    this.ico = new this.web3.eth.Contract(config.contracts.ico.abi, config.contracts.ico.address);
    this.jcrToken = new this.web3.eth.Contract(config.contracts.jcrToken.abi, config.contracts.jcrToken.address);

    // process new blocks
    this.web3.eth.subscribe('newBlockHeaders')
      .on('data', (data) => this.processNewBlockHeaders(data));

    // process pending transactions
    this.web3.eth.subscribe('pendingTransactions')
      .on('data', (data) => this.processPendingTransaction(data));

    // process JCR transfers
    this.jcrToken.events.Transfer()
      .on('data', (data) => this.processJcrTransfer(data));

    // process referral transfers
    this.ico.events.NewReferralTransfer()
      .on('data', (data) => this.processReferralTransfer(data));

    this.queueWrapper = new Bull('check_transaction', 'redis://redis:6379');
    this.queueWrapper.process((job) => {
      this.checkAndRestoreTransactions(job);
    });
    this.queueWrapper.add({}, {repeat: {cron: '* * * * *'}});
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
    const type = this.txService.getTxTypeByData(transactionData);

    const txRepo = getConnection().getMongoRepository(Transaction);
    const tx = await this.txService.getTxByHashAndType(transactionData.hash, type);
    const status = this.txService.getTxStatusByReceipt(transactionReceipt);

    if ((type === JCR_TRANSFER && status === TRANSACTION_STATUS_CONFIRMED) || (tx && tx.status !== TRANSACTION_STATUS_PENDING)) {
      // success jcr transfer or transaction already processed
      return;
    }

    const { from, to, jcrAmount } = this.txService.getFromToJcrAmountByTxDataAndType(transactionData, type);

    const userCount = await this.txService.getUserCountByFromTo(from, to);

    // save only transactions of investor addresses
    if (userCount > 0) {
      if (tx) {
        tx.status = status;
        tx.timestamp = blockData.timestamp;
        tx.blockNumber = blockData.number;
        await txRepo.save(tx);
        return;
      }

      const transformedTxData = {
        transactionHash: transactionData.hash,
        from: from,
        type: type,
        to: to,
        ethAmount: this.web3.utils.fromWei(transactionData.value).toString(),
        jcrAmount: jcrAmount,
        status: status,
        timestamp: blockData.timestamp,
        blockNumber: blockData.number
      };

      const txToSave = txRepo.create(transformedTxData);
      await txRepo.save(txToSave);
    }
  }

  // process pending transaction by transaction hash
  async processPendingTransaction(data: string): Promise<void> {
    const transactionData = await this.web3.eth.getTransaction(data);
    const type = this.txService.getTxTypeByData(transactionData);

    const txRepo = getConnection().getMongoRepository(Transaction);
    const tx = await this.txService.getTxByHashAndType(transactionData.hash, type);

    if (tx) {
      // tx is already processed
      return;
    }

    const { from, to, jcrAmount } = this.txService.getFromToJcrAmountByTxDataAndType(transactionData, type);
    const userCount = await this.txService.getUserCountByFromTo(from, to);

    // save only transactions of investor addresses
    if (userCount > 0) {
      const transformedTxData = {
        transactionHash: transactionData.hash,
        from: from,
        type: type,
        to: to,
        ethAmount: this.web3.utils.fromWei(transactionData.value).toString(),
        jcrAmount: jcrAmount,
        status: TRANSACTION_STATUS_PENDING,
        timestamp: Math.round(+new Date() / 1000)
      };

      const txToSave = txRepo.create(transformedTxData);

      await txRepo.save(txToSave);
    }
  }

  async processJcrTransfer(data: any): Promise<void> {
    const txRepo = getConnection().getMongoRepository(Transaction);

    const tx = await this.txService.getTxByHashAndType(data.transactionHash, JCR_TRANSFER);
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
    const existing = await this.txService.getTxByHashAndType(data.transactionHash, REFERRAL_TRANSFER);
    if (existing) {
      return;
    }

    const txRepo = getConnection().getMongoRepository(Transaction);
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

  async checkAndRestoreTransactions(job: any) {
    const transferEvents = await this.jcrToken.getPastEvents('Transfer', { fromBlock: 0 });

    for (let event of transferEvents) {
      await this.processJcrTransfer(event);
    }
  }
}

const Web3HandlerType = Symbol('Web3HandlerInterface');

export { Web3HandlerType };
