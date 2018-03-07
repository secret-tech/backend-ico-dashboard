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

export interface ConversionOptions {
  amount: string|number;
  from: string;
  to: string;
  address?: string;
}

export interface ConversionResult {
  id: string;
}

export interface ExchangeRateOptions {
  short?: number;
  accepted?: number;
}

@injectable()
export class CoinpaymentsClient implements CoinpaymentsClientInterface {
  private cpClient: any;
  private currency1: string;

  constructor() {
    this.cpClient = new CoinPayments({
      key: config.coinPayments.key,
      secret: config.coinPayments.secret
    });
    this.currency1 = config.coinPayments.currency1;
  }

  async createTransaction(
    transactionData: CoinpaymentsTransactionData
  ): Promise<CoinpaymentsTransactionResult> {
    const data = {
      currency1: this.currency1,
      currency2: transactionData.currency,
      amount: transactionData.amount,
      buyer_email: transactionData.buyer_email,
      email: transactionData.buyer_email
    };

    const transactionResult = {...await createTransaction.call(this.cpClient, data), ...data};

    return CoinpaymentsTransactionResult.createCoinpaymentsTransactionResult(
      transactionResult
    );
  }

  async convertCoinsTransaction(conversionOptions: ConversionOptions): Promise<ConversionResult> {
    const options = {
      amount: conversionOptions.amount,
      from: conversionOptions.from,
      to: conversionOptions.to,
      address: conversionOptions.address
    };

    const transactionResult = {...await convertCoins.call(this.cpClient, options), ...options};
    return transactionResult;
  }

  async rates(options?: ExchangeRateOptions): Promise<ExchangeRateInterface> {
    if (options) {
      return rates.call(this.cpClient, options);
    } else {
      return rates.call(this.cpClient);
    }
  }

  async getTransactionInfo(txId: string): Promise<CoinpaymentsTransactionInfo> {
    return getTx.call(this.cpClient, txId);
  }

  async getTransactionMulti(txIds: string[]): Promise<{ [txId: string]: CoinpaymentsTransactionInfo }> {
    return getTxMulti.call(this.cpClient, txIds);
  }
}

const CoinpaymentsClientType = Symbol('CoinpaymentsClientInterface');
export { CoinpaymentsClientType };
