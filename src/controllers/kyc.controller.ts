import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import { AuthorizedRequest } from '../requests/authorized.request';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import config from '../config';
import { KycProviderType } from '../types';

/**
 * KYC controller
 */
@injectable()
@controller(
  '/kyc'
)
export class KycController {
  constructor(
    @inject(Web3ClientType) private web3Client: Web3ClientInterface,
    @inject(KycProviderType) private kycProvider: KycProviderInterface
  ) { }

  @httpGet(
    '/init',
    'AuthMiddleware',
    'OnlyAcceptApplicationJson'
  )
  async init(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.kycProvider.getInitStatus(req, res, next);
  }

  // route to redirect customer on success document upload to update status to pending
  @httpGet(
    '/uploaded/:id/:base64hash',
    'OnlyAcceptApplicationJson'
  )
  async successUpload(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.kycProvider.successUpload(req, res, next);
  }

  @httpPost(
    '/callback'
  )
  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    await this.kycProvider.callback(req, res, next);
  }

  @httpGet(
    '/reinit',
    'AuthMiddleware',
    'OnlyAcceptApplicationJson'
  )
  async reinit(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.kycProvider.reinit(req, res, next);
  }
}
