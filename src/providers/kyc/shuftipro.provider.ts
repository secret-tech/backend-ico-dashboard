import { injectable, inject } from 'inversify';
import * as request from 'web-request';
import { Logger } from '../../logger';
import config from '../../config';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import * as uuid from 'node-uuid';
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
    const logger = this.logger.sub({ email: investor.email }).addPrefix('[init] ');
    const shuftiproKycResultRepo = getConnection().getMongoRepository(ShuftiproKycResult);

    try {
      logger.debug('Prepare investor for identification');

      if (this.kycEnabled) {
        const verificationServices = {
          first_name: investor.firstName,
          last_name: investor.lastName,
          dob: investor.dob,
          background_check: '0'
        };

        const postData = {
          client_id: this.clientId,
          reference: uuid.v4(),
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

        postData['signature'] = this.signature(rawData);

        const options = {
          'method': 'POST',
          'headers': {
            'content-type': 'application/x-www-form-urlencoded'
          },
          'path': '/',
          'body': qs.stringify(postData)
        };

        const kycInitResponse = await request.json<ShuftiproInitResult>(this.baseUrl, options);

        if (!kycInitResponse.error) {
          const signature = this.signature(kycInitResponse.status_code + kycInitResponse.message + kycInitResponse.reference);
          if (signature === kycInitResponse.signature) {
            const kycInitResult = ShuftiproKycResult.createShuftiproKycResult({ ...kycInitResponse, timestamp: (new Date()).toISOString() });
            await shuftiproKycResultRepo.save(shuftiproKycResultRepo.create({ ...kycInitResult, user: investor.id }));
            this.logger.info('Successful init');
            return { ...kycInitResponse, timestamp: (new Date()).toISOString() } as ShuftiproInitResult;
          }

          this.logger.exception('Invalid signature');
          throw new Error('Invalid signature');
        }

        this.logger.exception(kycInitResponse.message);
        throw new Error(kycInitResponse.message);
      } else {
        return {
          message: 'KYC disabled',
          status_code: 'SP1'
        } as ShuftiproInitResult;
      }
    } catch (error) {
      logger.exception({ error });

      throw error;
    }
  }

  async getInitStatus(req: AuthorizedRequest, res: any, next: any): Promise<void> {
    switch (req.user.kycStatus) {
      case KYC_STATUS_VERIFIED:
        throw new KycAlreadyVerifiedError('Your account is verified already');
      case KYC_STATUS_FAILED:
        throw new KycFailedError(`Your account verification failed. Please contact ${ config.app.companyName } team`);
      case KYC_STATUS_PENDING:
        throw new KycPendingError('Your account verification is pending. Please wait for status update');
    }

    if ((req.user.kycInitResult as ShuftiproKycResult).statusCode === 'SP1') {
      res.json(req.user.kycInitResult);
    } else {
      res.json(await this.updateKycInit(req.user));
    }
  }

  successUpload(req: any, res: any, next: any) {
    throw new Error('Method not supported.');
  }

  async callback(req: any, res: any, next: any): Promise<void> {
    await this.processCallback(req.body);
    res.status(200).send();
  }

  async processCallback(data: ShuftiproInitResult): Promise<void> {
    const kycResultRepo = getConnection().getMongoRepository(ShuftiproKycResult);
    const investorRepo = getConnection().getMongoRepository(Investor);
    const storedKycResult = await kycResultRepo.findOne({ where: {'reference': data.reference} });

    const investor = storedKycResult
      ? await investorRepo.findOneById(storedKycResult.user)
      : await investorRepo.findOne({ where: {'kycInitResult.reference': data.reference} });

    const kycResult = ShuftiproKycResult.createShuftiproKycResult({ ...data, timestamp: new Date().toISOString() });

    await kycResultRepo.save(kycResultRepo.create({ ...kycResult, user: investor.id }));

    if (!investor || investor.kycStatus === KYC_STATUS_VERIFIED) {
      return;
    }

    const signature = this.signature(kycResult.statusCode + kycResult.message + kycResult.reference);
    if (signature === kycResult.signature) {
      switch (kycResult.statusCode) {
        case 'SP1':
          investor.kycStatus = KYC_STATUS_VERIFIED;
          investor.kycInitResult = kycResult;
          await this.web3Client.addAddressToWhiteList(investor.ethWallet.address);
          break;
        case 'SP0':
          investor.kycStatus = KYC_STATUS_FAILED;
          investor.kycInitResult = kycResult;
          break;
      }
    } else {
      this.logger.exception('Invalid signature');
      throw new Error('Invalid signature');
    }

    await investorRepo.save(investor);
  }

  async reinit(req: AuthorizedRequest, res: any, next: any): Promise<void> {
    res.json(await this.updateKycInit(req.user));
  }

  private async updateKycInit(user: Investor): Promise<ShuftiproInitResult> {
    const currentStatus = await this.getKycStatus(user);
    if (currentStatus.error || (currentStatus.status_code !== 'SP2' && currentStatus.status_code !== 'SP1')) {
      return await this.init(user);
    }
    return user.kycInitResult as ShuftiproInitResult;
  }

  private async getKycStatus(user: Investor): Promise<ShuftiproInitResult> {
    const kycInitResult = user.kycInitResult as ShuftiproInitResult;
    const postData = {
      client_id: this.clientId,
      reference: kycInitResult.reference,
      signature: this.signature(this.clientId + kycInitResult.reference)
    };

    const options = {
      'method': 'POST',
      'headers': {
        'content-type': 'application/x-www-form-urlencoded'
      },
      'body': qs.stringify(postData)
    };

    const response = await request.post(this.baseUrl + '/status', options);
    if (response.content.length > 0) {
      const result = JSON.parse(response.content);
      if (!result.error) {
        const signature = this.signature(result.status_code + result.message + result.reference);
        if (signature === result.signature) {
          return { ...result, timestamp: (new Date()).toISOString() } as ShuftiproInitResult;
        }
        throw new Error('Invalid signature');
      }
    }

    return {
      error: true,
      message: 'Empty response'
    } as ShuftiproInitResult;
  }

  private signature(data: string): string {
    return crypto.createHash('sha256').update(data + this.secretKey, 'utf8').digest('hex');
  }
}
