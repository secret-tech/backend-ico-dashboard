import { Response, NextFunction } from 'express';
import { VerificationClientType } from '../services/verify.client';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import 'reflect-metadata';
import { AuthorizedRequest } from '../requests/authorized.request';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import config from '../config';
import { TransactionServiceInterface, TransactionServiceType } from '../services/transaction.service';
import initiateBuyTemplate from '../emails/12_initiate_buy_jcr_code';

const TRANSACTION_STATUS_PENDING = 'pending';

const TRANSACTION_TYPE_TOKEN_PURCHASE = 'token_purchase';

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
    @inject(TransactionServiceType) private transactionService: TransactionServiceInterface
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
        BTC: '100'
      },
      daysLeft: 10
    });
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
          expiredOn: '00:05:00'
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
    await this.verificationClient.validateVerification(
      req.body.verification.method,
      req.body.verification.verificationId,
      {
        code: req.body.verification.code
      }
    );

    const transactionInput = {
      from: req.user.ethWallet.address,
      to: config.contracts.ico.address,
      amount: req.body.ethAmount
    };

    const transactionHash = await this.web3Client.sendTransactionByMnemonic(
      transactionInput,
      req.body.mnemonic,
      req.user.ethWallet.salt
    );

    res.json({
      transactionHash,
      status: TRANSACTION_STATUS_PENDING,
      type: TRANSACTION_TYPE_TOKEN_PURCHASE
    });
  }
}
