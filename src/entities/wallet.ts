import { Column } from 'typeorm';
import 'reflect-metadata';

export class Wallet {
  @Column()
  ticker: string;

  @Column()
  address: string;

  @Column()
  balance: string;

  @Column()
  salt: string;

  @Column()
  mnemonic: string;

  static createWallet(data: any) {
    const wallet = new Wallet();
    wallet.ticker = data.ticker;
    wallet.address = data.address;
    wallet.balance = data.balance;
    wallet.salt = data.salt;
    wallet.mnemonic = data.mnemonic;
    return wallet;
  }
}
