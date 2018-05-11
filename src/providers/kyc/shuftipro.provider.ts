import { injectable, inject } from 'inversify';
import * as request from 'web-request';
import { Logger } from '../../logger';
import config from '../../config';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import { AuthorizedRequest } from '../../requests/authorized.request';
import { KYC_STATUS_VERIFIED, KYC_STATUS_FAILED, KYC_STATUS_PENDING, Investor, KYC_STATUS_NOT_VERIFIED } from '../../entities/investor';
import { KycAlreadyVerifiedError, KycFailedError, KycPendingError } from '../../exceptions/exceptions';
import { getConnection } from 'typeorm';
import { ShuftiproKycResult } from '../../entities/shuftipro.kyc.result';
import { Web3ClientInterface, Web3ClientType } from '../../services/web3.client';

const mongo = require('mongodb');

@injectable()
export class ShuftiproProvider implements KycProviderInterface {

  private logger = Logger.getInstance('SHUFTIPRO_KYC_CLIENT');
  clientId: string;
  secretKey: string;
  baseUrl: string;
  kycEnabled: boolean;

  constructor(
    @inject(Web3ClientType) private web3Client: Web3ClientInterface
  ) {
    this.clientId = config.kyc.shuftipro.clientId;
    this.secretKey = config.kyc.shuftipro.secretKey;
    this.baseUrl = config.kyc.shuftipro.baseUrl;
    this.kycEnabled = config.kyc.enabled;

    request.defaults({
      throwResponseError: true
    });
  }

  async init(investor: Investor): Promise<ShuftiproInitResult> {
    const verificationServices = {
      first_name: investor.firstName,
      last_name: investor.lastName,
      dob: '1970-01-01',
      background_check: '0'
    };

    const postData = {
      client_id: this.clientId,
      reference: investor.id.toString(),
      email: investor.email,
      phone_number: investor.phone,
      country: investor.country,
      lang: 'en',
      callback_url: config.kyc.shuftipro.callbackUrl,
      redirect_url: config.kyc.shuftipro.redirectUrl,
      verification_services: JSON.stringify(verificationServices)
    };

    let rawData: string = '';
    Object.keys(postData).sort().forEach(function(value) {
      rawData += postData[value];
    });

    rawData += this.secretKey;
    postData['signature'] = crypto.createHash('sha256').update(rawData, 'utf8').digest('hex');

    const options = {
      'method': 'POST',
      'headers': {
        'content-type': 'application/x-www-form-urlencoded'
      },
      'path': '/',
      'body': qs.stringify(postData)
    };

    const result = await request.json<ShuftiproInitResult>(this.baseUrl, options);

    if (!result.error) {
      const signature = crypto.createHash('sha256').update(result.status_code + result.message + result.reference + this.secretKey, 'utf8').digest('hex');
      if (signature === result.signature) {
        return { ...result, timestamp: Date.now().toString() } as ShuftiproInitResult;
      }

      throw new Error('Invalid signature');
    }

    throw new Error(result.message);
  }

  getInitStatus(req: AuthorizedRequest, res: any, next: any) {
    switch (req.user.kycStatus) {
      case KYC_STATUS_VERIFIED:
        throw new KycAlreadyVerifiedError('Your account is verified already');
      case KYC_STATUS_FAILED:
        throw new KycFailedError(`Your account verification failed. Please contact ${config.app.companyName} team`);
      case KYC_STATUS_PENDING:
        throw new KycPendingError('Your account verification is pending. Please wait for status update');
    }
    res.json(req.user.kycInitResult);
  }

  successUpload(req: any, res: any, next: any) {
    throw new Error('Method not supported.');
  }

  async callback(req: any, res: any, next: any): Promise<void> {
    const shuftiproKycResultRepo = getConnection().getMongoRepository(ShuftiproKycResult);
    const investorRepo = getConnection().getMongoRepository(Investor);

    const result = shuftiproKycResultRepo.create({ ...req.body, timestamp: Date.now().toString() });
    await shuftiproKycResultRepo.save(result);

    const investor = await getConnection().mongoManager.findOneById(Investor, new mongo.ObjectId(req.body.reference));

    if (!investor || investor.kycStatus === KYC_STATUS_VERIFIED || investor.kycStatus === KYC_STATUS_FAILED) {
      // no such user/already verified/max attempts reached
      // respond with 200 as I expect that Jumio may try to resend notification in case of failure
      res.status(200).send();
      return;
    }

    const signature = crypto.createHash('sha256').update(req.body.status_code + req.body.message + req.body.reference + this.secretKey, 'utf8').digest('hex');
    if (signature === req.body.signature) {
      switch (req.body.code_status) {
        case 'SP1':
          investor.kycStatus = KYC_STATUS_VERIFIED;
          await this.web3Client.addAddressToWhiteList(investor.ethWallet.address);
          break;
        case 'SP0':
          investor.kycStatus = KYC_STATUS_NOT_VERIFIED;
          break;
      }
    }

    await investorRepo.save(investor);
    res.status(200).send();
  }
}
