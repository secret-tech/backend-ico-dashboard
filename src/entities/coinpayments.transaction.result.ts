import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { Verification, EMAIL_VERIFICATION } from './verification';
import { Wallet } from './wallet';
import 'reflect-metadata';
import { Invitee } from './invitee';
import { InviteIsNotAllowed } from '../exceptions/exceptions';
import { Index } from 'typeorm/decorator/Index';
import { base64encode } from '../helpers/helpers';

@Entity()
export class CoinpaymentsTransactionResult {
  @ObjectIdColumn() id: ObjectID;

  @Column() email: string;

  @Column() amount: string;

  @Column() txnId: string;

  @Column() address: string;

  @Column() confirmsNeeded: string;

  @Column() timeout: number;

  @Column() statusUrl: string;

  @Column() qrcodeUrl: string;

  @Column() currency1: string;

  @Column() currency2: string;

  static createCoinpaymentsTransactionResult(
    data: any
  ): CoinpaymentsTransactionResult {
    const result = new CoinpaymentsTransactionResult();

    result.address = data.address;
    result.amount = data.amount;
    result.confirmsNeeded = data.confirms_needed;
    result.currency1 = data.currency1;
    result.currency2 = data.currency2;
    result.email = data.email;
    result.qrcodeUrl = data.qrcode_url;
    result.statusUrl = data.status_url;
    result.timeout = data.timeout;
    result.txnId = data.txn_id;

    return result;
  }
}
