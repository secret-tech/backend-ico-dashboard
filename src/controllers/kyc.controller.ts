import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import { AuthorizedRequest } from '../requests/authorized.request';
import { KycClientType } from '../services/kyc.client';
import {
  JUMIO_SCAN_STATUS_ERROR,
  JUMIO_SCAN_STATUS_SUCCESS,
} from '../entities/kyc.result';
import { getConnection } from 'typeorm';
import {
  Investor,
  KYC_STATUS_FAILED,
  KYC_STATUS_VERIFIED
} from '../entities/investor';
import { KycAlreadyVerifiedError, KycFailedError } from '../exceptions/exceptions';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import { KycResultRepository } from '../repositories/kyc.result.repository';

/**
 * KYC controller
 */
@injectable()
@controller(
  '/kyc'
)
export class KycController {
  constructor(
    @inject(KycClientType) private kycClient: KycClientInterface,
    @inject(Web3ClientType) private web3Client: Web3ClientInterface
  ) { }

  @httpGet(
    '/init',
    'AuthMiddleware'
  )
  async init(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    switch (req.user.kycStatus) {
      case KYC_STATUS_VERIFIED:
        throw new KycAlreadyVerifiedError('Your account is verified already');
      case KYC_STATUS_FAILED:
        throw new KycFailedError('Your account verification failed. Please contact Jincor team');
      default:
        res.json(req.user.kycInitResult);
    }
  }

  @httpPost(
    '/callback',
    'OnlyJumioIp'
  )
  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    const kycRepo = getConnection().getCustomRepository(KycResultRepository);
    const investorRepo = getConnection().getMongoRepository(Investor);

    // express req.body does not inherit from standard JS object so we need this ugly workaround to make typeorm work.
    // without it we get 'object.hasOwnProperty is not a function' because typeorm using it to create entity
    // for more info check: https://github.com/expressjs/express/issues/3264
    const verificationResult = JSON.parse(JSON.stringify(req.body));

    const existingVerification = await kycRepo.findOne({
      jumioIdScanReference: verificationResult.jumioIdScanReference
    });

    if (existingVerification) {
      // the verification was already processed
      res.status(200).send();
      return;
    }

    await kycRepo.save(kycRepo.create(verificationResult));

    const investor = await investorRepo.findOne({
      email: verificationResult.customerId
    });

    if (!investor || investor.kycStatus === KYC_STATUS_VERIFIED || investor.kycStatus === KYC_STATUS_FAILED) {
      // no such user/already verified/max attempts reached
      // respond with 200 as I expect that Jumio may try to resend notification in case of failure
      res.status(200).send();
      return;
    }

    switch (verificationResult.idScanStatus) {
      case JUMIO_SCAN_STATUS_SUCCESS:
        investor.kycStatus = KYC_STATUS_VERIFIED;
        await this.web3Client.addAddressToWhiteList(investor.ethWallet.address);
        break;
      case JUMIO_SCAN_STATUS_ERROR:
        investor.kycStatus = KYC_STATUS_FAILED;
        break;
      default:
        // something strange is going on, throw
        throw Error('Unknown ID scan status');
    }

    await investorRepo.save(investor);
    res.status(200).send();
  }
}
