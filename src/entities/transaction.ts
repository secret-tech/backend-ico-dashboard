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
  timestamp: number;

  @Column()
  blockNumber: number;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column()
  ethAmount: string;

  @Column()
  jcrAmount: string;

  @Column()
  status: string;

  @Column()
  type: string;
}
