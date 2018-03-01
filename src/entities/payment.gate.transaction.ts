import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { TRANSACTION_STATUS_CONFIRMED } from './transaction';
import { CoinpaymentsTransactionResult } from './coinpayments.transaction.result';

export const PAYMENT_GATE_TRANSACTION_TYPE_BUY = 'BUY';
export const PAYMENT_GATE_TRANSACTION_TYPE_CONVERT = 'CONVERT';

export const PAYMENT_GATE_TRANSACTION_STATUS_STARTED = 'STARTED';
export const PAYMENT_GATE_TRANSACTION_STATUS_PENDING = 'PENDING';
export const PAYMENT_GATE_TRANSACTION_STATUS_FAILED = 'FAILED';
export const PAYMENT_GATE_TRANSACTION_STATUS_COMPLETE = 'COMPLETE';
export const PAYMENT_GATE_TRANSACTION_STATUS_INITIATE_TRANSFER_TOKENS = 'INITIATE_TRANSFER_TOKENS';

@Entity()
export class PaymentGateTransaction {

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
