import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import { AuthorizedRequest } from '../requests/authorized.request';
import {
  JUMIO_SCAN_STATUS_ERROR,
  JUMIO_SCAN_STATUS_SUCCESS,
  KycResult
} from '../entities/kyc.result';
import { getConnection } from 'typeorm';
import {
  Investor,
  KYC_STATUS_FAILED, KYC_STATUS_NOT_VERIFIED, KYC_STATUS_PENDING,
  KYC_STATUS_VERIFIED
} from '../entities/investor';
import { KycAlreadyVerifiedError, KycFailedError, KycPendingError } from '../exceptions/exceptions';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import { base64decode } from '../helpers/helpers';
import config from '../config';
import * as bcrypt from 'bcrypt-nodejs';
const mongo = require('mongodb');

/**
 * KYC controller
 */
@injectable()
@controller(
  '/kyc'
)
export class KycController {
  constructor(
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
      case KYC_STATUS_PENDING:
        throw new KycPendingError('Your account verification is pending. Please wait for status update');
      default:
        res.json(req.user.kycInitResult);
    }
  }

  // route to redirect customer on success document upload to update status to pending
  @httpGet(
    '/uploaded/:id/:base64hash'
  )
  async successUpload(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    const decodedHash = base64decode(req.params.base64hash);

    if (bcrypt.compareSync(req.params.id + config.kyc.apiSecret, decodedHash)) {
      const investorRepo = getConnection().getMongoRepository(Investor);
      const investor = await investorRepo.createEntityCursor({
        _id: new mongo.ObjectId(req.params.id)
      }).toArray();

      if (investor.length > 0 && investor[0].kycStatus === KYC_STATUS_NOT_VERIFIED) {
        investor[0].kycStatus = KYC_STATUS_PENDING;
        await investorRepo.save(investor[0]);
      }
    }

    res.redirect(`${ config.app.frontendUrl }/dashboard/verification/success`);
  }

  @httpPost(
    '/callback',
    'OnlyJumioIp'
  )
  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    const kycRepo = getConnection().getMongoRepository(KycResult);
    const investorRepo = getConnection().getMongoRepository(Investor);

    // express req.body does not inherit from standard JS object so we need this ugly workaround to make typeorm work.
    // without it we get 'object.hasOwnProperty is not a function' because typeorm using it to create entity
    // for more info check: https://github.com/expressjs/express/issues/3264
    const verificationResult = JSON.parse(JSON.stringify(req.body));

    try {
      verificationResult.identityVerification = JSON.parse(verificationResult.identityVerification);
    } catch (e) {
      // no identityVerification field
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
        if (verificationResult.identityVerification.validity === true) {
          investor.kycStatus = KYC_STATUS_VERIFIED;
          await this.web3Client.addAddressToWhiteList(investor.ethWallet.address);
        } else {
          // face does not match ID, we consider this as failing verification
          investor.kycStatus = KYC_STATUS_FAILED;
        }
        break;
      case JUMIO_SCAN_STATUS_ERROR:
        investor.kycStatus = KYC_STATUS_FAILED;
        break;
      default:
        // something strange is going on, throw
        console.log('unknown jumio status');
        throw Error('Unknown ID scan status');
    }

    await investorRepo.save(investor);
    res.status(200).send();
  }
}
