import { injectable, inject } from 'inversify';
import { CoinpaymentsTransactionResult } from '../../entities/coinpayments.transaction.result';
import config from '../../config';

export const CoinPayments = require('coinpayments');
const { promisify } = require('util');

const rates = promisify(CoinPayments.prototype.rates);
const createTransaction = promisify(CoinPayments.prototype.createTransaction);
const convertCoins = promisify(CoinPayments.prototype.convertCoins);
const getTx = promisify(CoinPayments.prototype.getTx);
const getTxMulti = promisify(CoinPayments.prototype.getTxMulti);

@injectable()
export class CoinpaymentsClient implements CoinpaymentsClientInterface {
  private cpClient: any;
  private currency1: string;

  constructor() {
    const cpOptions = {
      key: config.coinPayments.key,
      secret: config.coinPayments.secret
    };
    this.cpClient = new CoinPayments(cpOptions);
    this.currency1 = config.coinPayments.currency1;
  }

  async createTransaction(
    transactionData: CoinpaymentsTransactionData
  ): Promise<CoinpaymentsTransactionResult> {
    const data = {
      currency1: this.currency1,
      currency2: transactionData.currency,
      amount: transactionData.amount
    };

    const transactionResult = Object.assign(
      {},
      await createTransaction.call(this.cpClient, data),
      data
    );

    // const transactionResult = { ...await createTransaction.call(this.cpClient, data), ...data };

    return CoinpaymentsTransactionResult.createCoinpaymentsTransactionResult(
      transactionResult
    );
  }

  async convertCoinsTransaction(transactionData: any): Promise<any> {
    const data = {
      amount: transactionData.amount,
      from: transactionData.from,
      to: transactionData.to,
      address: transactionData.address
    };

    const transactionResult = Object.assign(
      {},
      await convertCoins.call(this.cpClient, data),
      data
    );

    return transactionResult;
  }

  currencies() {
    return rates.call(this.cpClient);
  }

  rates(options) {
    return rates.call(this.cpClient, options);
  }

  getTransactionInfo(txId: string) {
    return getTx.call(this.cpClient, txId);
  }

  getTransactionMulti(txIds: string[]) {
    return getTxMulti.call(this.cpClient, txIds);
  }
}

const CoinpaymentsClientType = Symbol('CoinpaymentsClientInterface');
export { CoinpaymentsClientType };
