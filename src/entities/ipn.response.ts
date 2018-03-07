import { Entity, ObjectID, ObjectIdColumn, Column } from "typeorm";

// Payment Statuses
export const REFUND_OR_REVERSAL = -2;
export const CANCELLED_TIMEOUT = -1;
export const WAITING = 0;
export const CONFIRMING_COIN_RECEPT = 1;
export const QUEUED_FOR_NIGHTLY_PAYOUT = 2;
export const PAYPAL_PANDING = 3;
export const PAYMENT_COMPLETE = 100;

@Entity()
export class IPNResponse {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  ipn_version: string;

  @Column()
  ipn_type: string; // 'api'

  @Column()
  ipn_mode: string; // 'hmac'

  @Column()
  ipn_id: string; // unique id

  @Column()
  merchant: string;

  // API fields
  @Column()
  staus: number; // see: https://www.coinpayments.net/merchant-tools-ipn#statuses

  @Column()
  status_text: string;

  @Column()
  txn_id: string;

  @Column()
  currency1: string;

  @Column()
  currency2: string;

  @Column()
  amount1: number;

  @Column()
  amount2: number;

  @Column()
  fee: number;

  @Column()
  buyer_name: string;

  @Column()
  email: string;

  @Column()
  item_name: string;

  @Column()
  item_number: string;

  @Column()
  received_amount: number;

  @Column()
  received_confirms: number;

  @Column()
  net: string;

  static createIPNResponse(data: any): IPNResponse {
    const ipnResponse = new IPNResponse();
    Object.assign(ipnResponse, data);
    return ipnResponse;
  }
}
