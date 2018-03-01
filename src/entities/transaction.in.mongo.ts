import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { TRANSACTION_STATUS_CONFIRMED } from './transaction';
import { CoinpaymentsTransactionResult } from './coinpayments.transaction.result';

export const TRANSACTION_IN_MONGO_TYPE_BUY = 'BUY';
export const TRANSACTION_IN_MONGO_TYPE_CONVERT = 'CONVERT';

export const TRANSACTION_IN_MONGO_STATUS_STARTED = 'STARTED';
export const TRANSACTION_IN_MONGO_STATUS_PENDING = 'PENDING';
export const TRANSACTION_IN_MONGO_STATUS_FAILED = 'FAILED';
export const TRANSACTION_IN_MONGO_STATUS_COMPLETE = 'COMPLETE';
export const TRANSACTION_IN_MONGO_STATUS_INITIATE_TRANSFER_TOKENS = 'INITIATE_TRANSFER_TOKENS';

@Entity()
export class TransactionInMongo {

  @ObjectIdColumn()
  id: ObjectID;

  @Column()
	type: string;

  @Column()
  status: string;

  @Column()
  user: any;

  @Column()
  expiredOn: number;

  @Column()
  buyCoinpaymentsData: CoinpaymentsTransactionResult;

  @Column()
  convertCoinpaymentsData: null;

  @Column()
  buyIpns: Array<any>;

  @Column()
  convertIpns: Array<any>;
}
