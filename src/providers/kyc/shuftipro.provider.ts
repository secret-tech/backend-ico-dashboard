import { injectable, inject } from 'inversify';
import * as request from 'web-request';
import { Logger } from '../../logger';
import config from '../../config';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import * as uuid from 'node-uuid';
import { AuthorizedRequest } from '../../requests/authorized.request';
import { KYC_STATUS_VERIFIED, KYC_STATUS_FAILED, KYC_STATUS_PENDING, Investor } from '../../entities/investor';
import { KycAlreadyVerifiedError, KycFailedError, KycPendingError, KycShuftiProInvalidSignature } from '../../exceptions/exceptions';
import { getConnection } from 'typeorm';
import { ShuftiproKycResult } from '../../entities/shuftipro.kyc.result';
import { Web3ClientInterface, Web3ClientType } from '../../services/web3.client';

const mongo = require('mongodb');

const LOCAL_INIT = 'local.init';
const REQUEST_PENDING = 'request.pending';
const REQUEST_INVALID = 'request.invalid';
const REQUEST_CANCELLED = 'request.cancelled';
const REQUEST_TIMEOUT = 'request.timeout';
const REQUEST_UNAUTORIZED = 'request.unautorized';
const VERIFICATION_ACCEPTED = 'verification.accepted';
const VERIFICATION_DECLINED = 'verification.declined';

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

  async init(investor: Investor): Promise<any> {
    const logger = this.logger.sub({ email: investor.email }).addPrefix('[init]');

    if (this.kycEnabled) {
      const postData = this.preparePostData(investor);
      await this.localInitKycProcess(investor, postData.reference);

      const options = {
        headers: {
          'content-type': 'application/json',
          'autorization': this.authOption()
        }
      };

      const response = await request.post(this.baseUrl + '/api', options, JSON.stringify(postData));
      const kycInitResponse = JSON.parse(response.content);

      if (!kycInitResponse.error) {
        const signature = this.signature(kycInitResponse + config.kyc.shuftipro.secretKey);
        if (signature === response.headers['sp_signature']) {
          await this.saveKycInitResult(investor, kycInitResponse);
          this.logger.info('Successful init');
          return {
            event: kycInitResponse.event,
            error: kycInitResponse.error,
            verification_url: kycInitResponse.verification_url,
            reference: postData.reference,
            timestamp: (new Date()).toISOString()
          } as ShuftiproInitResult;
        }
      }
      throw new Error(kycInitResponse.error);
    }

    return {
      event: VERIFICATION_ACCEPTED,
      timestamp: (new Date()).toISOString()
    } as ShuftiproInitResult;
  }

  async getInitStatus(req: AuthorizedRequest, res: any, next: any): Promise<void> {
    res.json(await this.processKycStatus(req.user));
  }

  public successUpload(req: any, res: any, next: any) {
    throw new Error('Method not supported.');
  }

  async callback(req: any, res: any, next: any): Promise<void> {
    await this.processCallback(req.body, req.headers['sp_signature']);
    res.status(200).send();
  }

  async processCallback(kycResultRequest: ShuftiproInitResult, spSignature: string): Promise<void> {
    const kycResultRepo = getConnection().getMongoRepository(ShuftiproKycResult);
    const investorRepo = getConnection().getMongoRepository(Investor);
    const storedKycResult = await kycResultRepo.findOne({ where: {'reference': kycResultRequest.reference} });

    const investor = storedKycResult
      ? await investorRepo.findOneById(storedKycResult.user)
      : await investorRepo.findOne({ where: {'kycInitResult.reference': kycResultRequest.reference} });

    const kycResult = ShuftiproKycResult.createShuftiproKycResult({ ...kycResultRequest, timestamp: new Date().toISOString() });

    await kycResultRepo.save(kycResultRepo.create({ ...kycResult, user: investor.id }));

    if (!investor || investor.kycStatus === KYC_STATUS_VERIFIED) {
      return;
    }

    const signature = this.spSignature(kycResultRequest);
    if (signature === spSignature) {
      switch (kycResult.event) {
        case VERIFICATION_ACCEPTED:
          investor.kycStatus = KYC_STATUS_VERIFIED;
          investor.kycInitResult = kycResult;
          await this.web3Client.addAddressToWhiteList(investor.ethWallet.address);
          break;
        case VERIFICATION_DECLINED:
          investor.kycStatus = KYC_STATUS_FAILED;
          investor.kycInitResult = kycResult;
          break;
      }
    } else {
      this.logger.exception('Invalid signature');
      throw new KycShuftiProInvalidSignature('Invalid signature');
    }

    await investorRepo.save(investor);
  }

  async processKycStatus(user: Investor): Promise<ShuftiproInitResult> {
    switch (user.kycStatus) {
      case KYC_STATUS_VERIFIED:
        throw new KycAlreadyVerifiedError('Your account is verified already');
      case KYC_STATUS_FAILED:
        if (!config.kyc.shuftipro.allowRecreateSession) {
          throw new KycFailedError(`Your account verification failed. Please contact ${ config.app.companyName } team`);
        }
        break;
      case KYC_STATUS_PENDING:
        throw new KycPendingError('Your account verification is pending. Please wait for status update');
    }

    if ((user.kycInitResult as ShuftiproKycResult).event === VERIFICATION_ACCEPTED) {
      return user.kycInitResult as ShuftiproInitResult;
    }

    return await this.updateKycInit(user);
  }

  async reinit(req: AuthorizedRequest, res: any, next: any): Promise<void> {
    res.json(await this.updateKycInit(req.user));
  }

  private async updateKycInit(user: Investor): Promise<ShuftiproInitResult> {
    try {
      const currentStatus = await this.getKycStatus(user);
      if (currentStatus.error
        || (currentStatus.event !== REQUEST_PENDING
        && currentStatus.event !== VERIFICATION_ACCEPTED
      )) {
        return await this.createNewKycProcess(user);
      }
      return user.kycInitResult as ShuftiproInitResult;
    } catch (error) {
      if (error.constructor === KycShuftiProInvalidSignature) {
        return await this.createNewKycProcess(user);
      }
      throw error;
    }
  }

  private async getKycStatus(investor: Investor): Promise<ShuftiproInitResult> {
    this.logger.debug('get kyc status');
    const kycInitResult = investor.kycInitResult as ShuftiproInitResult;
    const postData = {
      reference: kycInitResult.reference
    };

    const options = {
      'headers': {
        'content-type': 'application/json',
        'Authorization': this.authOption()
      }
    };

    const response = await request.post(this.baseUrl + '/api/status', options, JSON.stringify(postData));
    if (response.content.length > 0) {
      const result = JSON.parse(response.content);
      if (!result.error) {
        const signature = this.signature(result.status_code + result.message + result.reference);
        if (signature === result.signature) {
          return { ...result, timestamp: (new Date()).toISOString() } as ShuftiproInitResult;
        }
        throw new KycShuftiProInvalidSignature('Invalid signature');
      }
    }

    return {
      error: true
    } as ShuftiproInitResult;
  }

  private authOption() {
    return 'Basic ' + Buffer.from(`${config.kyc.shuftipro.clientId}:${config.kyc.shuftipro.secretKey}`).toString('base64');
  }

  private signature(data: string): string {
    return crypto.createHash('sha256').update(data + this.secretKey, 'utf8').digest('hex');
  }

  private async localInitKycProcess(user: Investor, reference: string): Promise<void> {
    const shuftiproKycResultRepo = getConnection().getMongoRepository(ShuftiproKycResult);

    const localInitKyc = new ShuftiproKycResult();
    localInitKyc.event = LOCAL_INIT;
    localInitKyc.reference = reference;
    localInitKyc.timestamp = (new Date()).toISOString();
    localInitKyc.user = user.id;

    await shuftiproKycResultRepo.save(localInitKyc);
  }

  private async saveKycInitResult(user: Investor, kycInitResponse: ShuftiproInitResult): Promise<void> {
    const shuftiproKycResultRepo = getConnection().getMongoRepository(ShuftiproKycResult);

    const kycInitResult = ShuftiproKycResult.createShuftiproKycResult({ ...kycInitResponse, timestamp: (new Date()).toISOString() });
    await shuftiproKycResultRepo.save(shuftiproKycResultRepo.create({ ...kycInitResult, user: user.id }));
  }

  private preparePostData(user: Investor): any {
    const postData = {
      reference: uuid.v4(),
      email: user.email,
      country: user.country,
      language: 'EN',
      verification_mode: 'any',
      callback_url: config.kyc.shuftipro.callbackUrl,
      redirect_url: config.kyc.shuftipro.redirectUrl,
      background_checks: {
        name: {
        	first_name: user.firstName,
    	    last_name: user.lastName
        },
        dob: user.dob
      }
    };

    return postData;
  }

  private async createNewKycProcess(user: Investor): Promise<ShuftiproInitResult> {
    const investorRepo = getConnection().getMongoRepository(Investor);
    const kycInitResult = await this.init(user);
    user.kycInitResult = kycInitResult;
    await investorRepo.save(user);
    return kycInitResult;
  }

  private spSignature(data: any): string {
    return crypto.createHash('sha256').update(data + config.kyc.shuftipro.secretKey).digest('hex');
  }
}
