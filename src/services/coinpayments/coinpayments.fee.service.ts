import { toBN, BN } from 'web3-utils';
import { injectable, inject } from 'inversify';
import config from '../../config';
import { CoinpaymentsClientType } from './coinpayments.client';

export interface FeeCalculationInterface {
  calculateWithAccountOfAllFee(
    destinationCurrency: string,
    amountInDestinationCurrency: number,
    payInCurrency: string,
    displayInCurrency: string
  ): Promise<number>;

  calculateWithAllFee(
    payInCurrency: string,
    amountInPaymentCurrency: number,
    destinationCurrency: string,
    displayInCurrency: string
  ): Promise<number>;
}

function isZeroRate(exchangeValue: any): boolean {
  return !exchangeValue || !exchangeValue.rate_btc || /^[0.]+$/.test(exchangeValue.rate_btc);
}

const RATES_CACHE_TIMEOUT = 5 * 60 * 1000;

class ZeroRateError extends Error { }
class CurrencyNotConvertableError extends Error { }

/**
 * Service to calculate approximate amount of value in specified currency.
 */
@injectable()
export class CoinpaymentsFeeService implements FeeCalculationInterface {
  private exchangeRates: {
    data: any;
    updateAt: number;
  } = { data: {}, updateAt: 0 };

  constructor(
    @inject(CoinpaymentsClientType) private cpClient: CoinpaymentsClientInterface
  ) {
  }

  async getExchangeRates() {
    if (this.exchangeRates.updateAt < +new Date()) {
      this.exchangeRates.data = await this.cpClient.rates();
      this.exchangeRates.updateAt = +new Date() + RATES_CACHE_TIMEOUT;
    }
    return this.exchangeRates.data;
  }

  /**
   * Calculate conversion value as close as possible with fee accounting.
   * Examples:
   * 1) if you need receive 100 USD, with fee transaction 1% ~ should transfer 101.010101 USD.
   * 2) if you need get ~1 eth, with fee transaction 0.001, and conversion rate from btc 0.0859106375
   * should pay 0.08599663413413414 BTC.
   *
   * @param displayInCurrency
   * @param payInCurrency
   * @param amountInDestinationCurrency
   * @param destinationCurrency
   */
  async calculateWithAccountOfAllFee(
    destinationCurrency: string,
    amountInDestinationCurrency: number,
    payInCurrency: string,
    displayInCurrency: string
  ): Promise<number> {
    const exchangeRates = await this.getExchangeRates();

    if (isZeroRate(exchangeRates[displayInCurrency])) {
      throw new ZeroRateError();
    }

    if (isZeroRate(exchangeRates[payInCurrency])) {
      throw new ZeroRateError();
    }

    if (!exchangeRates[payInCurrency].can_convert) {
      throw new CurrencyNotConvertableError();
    }

    if (isZeroRate(exchangeRates[destinationCurrency])) {
      throw new ZeroRateError();
    }

    let result = amountInDestinationCurrency;

    // if need conversion, we need to calculate approximated conversion fee
    if (destinationCurrency !== payInCurrency) {
      // Conversions coin TX fee + conversion partner's fees (if any)
      result = result
        * exchangeRates[destinationCurrency].rate_btc
        / exchangeRates[payInCurrency].rate_btc
        / (1.0 - exchangeRates[payInCurrency].tx_fee);
      // also need to account conversion partner's fees (if any), but it's probably impossible
    }

    result = result
      / (1.0 - config.coinPayments.incomingPaymentsFee)
      / (1.0 - exchangeRates[payInCurrency].tx_fee)
      * (exchangeRates[payInCurrency].rate_btc)
      / (exchangeRates[displayInCurrency].rate_btc);

    return result;
  }

  /**
   * Calculate conversion value as close as possible with fee accounting.
   *
   * @param payInCurrency
   * @param amountInPaymentCurrency
   * @param destinationCurrency
   * @param displayInCurrency
   */
  async calculateWithAllFee(
    payInCurrency: string,
    amountInPaymentCurrency: number,
    destinationCurrency: string,
    displayInCurrency: string
  ): Promise<number> {
    const exchangeRates = await this.getExchangeRates();

    if (isZeroRate(exchangeRates[displayInCurrency])) {
      throw new ZeroRateError();
    }

    if (isZeroRate(exchangeRates[payInCurrency])) {
      throw new ZeroRateError();
    }

    if (!exchangeRates[payInCurrency].can_convert) {
      throw new CurrencyNotConvertableError();
    }

    if (isZeroRate(exchangeRates[destinationCurrency])) {
      throw new ZeroRateError();
    }

    let result = amountInPaymentCurrency
      * (1.0 - config.coinPayments.incomingPaymentsFee)
      * (1.0 - exchangeRates[payInCurrency].tx_fee)
      * (exchangeRates[displayInCurrency].rate_btc)
      / (exchangeRates[payInCurrency].rate_btc);

    // if need conversion, we need to calculate approximated conversion fee
    if (destinationCurrency !== payInCurrency) {
      // Conversions coin TX fee + conversion partner's fees (if any)
      result = result
        * exchangeRates[payInCurrency].rate_btc
        / exchangeRates[destinationCurrency].rate_btc
        * (1.0 - exchangeRates[payInCurrency].tx_fee);
      // also need to account conversion partner's fees (if any), but it's probably impossible
    }

    return result;
  }
}

const FeeCalculationType = Symbol('FeeCalculationInterface');
export { FeeCalculationType };
