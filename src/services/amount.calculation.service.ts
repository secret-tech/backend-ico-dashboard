import { injectable, inject } from 'inversify';
import config from '../config';
import { Web3ClientInterface, Web3ClientType } from './web3.client';
import { FeeCalculationInterface, FeeCalculationType } from './coinpayments/coinpayments.fee.service';

export interface AmountCalculationInterface {
  calculateFromTokensAmount(
    priceProvider: TokenPriceProviderInterface,
    tokensAmount: number,
    payInCurrency: string,
    displayInCurrency: string
  ): Promise<number>;

  calculateFromPayInCurrency(
    priceProvider: TokenPriceProviderInterface,
    payAmount: number,
    payInCurrency: string,
    tokensMultiplicator?: number
  ): Promise<number>;
}

/**
 * Amount calculator service. Provide methods to calculate
 * amount of currency to purchase some amount of tokens or vice versa.
 */
@injectable()
export class AmountCalculationService implements AmountCalculationInterface {
  private priceInfoContract: any;

  constructor(
    @inject(Web3ClientType) private web3client: Web3ClientInterface,
    @inject(FeeCalculationType) private feeCalc: FeeCalculationInterface
  ) {
  }

  /**
   * Calculate the price based on need tokens amount.
   *
   * @param tokensAmount
   * @param payInCurrency
   * @param displayInCurrency
   */
  async calculateFromTokensAmount(
    priceProvider: TokenPriceProviderInterface,
    tokensAmount: number,
    payInCurrency: string,
    displayInCurrency: string
  ): Promise<number> {

    const [priceForPurchaseMethod, tokensPriceInEth] = await Promise.all([
      priceProvider.getForTokenPurchaseMethodInEthers(this.web3client),
      priceProvider.getForTokensAmountInEthers(this.web3client, tokensAmount)
    ]);

    return await this.feeCalc.calculateWithAccountOfAllFee(
      'ETH',
      priceForPurchaseMethod + tokensPriceInEth,
      payInCurrency,
      displayInCurrency
    );
  }

  /**
   * Calculate tokens amount by specified price in selected currency.
   *
   * @param payAmount
   * @param payInCurrency
   * @param tokensMultiplicator Need to prevent precision problem
   */
  async calculateFromPayInCurrency(
    priceProvider: TokenPriceProviderInterface,
    payAmount: number,
    payInCurrency: string,
    tokensMultiplicator?: number
  ): Promise<number> {
    tokensMultiplicator = tokensMultiplicator || 100000;

    const ethValues = await this.feeCalc.calculateWithAllFee(
      payInCurrency,
      payAmount,
      'ETH',
      'ETH'
    );

    const [priceForPurchaseMethod, ethersPerTokens] = await Promise.all([
      priceProvider.getForTokenPurchaseMethodInEthers(this.web3client),
      priceProvider.getForTokensAmountInEthers(this.web3client, tokensMultiplicator)
    ]);

    return (ethValues - priceForPurchaseMethod) / ethersPerTokens * tokensMultiplicator;
  }
}

const TokensCalculationType = Symbol('TokensCalculationInterface');
export { TokensCalculationType };

/**
 * Token price provider. Provide concrete price for amount of tokens or tx method.
 */
export interface TokenPriceProviderInterface {
  /**
   * @param web3client
   */
  getForTokenPurchaseMethodInEthers(web3client: Web3ClientInterface): Promise<number>;

  /**
   * @param web3client
   * @param tokensAmount
   */
  getForTokensAmountInEthers(web3client: Web3ClientInterface, tokensAmount: number): Promise<number>;
}

/**
 * Default implemetation for current ico contract.
 */
export class DefaultJcrTokenPriceProvider implements TokenPriceProviderInterface {
  constructor(private txGasLimit?: number) {
  }

  async getForTokenPurchaseMethodInEthers(web3client: Web3ClientInterface): Promise<number> {
    return +(await web3client.getCurrentGasPrice()) * (this.txGasLimit || config.web3.purchaseGasLimit);
  }

  async getForTokensAmountInEthers(web3client: Web3ClientInterface, tokensAmount: number): Promise<number> {
    // its like web3client.getJcrEthPrice()
    const [ethUsdRate, jcrUsdRate] = await Promise.all([
      web3client.queryIcoMethod('ethUsdRate'),
      web3client.queryIcoMethod('jcrUsdRate')
    ]);

    // Original: tokens = ethValue * ethUsdRate / jcrUsdRate
    // Will be: ethValue = tokensAmount * jcrUsdRate() / ethUsdRate()
    return tokensAmount * jcrUsdRate / ethUsdRate;
  }
}

/**
 * Fixed values implemetation.
 */
export class FixedTokenPriceProvider implements TokenPriceProviderInterface {
  constructor(
    private gasPrice: number,
    private txGasLimit: number,
    private tokenEthRate: number
  ) {
  }

  async getForTokenPurchaseMethodInEthers(web3client: Web3ClientInterface): Promise<number> {
    return this.gasPrice * this.txGasLimit;
  }

  async getForTokensAmountInEthers(web3client: Web3ClientInterface, tokensAmount: number): Promise<number> {
    return tokensAmount * this.tokenEthRate;
  }
}
