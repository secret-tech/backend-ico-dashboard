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
import { ShuftiProClientType, ShuftiProClientInterface } from '../../services/shuftipro.client';

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
  kycEnabled: boolean;

  constructor(
    @inject(Web3ClientType) private web3Client: Web3ClientInterface,
    @inject(ShuftiProClientType) private shuftiClient: ShuftiProClientInterface
  ) {
    this.kycEnabled = config.kyc.enabled;

    request.defaults({
      throwResponseError: true
    });
  }

  async init(investor: Investor): Promise<any> {
    const logger = this.logger.sub({ email: investor.email }).addPrefix('[init]');

    if (this.kycEnabled) {
      const verificationData = this.preparePostData(investor);
      await this.localInitKycProcess(investor, verificationData.reference);

      const verificationResponse = await this.shuftiClient.init(verificationData);

      if (!verificationResponse.error) {
        await this.saveKycInitResult(investor, verificationResponse);
        this.logger.info('Successful init');
        return verificationResponse;
      }
      logger.exception(verificationResponse.error);
      throw new Error(verificationResponse.error);
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

    const statusResponse = await this.shuftiClient.status(kycInitResult.reference);
    return { ...statusResponse, timestamp: (new Date()).toISOString() } as ShuftiproInitResult;
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

  private async saveKycInitResult(user: Investor, kycInitResponse: ShuftiProVerificationResponse): Promise<void> {
    const shuftiproKycResultRepo = getConnection().getMongoRepository(ShuftiproKycResult);

    const kycInitResult = ShuftiproKycResult.createShuftiproKycResult({
      error: kycInitResponse.error,
      event: kycInitResponse.event,
      reference: kycInitResponse.reference,
      verification_url: kycInitResponse.verification_url,
      verification_result: kycInitResponse.verification_result,
      timestamp: (new Date()).toISOString()
    });
    await shuftiproKycResultRepo.save(shuftiproKycResultRepo.create({ ...kycInitResult, user: user.id }));
  }

  private preparePostData(user: Investor): ShuftiProVerificationData {
    const verificationData = {
      callback_url: config.kyc.shuftipro.callbackUrl,
      reference: uuid.v4(),
      country: user.country,
      document: {
        supported_types: ['passport', 'id_card', 'driving_license'],
        name: {
          first_name: user.firstName,
          last_name: user.lastName
        },
        dob: user.dob
      },
      background_checks: {
        name: {
          first_name: user.firstName,
          last_name: user.lastName
        },
        dob: user.dob
      }
    } as ShuftiProVerificationData;

    return verificationData;
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
