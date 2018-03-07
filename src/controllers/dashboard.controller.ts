import { Request, Response, NextFunction } from 'express';
import { VerificationClientType } from '../services/verify.client';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import 'reflect-metadata';
import { AuthorizedRequest } from '../requests/authorized.request';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import config from '../config';
import { TransactionServiceInterface, TransactionServiceType } from '../services/transaction.service';
import initiateBuyTemplate from '../emails/12_initiate_buy_jcr_code';
import { IncorrectMnemonic, InsufficientEthBalance } from '../exceptions/exceptions';
import { transformReqBodyToInvestInput } from '../transformers/transformers';
import { Investor } from '../entities/investor';
import { getConnection } from 'typeorm';
import { CoinpaymentsClientType, CoinPayments } from '../services/coinpayments/coinpayments.client';
import { CoinpaymentsTransactionResult } from '../entities/coinpayments.transaction.result';
import { PaymentsServiceType } from '../services/payments.service';
import { IPNService, IPNServiceType } from '../services/ipn.service';

const TRANSACTION_STATUS_PENDING = 'pending';

const TRANSACTION_TYPE_TOKEN_PURCHASE = 'token_purchase';
const ICO_END_TIMESTAMP = 1517443200; // Thursday, February 1, 2018 12:00:00 AM
const IPN_RESPONSE_STATUS_COMPLETE = 100;
const IPN_RESPONSE_STATUS_QUEUED_PAYOUT = 2;

export const INVEST_SCOPE = 'invest';

const cpMiddleware = CoinPayments.ipn({
  merchantId: config.coinPayments.merchantId,
  merchantSecret: 'ipnsecret'
});

/**
 * Dashboard controller
 */
@injectable()
@controller(
  '/dashboard'
)
export class DashboardController {
  constructor(
    @inject(VerificationClientType) private verificationClient: VerificationClientInterface,
    @inject(Web3ClientType) private web3Client: Web3ClientInterface,
    @inject(TransactionServiceType) private transactionService: TransactionServiceInterface,
    @inject(CoinpaymentsClientType) private coinpaimentsClient: CoinpaymentsClientInterface,
    @inject(PaymentsServiceType) private paymentsService: PaymentsServiceInterface,
    @inject(IPNServiceType) private ipnService: IPNServiceInterface
  ) { }

  /**
   * Get main dashboard data
   */
  @httpGet(
    '/',
    'AuthMiddleware'
  )
  async dashboard(req: AuthorizedRequest, res: Response): Promise<void> {
    const currentJcrEthPrice = await this.web3Client.getJcrEthPrice();
    const ethCollected = await this.web3Client.getEthCollected();

    res.json({
      ethBalance: await this.web3Client.getEthBalance(req.user.ethWallet.address),
      jcrTokensSold: await this.web3Client.getSoldIcoTokens(),
      jcrTokenBalance: await this.web3Client.getJcrBalanceOf(req.user.ethWallet.address),
      jcrTokenPrice: {
        ETH: (1 / Number(currentJcrEthPrice)).toString(),
        USD: '1'
      },
      raised: {
        ETH: ethCollected,
        USD: (Number(ethCollected) * currentJcrEthPrice).toString(),
        BTC: '0'
      },
      // calculate days left and add 1 as Math.floor always rounds to less value
      daysLeft: Math.floor((ICO_END_TIMESTAMP - Math.floor(Date.now() / 1000)) / (3600 * 24)) + 1
    });
  }

  @httpGet(
    '/public'
  )
  async publicData(req: Request, res: Response): Promise<void> {
    const ethCollected = await this.web3Client.getEthCollected();
    const contributionsCount = await this.web3Client.getContributionsCount();

    res.json({
      jcrTokensSold: await this.web3Client.getSoldIcoTokens(),
      ethCollected,
      contributionsCount,
      // calculate days left and add 1 as Math.floor always rounds to less value
      daysLeft: Math.floor((ICO_END_TIMESTAMP - Math.floor(Date.now() / 1000)) / (3600 * 24)) + 1
    });
  }

  @httpGet(
    '/investTxFee'
  )
  async getCurrentInvestFee(req: Request, res: Response): Promise<void> {
    res.json(await this.web3Client.investmentFee());
  }

  /**
   * Get referral data
   */
  @httpGet(
    '/referral',
    'AuthMiddleware'
  )
  async referral(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    res.json(await this.transactionService.getReferralIncome(req.user));
  }

  /**
   * Get transaction history
   */
  @httpGet(
    '/transactions',
    'AuthMiddleware'
  )
  async transactionHistory(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    res.json(await this.transactionService.getTransactionsOfUser(req.user));
  }

  @httpPost(
    '/invest/initiate',
    'AuthMiddleware',
    'InvestValidation'
  )
  async investInitiate(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    const account = this.web3Client.getAccountByMnemonicAndSalt(req.body.mnemonic, req.user.ethWallet.salt);
    if (account.address !== req.user.ethWallet.address) {
      throw new IncorrectMnemonic('Not correct mnemonic phrase');
    }

    if (!req.body.gasPrice) {
      req.body.gasPrice = await this.web3Client.getCurrentGasPrice();
    }
    const txInput = transformReqBodyToInvestInput(req.body, req.user);

    if (!(await this.web3Client.sufficientBalance(txInput))) {
      throw new InsufficientEthBalance('Insufficient funds to perform this operation and pay tx fee');
    }

    if (req.user.referral) {
      const referral = await getConnection().mongoManager.findOne(Investor, {
        email: req.user.referral
      });

      const addressFromWhiteList = await this.web3Client.getReferralOf(req.user.ethWallet.address);
      if (addressFromWhiteList.toLowerCase() !== referral.ethWallet.address.toLowerCase()) {
        throw Error('Error. Please try again in few minutes. Contact Jincor Team if you continue to receive this');
      }
    }

    if (!(await this.web3Client.isAllowed(req.user.ethWallet.address))) {
      throw Error('Error. Please try again in few minutes. Contact Jincor Team if you continue to receive this');
    }

    const verificationResult = await this.verificationClient.initiateVerification(
      req.user.defaultVerificationMethod,
      {
        consumer: req.user.email,
        issuer: 'Jincor',
        template: {
          fromEmail: config.email.from.general,
          subject: 'You Purchase Validation Code to Use at Jincor.com',
          body: initiateBuyTemplate(req.user.name)
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '01:00:00'
        },
        payload: {
          scope: INVEST_SCOPE,
          ethAmount: req.body.ethAmount.toString()
        }
      }
    );

    res.json({
      verification: verificationResult
    });
  }

  @httpPost(
    '/invest/verify',
    'AuthMiddleware',
    'InvestValidation',
    'VerificationRequiredValidation'
  )
  async investVerify(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    const account = this.web3Client.getAccountByMnemonicAndSalt(req.body.mnemonic, req.user.ethWallet.salt);
    if (account.address !== req.user.ethWallet.address) {
      throw new IncorrectMnemonic('Not correct mnemonic phrase');
    }

    if (req.user.referral) {
      const referral = await getConnection().mongoManager.findOne(Investor, {
        email: req.user.referral
      });

      const addressFromWhiteList = await this.web3Client.getReferralOf(req.user.ethWallet.address);
      if (addressFromWhiteList.toLowerCase() !== referral.ethWallet.address.toLowerCase()) {
        throw Error('Error. Please try again in few minutes. Contact Jincor Team if you continue to receive this');
      }
    }

    if (!(await this.web3Client.isAllowed(req.user.ethWallet.address))) {
      throw Error('Error. Please try again in few minutes. Contact Jincor Team if you continue to receive this');
    }

    const payload = {
      scope: INVEST_SCOPE,
      ethAmount: req.body.ethAmount.toString()
    };

    await this.verificationClient.checkVerificationPayloadAndCode(req.body.verification, req.user.email, payload);

    if (!req.body.gasPrice) {
      req.body.gasPrice = await this.web3Client.getCurrentGasPrice();
    }
    const txInput = transformReqBodyToInvestInput(req.body, req.user);

    const transactionHash = await this.web3Client.sendTransactionByMnemonic(
      txInput,
      req.body.mnemonic,
      req.user.ethWallet.salt
    );

    res.json({
      transactionHash,
      status: TRANSACTION_STATUS_PENDING,
      type: TRANSACTION_TYPE_TOKEN_PURCHASE
    });
  }

  @httpGet(
    '/currencies'
  )
  async currencies(req: Request, res: Response): Promise<void> {
    res.json(await this.coinpaimentsClient.rates());
  }

  @httpPost(
    '/createTransaction',
    'AuthMiddleware'
  )
  async createTransaction(req: AuthorizedRequest, res: Response): Promise<void> {
    try {
      const tx = await this.paymentsService.initiateBuyEths(
        req.user,
        req.body.amount,
        config.coinPayments.currency1,
        req.body.currency
      );

      res.json(tx.buyCoinpaymentsData);
    } catch (error) {
      res.json(error);
    }
  }

  @httpPost(
    '/ipn',
    (req, res, next) => cpMiddleware(req, {end: () => {}}, next)
  )
  async ipn(req: Request, res: Response, next): Promise<void> {
    console.log('debug:...');
    console.log(req.body);
    try {
      if (req.body.status >= IPN_RESPONSE_STATUS_COMPLETE || req.body.status === IPN_RESPONSE_STATUS_QUEUED_PAYOUT) {
        // complete
        console.log(await this.ipnService.processComplete(req.body));
      } else if (req.body.status < 0) {
        // fail
        console.log(await this.ipnService.processFail(req.body));
      } else {
        // pending
        console.log(await this.ipnService.processPending(req.body));
      }

      res.end('IPN OK');
    } catch (error) {
      res.end('IPN Error: ' + error);
    }
  }
}
