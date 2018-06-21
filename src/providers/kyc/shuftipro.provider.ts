import { injectable, inject } from 'inversify';
import * as request from 'web-request';
import { Logger } from '../../logger';
import config from '../../config';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import * as uuid from 'node-uuid';
import { AuthorizedRequest } from '../../requests/authorized.request';
import { KYC_STATUS_VERIFIED, KYC_STATUS_FAILED, KYC_STATUS_PENDING, Investor, KYC_STATUS_NOT_VERIFIED } from '../../entities/investor';
import { KycAlreadyVerifiedError, KycFailedError, KycPendingError, KycShuftiProInvalidSignature } from '../../exceptions/exceptions';
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

    try {
      logger.debug('Prepare investor for identification');

      if (this.kycEnabled) {
        const postData = this.preparePostData(investor);

        await this.localInitKycProcess(investor, postData.reference);

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
            await this.saveKycInitResult(investor, kycInitResponse);
            this.logger.info('Successful init');
            return { ...kycInitResponse, timestamp: (new Date()).toISOString() } as ShuftiproInitResult;
          }

          this.logger.exception('Invalid signature');
          throw new KycShuftiProInvalidSignature('Invalid signature');
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
    res.json(await this.processKycStatus(req.user));
  }

  successUpload(req: any, res: any, next: any) {
    throw new Error('Method not supported.');
  }

  async callback(req: any, res: any, next: any): Promise<void> {
    await this.processCallback(req.body);
    res.status(200).send();
  }

  async processCallback(kycResultRequest: ShuftiproInitResult): Promise<void> {
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
          throw new KycFailedError('Your account verification failed. Please contact {{companyName}} team', {
            companyName: config.app.companyName
          });
        }
        break;
      case KYC_STATUS_PENDING:
        throw new KycPendingError('Your account verification is pending. Please wait for status update');
    }

    if ((user.kycInitResult as ShuftiproKycResult).statusCode === 'SP1') {
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
        || (currentStatus.status_code !== 'SP2'
        && currentStatus.status_code !== 'SP1'
        && currentStatus.status_code !== 'SP26'
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
        throw new KycShuftiProInvalidSignature('Invalid signature');
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

  private async localInitKycProcess(user: Investor, reference: string): Promise<void> {
    const shuftiproKycResultRepo = getConnection().getMongoRepository(ShuftiproKycResult);

    const localInitKyc = new ShuftiproKycResult();
    localInitKyc.message = 'Local init';
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
    const verificationServices = {
      first_name: user.firstName,
      last_name: user.lastName,
      dob: user.dob,
      background_check: '0'
    };
    const postData = {
      client_id: this.clientId,
      reference: uuid.v4(),
      email: user.email,
      phone_number: user.phone,
      country: user.country,
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

    return postData;
  }

  private async createNewKycProcess(user: Investor): Promise<ShuftiproInitResult> {
    const investorRepo = getConnection().getMongoRepository(Investor);
    const kycInitResult = await this.init(user);
    user.kycInitResult = kycInitResult;
    await investorRepo.save(user);
    return kycInitResult;
  }
}
