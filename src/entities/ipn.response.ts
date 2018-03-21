import { Entity, ObjectID, ObjectIdColumn, Column } from 'typeorm';

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
  ipnVersion: string;

  @Column()
  ipnType: string; // 'api'

  @Column()
  ipnMode: string; // 'hmac'

  @Column()
  ipnId: string; // unique id

  @Column()
  merchant: string;

  // API fields
  @Column()
  status: number; // see: https://www.coinpayments.net/merchant-tools-ipn#statuses

  @Column()
  statusText: string;

  @Column()
  txnId: string;

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
  buyerName: string;

  @Column()
  email: string;

  @Column()
  itemName: string;

  @Column()
  itemNumber: string;

  @Column()
  receivedAmount: number;

  @Column()
  receivedConfirms: number;

  @Column()
  net: string;

  @Column()
  timestamp: number;

  static createIPNResponse(data: any): IPNResponse {
    const ipnResponse = new IPNResponse();
    ipnResponse.amount1 = data.amount1;
    ipnResponse.amount2 = data.amount2;
    ipnResponse.buyerName = data.buyer_name;
    ipnResponse.currency1 = data.currency1;
    ipnResponse.currency2 = data.currency2;
    ipnResponse.email = data.email;
    ipnResponse.fee = data.fee;
    ipnResponse.ipnId = data.ipn_id;
    ipnResponse.ipnMode = data.ipn_mode;
    ipnResponse.ipnType = data.ipn_type;
    ipnResponse.ipnVersion = data.ipn_version;
    ipnResponse.itemName = data.item_name;
    ipnResponse.itemNumber = data.item_number;
    ipnResponse.merchant = data.merchant;
    ipnResponse.net = data.net;
    ipnResponse.receivedAmount = data.received_amount;
    ipnResponse.receivedConfirms = data.received_amount;
    ipnResponse.statusText = data.status_text;
    ipnResponse.status = data.status;
    ipnResponse.timestamp = data.timestamp;
    ipnResponse.txnId = data.txn_id;

    return ipnResponse;
  }
}
