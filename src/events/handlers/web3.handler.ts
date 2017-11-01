import {Investor} from '../../entities/investor';

const Web3 = require('web3');
const net = require('net');
import config from '../../config';
import {injectable} from 'inversify';
const abiDecoder = require('abi-decoder');
import { Transaction, TRANSACTION_STATUS_PENDING, JCR_TRANSFER } from '../../entities/transaction';
import { getConnection } from 'typeorm';

export interface Web3HandlerInterface {

}

@injectable()
export class Web3Handler implements Web3HandlerInterface {
  web3: any;
  ico: any;
  jcrToken: any;

  constructor() {
    this.web3 = new Web3(new Web3.providers.IpcProvider('/home/ethereum/geth.ipc', net));
    this.ico = new this.web3.eth.Contract(config.contracts.ico.abi, config.contracts.ico.address);
    this.jcrToken = new this.web3.eth.Contract(config.contracts.jcrToken.abi, config.contracts.jcrToken.address);

    this.web3.eth.subscribe('newBlockHeaders')
      .on('data', (data) => this.processNewBlockHeaders(data))
      .on('error', (error) => this.processNewBlockHeadersError(error));

    this.web3.eth.subscribe('pendingTransactions')
      .on('data', (data) => this.processPendingTransaction(data))
      .on('error', (error) => this.processPendingTransactionError(error));

    this.jcrToken.events.Transfer()
      .on('data', (data) => this.processJcrTransfer(data))
      .on('change', (data) => this.processJcrTransferChange(data))
      .on('error', (error) => this.processJcrTransferError(error));

    this.ico.events.NewReferralTransfer()
      .on('data', (data) => this.processReferralTransfer(data))
      .on('change', (data) => this.processReferralTransferChange(data))
      .on('error', (error) => this.processReferralTransferError(error));

    abiDecoder.addABI(config.contracts.jcrToken.abi);
  }

  processNewBlockHeaders(data: any) {
    if (!data.number) {
      // skip pending blocks
      return;
    }

    //console.log(data);
  }

  processNewBlockHeadersError(error: any) {

  }

  async processPendingTransaction(data: any) {
    const txRepo = getConnection().getMongoRepository(Transaction);
    const investorRepo = getConnection().getMongoRepository(Investor);

    const transactionData = await this.web3.eth.getTransaction(data);
    if (transactionData.to && transactionData.to.toLowerCase() == config.contracts.jcrToken.address.toLowerCase()) {
      console.log(transactionData);

      const decodedData = abiDecoder.decodeMethod(transactionData.input);
      if (decodedData.name == 'transfer') {
        const from = transactionData.from;
        const to = decodedData.params[0].value;

        const transformedTxData = {
          transactionHash: transactionData.hash,
          from: transactionData.from,
          type: JCR_TRANSFER,
          to: decodedData.params[0].value,
          ethAmount: this.web3.utils.fromWei(transactionData.value).toString(),
          jcrAmount: this.web3.utils.fromWei(decodedData.params[1].value).toString(),
          status: TRANSACTION_STATUS_PENDING,
          timestamp: Math.round(+new Date() / 1000)
        };

        const txToSave = Transaction.createTransaction(transformedTxData);

        await txRepo.save(txToSave);
      }
    }
  }

  processPendingTransactionError(error: any) {

  }

  processJcrTransfer(data: any) {
    //console.log(data);
  }

  processJcrTransferChange(data: any) {

  }

  processJcrTransferError(error: any) {

  }

  processReferralTransfer(data: any) {

  }

  processReferralTransferChange(data: any) {

  }

  processReferralTransferError(error: any) {

  }
}

const Web3HandlerType = Symbol('Web3HandlerInterface');

export {Web3HandlerType};