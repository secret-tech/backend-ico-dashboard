import { Response, Request, NextFunction } from 'express';
import { VerificationClientType } from '../services/verify.client';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import 'reflect-metadata';
import { AuthorizedRequest } from '../requests/authorized.request';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import config from '../config';

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
    @inject(Web3ClientType) private web3Client: Web3ClientInterface
  ) { }

  /**
   * Create user
   *
   * @param  req  express req object
   * @param  res  express res object
   */
  @httpGet(
    '/',
    'AuthMiddleware'
  )
  async dashboard(req: AuthorizedRequest, res: Response): Promise<void> {
    res.json({
      ethBalance: await this.web3Client.getEthBalance(req.user.ethWallet.address),
      jcrTokensSold: await this.web3Client.getSoldIcoTokens(),
      jcrTokenBalance: await this.web3Client.getJcrBalanceOf(req.user.ethWallet.address),
      jcrTokenPrice: {
        ETH: '0.005',
        USD: '1'
      },
      raised: {
        ETH: '2000',
        USD: '1000000',
        BTC: '100'
      },
      daysLeft: 10
    });
  }

  /**
   * Login user and respond with token
   *
   * @param  req  express req object
   * @param  res  express res object
   * @param  next express next middleware function
   */
  @httpGet(
    '/referral',
    'AuthMiddleware'
  )
  async referral(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    res.json({
      data: 'dGVzdEB0ZXN0LmNvbQ',
      users: [
        {
          date: 1508241475,
          name: 'Investor 1',
          walletAddress: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
          tokens: '105'
        },
        {
          date: 1508241475,
          name: 'Investor 2',
          walletAddress: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eB',
          tokens: '1.01'
        }
      ]
    });
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
          body: 'To confirm investment enter this code: {{{CODE}}}'
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
      gas: 220000,
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
