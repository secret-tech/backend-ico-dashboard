import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import 'reflect-metadata';
import { Index } from 'typeorm/decorator/Index';

export const TRANSACTION_STATUS_PENDING = 'pending';
export const TRANSACTION_STATUS_CONFIRMED = 'confirmed';
export const TRANSACTION_STATUS_FAILED = 'failed';

export const ETHEREUM_TRANSFER = 'eth_transfer';
export const TOKEN_TRANSFER = 'token_transfer';
export const REFERRAL_TRANSFER = 'referral_transfer';

@Entity()
@Index('hash_type_from_to', () => ({
  transactionHash: 1,
  type: 1,
  from: 1,
  to: 1
}), { unique: true })
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
  tokenAmount: string;

  @Column()
  status: string;

  @Column()
  type: string;
}
