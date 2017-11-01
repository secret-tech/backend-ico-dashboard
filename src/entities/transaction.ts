import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import 'reflect-metadata';

export const TRANSACTION_STATUS_PENDING = 'pending';
export const TRANSACTION_STATUS_CONFIRMED = 'confirmed';
export const TRANSACTION_STATUS_FAILED = 'failed';

export const ETHEREUM_TRANSFER = 'eth_transfer';
export const JCR_TRANSFER = 'jcr_transfer';
export const REFERRAL_TRANSFER = 'referral_transfer';

@Entity()
export class Transaction {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  transactionHash: string;

  @Column()
  timestamp: string;

  @Column()
  blockNumber: number;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column()
  ethValue: string;

  @Column()
  jcrValue: string;

  @Column()
  status: string;

  @Column()
  type: string;

  static createTransaction(data: any): Transaction {
    const transaction = new Transaction();
    transaction.transactionHash = data.transactionHash;
    transaction.timestamp = data.timestamp;
    transaction.from = data.from;
    transaction.to = data.to;
    transaction.blockNumber = data.blockNumber;
    transaction.ethValue = data.ethValue;
    transaction.jcrValue = data.jcrValue;
    transaction.type = data.type;
    transaction.status = data.status;
    return transaction;
  }
}
