import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import { AuthorizedRequest } from '../requests/authorized.request';
import { KycClientType } from '../services/kyc.client';
import {
  JUMIO_SCAN_STATUS_ERROR, JUMIO_SCAN_STATUS_SUCCESS, KycResult,
  MAX_VERIFICATION_ATTEMPTS, VERIFICATION_STATUS_NO_ID_UPLOADED
} from '../entities/kyc.result';
import { getConnection, getMongoManager } from 'typeorm';
import {
  Investor, KYC_STATUS_FAILED, KYC_STATUS_MAX_ATTEMPTS_REACHED, KYC_STATUS_PENDING,
  KYC_STATUS_VERIFIED
} from '../entities/investor';
import {KycAlreadyVerifiedError, KycMaxAttemptsReached, KycPending} from '../exceptions/exceptions';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import { KycResultRepository } from "../repositories/kyc.result.repository";

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
    if (req.user.kycStatus === KYC_STATUS_VERIFIED) {
      throw new KycAlreadyVerifiedError('Your account is verified already');
    }

    if (req.user.kycStatus === KYC_STATUS_PENDING) {
      throw new KycPending('You documents are processing already, please wait for status update');
    }

    const verificationsCount = await getConnection()
                                      .getCustomRepository(KycResultRepository)
                                      .getFailedVerificationsCountByInvestor(req.user);

    if (verificationsCount >= MAX_VERIFICATION_ATTEMPTS) {
      throw new KycMaxAttemptsReached('You have tried to pass ID verification at least 3 times. Please contact Jincor team.');
    }

    res.json(await this.kycClient.init(req.user));
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

    const investor = await investorRepo.findOne({
      email: verificationResult.customerId
    });

    if (!investor || investor.kycStatus === KYC_STATUS_VERIFIED || investor.kycStatus === KYC_STATUS_MAX_ATTEMPTS_REACHED) {
      // no such user/already verified/max attempts reached
      // respond with 200 as I expect that Jumio may try to resend notification in case of failure
      res.status(200).send();
      return;
    }

    const existingVerification = await kycRepo.findOne({
      jumioIdScanReference: verificationResult.jumioIdScanReference
    });

    if (existingVerification) {
      // the verification was already processed
      res.status(200).send();
      return;
    }

    switch (verificationResult.idScanStatus) {
      case JUMIO_SCAN_STATUS_SUCCESS:
        investor.kycStatus = KYC_STATUS_VERIFIED;
        await this.web3Client.addAddressToWhiteList(investor.ethWallet.address);
        break;
      case JUMIO_SCAN_STATUS_ERROR:
        if (verificationResult.verificationStatus !== VERIFICATION_STATUS_NO_ID_UPLOADED) {
          const verificationsCount = await kycRepo.getFailedVerificationsCountByInvestor(investor);

          if (verificationsCount + 1 >= MAX_VERIFICATION_ATTEMPTS) {
            investor.kycStatus = KYC_STATUS_MAX_ATTEMPTS_REACHED;
          } else {
            investor.kycStatus = KYC_STATUS_FAILED;
          }
        }
        break;
      default:
        // something strange is going on, throw
        throw Error('Unknown ID scan status');
    }

    await investorRepo.save(investor);
    await kycRepo.save(kycRepo.create(verificationResult));

    res.status(200).send();
  }
}
