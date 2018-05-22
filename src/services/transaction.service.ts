import {
  Transaction,
  REFERRAL_TRANSFER,
  TOKEN_TRANSFER,
  TRANSACTION_STATUS_CONFIRMED,
  TRANSACTION_STATUS_FAILED,
  ETHEREUM_TRANSFER
} from '../entities/transaction';
import { getConnection, getMongoManager } from 'typeorm';
import { Investor } from '../entities/investor';
import { injectable } from 'inversify';
import config from '../config';
import { PaymentGateTransaction } from '../entities/payment.gate.transaction';
const abiDecoder = require('abi-decoder');
const Web3 = require('web3');
const net = require('net');
const DIRECTION_IN = 'in';
const DIRECTION_OUT = 'out';

interface ExtendedTransaction extends Transaction, GenericTransaction {
  direction: string;
}

interface ReferralData {
  date: number;
  name: string;
  walletAddress: string;
  tokens: string;
}

interface ReferralResult {
  data: string;
  referralCount: number;
  users: ReferralData[];
}

interface FromToTokenAmount {
  from: string;
  to: string;
  tokenAmount: string;
}

export interface TransactionServiceInterface {
  getTransactionsOfUser(user: Investor): Promise<GenericTransaction[]>;

  getReferralIncome(user: Investor): Promise<ReferralResult>;

  getFromToTokenAmountByTxDataAndType(txData: any, type: string): FromToTokenAmount;

  getTxStatusByReceipt(receipt: any): string;

  getTxTypeByData(transactionData: any): string;

  getTxByTxData(transactionData: any): Promise<Transaction>;

  getUserCountByTxData(txData: any): Promise<number>;

  updateTx(tx: Transaction, status: string, blockData: any): Promise<void>;

  createAndSaveTransaction(transactionData: any, status: string, blockData?: any): Promise<void>;
}

@injectable()
export class TransactionService implements TransactionServiceInterface {
  web3: any;

  constructor() {
    if (config.rpc.type === 'ipc') {
      this.web3 = new Web3(new Web3.providers.IpcProvider(config.rpc.address, net));
    } else {
      this.web3 = new Web3(config.rpc.address);
    }
  }

  async getTransactionsOfUser(user: Investor): Promise<GenericTransaction[]> {
    const data: Array<GenericTransaction> = [];

    data.push(...await this.getExtendedTransactions(user));
    data.push(...await this.getPaymentGateTransactions(user));

    return data;
  }

  private async getPaymentGateTransactions(user: Investor): Promise<Array<GenericTransaction>> {
    const data: Array<GenericTransaction> = [];
    const paymentGateTransactionRepository = getConnection().mongoManager.getMongoRepository(PaymentGateTransaction);
    const txs = await paymentGateTransactionRepository.find({
      where: {userEmail: user.email.toLowerCase()}
    });

    txs.forEach(item => {
      if (item.buyIpns.length > 0) {
        let tx = {} as PaymentGateTransactionView;

        // get latest actual ipn response.
        item.buyIpns.sort((a, b) => {
          return a.status - b.status;
        });

        const actualIPN = item.buyIpns[0].status < 0 ? item.buyIpns[0] : item.buyIpns[item.buyIpns.length - 1];

        tx.address = item.buyCoinpaymentsData.address;
        tx.confirmsNeeded = item.buyCoinpaymentsData.confirmsNeeded;
        tx.currency = item.buyCoinpaymentsData.currency2;
        tx.expiredOn = item.expiredOn;
        tx.id = item.id.toHexString();
        tx.qrcodeUrl = item.buyCoinpaymentsData.qrcodeUrl;
        tx.receivedAmount = actualIPN.receivedAmount;
        tx.receivedConfirms = actualIPN.receivedConfirms;
        tx.status = actualIPN.status;
        tx.statusUrl = item.buyCoinpaymentsData.statusUrl;
        tx.totalAmount = item.buyCoinpaymentsData.amount;
        tx.txnId = item.buyCoinpaymentsData.txnId;
        tx.type = 'gateway_transaction';
        tx.timestamp = item.timestamp;
        tx.timeout = item.buyCoinpaymentsData.timeout;

        data.push(tx);
      }
    });

    return data;
  }

  private async getExtendedTransactions(user: Investor): Promise<Array<GenericTransaction>> {
    const txs = await getMongoManager().createEntityCursor(Transaction, {
      '$and': [
        {
          '$or': [
            {
              'from': user.ethWallet.address
            },
            {
              'to': user.ethWallet.address
            }
          ]
        },
        {
          'type': {
            '$ne': REFERRAL_TRANSFER
          }
        }
      ]
    }).toArray() as ExtendedTransaction[];

    for (let transaction of txs) {
      if (transaction.from === user.ethWallet.address) {
        transaction.direction = DIRECTION_OUT;
      } else {
        transaction.direction = DIRECTION_IN;
      }
    }

    return txs;
  }

  async getReferralIncome(user: Investor): Promise<ReferralResult> {
    const referrals = await getMongoManager().createEntityCursor(Investor, {
      referral: user.email
    }).toArray();

    let users = [];

    for (let referral of referrals) {
      const transactions = await getMongoManager().createEntityCursor(Transaction, {
        'to': user.ethWallet.address,
        'from': referral.ethWallet.address,
        'type': REFERRAL_TRANSFER
      }).toArray();

      if (transactions.length === 0) {
        users.push({
          tokens: 0,
          walletAddress: referral.ethWallet.address,
          name: referral.name
        });
      } else {
        for (let transaction of transactions) {
          users.push({
            date: transaction.timestamp,
            tokens: transaction.tokenAmount,
            walletAddress: transaction.from,
            name: referral.name
          });
        }
      }
    }

    return {
      data: user.referralCode,
      referralCount: referrals.length,
      users
    };
  }

  async getTxByTxData(transactionData: any): Promise<Transaction> {
    const type = this.getTxTypeByData(transactionData);
    const { from, to } = this.getFromToTokenAmountByTxDataAndType(transactionData, type);

    const txRepo = getConnection().getMongoRepository(Transaction);
    return await txRepo.findOne({
      transactionHash: transactionData.hash,
      type,
      from,
      to
    });
  }

  getFromToTokenAmountByTxDataAndType(txData: any, type: string): FromToTokenAmount {
    let from = this.web3.utils.toChecksumAddress(txData.from);
    let to = null;
    let tokenAmount = null;

    // direct transfer calls of tokens
    if (type === TOKEN_TRANSFER) {
      abiDecoder.addABI(config.contracts.token.abi);
      const decodedData = abiDecoder.decodeMethod(txData.input);
      if (decodedData.name === 'transfer') {
        to = this.web3.utils.toChecksumAddress(decodedData.params[0].value);
        tokenAmount = this.web3.utils.fromWei(decodedData.params[1].value).toString();
      }
    } else if (txData.to) {
      to = this.web3.utils.toChecksumAddress(txData.to);
    }

    return {
      from,
      to,
      tokenAmount
    };
  }

  getTxStatusByReceipt(receipt: any): string {
    if (receipt.status === true) {
      return TRANSACTION_STATUS_CONFIRMED;
    } else {
      return TRANSACTION_STATUS_FAILED;
    }
  }

  getTxTypeByData(transactionData: any): string {
    if (transactionData.to && transactionData.to.toLowerCase() === config.contracts.token.address.toLowerCase()) {
      return TOKEN_TRANSFER;
    }

    return ETHEREUM_TRANSFER;
  }

  getUserCountByTxData(txData: any): Promise<number> {
    let query;

    const type = this.getTxTypeByData(txData);
    const { from, to } = this.getFromToTokenAmountByTxDataAndType(txData, type);
    if (to) {
      query = {
        '$or': [
          {
            'ethWallet.address': from
          },
          {
            'ethWallet.address': to
          }
        ]
      };
    } else {
      query = {
        'ethWallet.address': from
      };
    }

    return getMongoManager().createEntityCursor(Investor, query).count(false);
  }

  async updateTx(tx: Transaction, status: string, blockData: any): Promise<void> {
    const txRepo = getConnection().getMongoRepository(Transaction);
    tx.status = status;
    tx.timestamp = blockData.timestamp;
    tx.blockNumber = blockData.number;
    await txRepo.save(tx);
  }

  async createAndSaveTransaction(transactionData: any, status: string, blockData?: any ): Promise<void> {
    const txRepo = getConnection().getMongoRepository(Transaction);
    const type = this.getTxTypeByData(transactionData);
    const { from, to, tokenAmount } = this.getFromToTokenAmountByTxDataAndType(transactionData, type);

    let timestamp;
    let blockNumber;

    if (blockData) {
      timestamp = blockData.timestamp;
      blockNumber = blockData.number;
    } else {
      timestamp = Math.round(+new Date() / 1000);
    }

    const transformedTxData = {
      transactionHash: transactionData.hash,
      from,
      type,
      to,
      ethAmount: this.web3.utils.fromWei(transactionData.value).toString(),
      tokenAmount: tokenAmount,
      status,
      timestamp,
      blockNumber
    };

    const txToSave = txRepo.create(transformedTxData);
    await txRepo.save(txToSave);
  }
}

const TransactionServiceType = Symbol('TransactionServiceInterface');
export {TransactionServiceType};
