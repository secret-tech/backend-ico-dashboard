import { Response, Request, NextFunction } from 'express';
import { VerificationClientType, VerificationClientInterface } from '../services/verify.client';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import 'reflect-metadata';
import {AuthorizedRequest} from "../requests/authorized.request";

/**
 * UserController
 */
@injectable()
@controller(
  '/dashboard'
)
export class DashboardController {
  constructor(@inject(VerificationClientType) private verificationClient: VerificationClientInterface) { }

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
      ethBalance: '1.0001',
      jcrTokensSold: '5000',
      jcrTokenPrice: {
        ETH: '0.005',
        USD: '1'
      },
      raised: {
        ETH: '2000',
        USD: '1000000',
        BTC: '100',
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
          tokens: '105',
        },
        {
          date: 1508241475,
          name: 'Investor 2',
          walletAddress: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eB',
          tokens: '1.01',
        }
      ]
    });
  }
}
