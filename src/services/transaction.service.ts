import {
  Transaction,
  REFERRAL_TRANSFER,
  JCR_TRANSFER,
  TRANSACTION_STATUS_CONFIRMED,
  TRANSACTION_STATUS_FAILED,
  ETHEREUM_TRANSFER
} from '../entities/transaction';
import { getConnection, getMongoManager } from 'typeorm';
import { Investor } from '../entities/investor';
import { injectable } from 'inversify';
import config from '../config';
const abiDecoder = require('abi-decoder');
const Web3 = require('web3');
const net = require('net');
const DIRECTION_IN = 'in';
const DIRECTION_OUT = 'out';

interface ExtendedTransaction extends Transaction {
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
  users: ReferralData[];
}

interface FromToJcrAmount {
  from: string;
  to: string;
  jcrAmount: string;
}

export interface TransactionServiceInterface {
  getTransactionsOfUser(user: Investor): Promise<ExtendedTransaction[]>;

  getReferralIncome(user: Investor): Promise<ReferralResult>;

  getFromToJcrAmountByTxDataAndType(txData: any, type: string): FromToJcrAmount;

  getTxByHashAndType(hash: string, type: string): Promise<Transaction>;

  getTxStatusByReceipt(receipt: any): string;

  getTxTypeByData(transactionData: any): string;

  getUserCountByFromTo(from: string, to: string): Promise<number>;
}

@injectable()
export class TransactionService implements TransactionServiceInterface {
  web3: any;

  constructor() {
    this.web3 = new Web3(new Web3.providers.IpcProvider('/home/ethereum/geth.ipc', net));
  }

  async getTransactionsOfUser(user: Investor): Promise<ExtendedTransaction[]> {
    const data = await getMongoManager().createEntityCursor(Transaction, {
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

    for (let transaction of data) {
      if (transaction.from === user.ethWallet.address) {
        transaction.direction = DIRECTION_OUT;
      } else {
        transaction.direction = DIRECTION_IN;
      }
    }

    return data;
  }

  async getReferralIncome(user: Investor): Promise<ReferralResult> {
    const transactions = await getMongoManager().createEntityCursor(Transaction, {
      '$and': [
        {
          'to': user.ethWallet.address
        },
        {
          'type': REFERRAL_TRANSFER
        }
      ]
    }).toArray();

    let users = [];

    for (let transaction of transactions) {
      const referral = await getMongoManager().createEntityCursor(Investor, {
        'ethWallet.address': transaction.from
      }).toArray();

      users.push({
        date: transaction.timestamp,
        tokens: transaction.jcrAmount,
        walletAddress: transaction.from,
        name: referral[0].name
      });
    }

    return {
      data: user.referralCode,
      users
    };
  }

  getFromToJcrAmountByTxDataAndType(txData: any, type: string): FromToJcrAmount {
    let from = this.web3.utils.toChecksumAddress(txData.from);
    let to = null;
    let jcrAmount = null;

    // direct transfer calls of JCR tokens
    if (type === JCR_TRANSFER) {
      abiDecoder.addABI(config.contracts.jcrToken.abi);
      const decodedData = abiDecoder.decodeMethod(txData.input);
      if (decodedData.name === 'transfer') {
        to = this.web3.utils.toChecksumAddress(decodedData.params[0].value);
        jcrAmount = this.web3.utils.fromWei(decodedData.params[1].value).toString();
      }
    } else {
      if (txData.to) {
        to = this.web3.utils.toChecksumAddress(txData.to);
      }
    }

    return {
      from,
      to,
      jcrAmount
    };
  }

  async getTxByHashAndType(hash: string, type: string): Promise<Transaction> {
    const txRepo = getConnection().getMongoRepository(Transaction);
    return await txRepo.findOne({
      transactionHash: hash,
      type: type
    });
  }

  getTxStatusByReceipt(receipt: any): string {
    if (receipt.status === '0x1') {
      return TRANSACTION_STATUS_CONFIRMED;
    } else {
      return TRANSACTION_STATUS_FAILED;
    }
  }

  getTxTypeByData(transactionData: any): string {
    if (transactionData.to && transactionData.to.toLowerCase() === config.contracts.jcrToken.address.toLowerCase()) {
      return JCR_TRANSFER;
    }

    return ETHEREUM_TRANSFER;
  }

  getUserCountByFromTo(from: string, to: string): Promise<number> {
    let query;
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
}

const TransactionServiceType = Symbol('TransactionServiceInterface');
export {TransactionServiceType};
