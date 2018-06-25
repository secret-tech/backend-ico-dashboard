import * as request from 'web-request';
import { injectable, inject } from 'inversify';
import config from '../../config';
import 'reflect-metadata';
import { Investor, KYC_STATUS_VERIFIED, KYC_STATUS_FAILED, KYC_STATUS_PENDING, KYC_STATUS_NOT_VERIFIED } from '../../entities/investor';
import * as uuid from 'node-uuid';
import { base64encode, base64decode } from '../../helpers/helpers';
import * as bcrypt from 'bcrypt-nodejs';
import { Logger } from '../../logger';
import { KycAlreadyVerifiedError, KycFailedError, KycPendingError } from '../../exceptions/exceptions';
import { getConnection } from 'typeorm';
import { JUMIO_SCAN_STATUS_SUCCESS, JUMIO_SCAN_STATUS_ERROR, KycResult } from '../../entities/kyc.result';
import { Web3ClientType, Web3ClientInterface } from '../../services/web3.client';
import { AuthorizedRequest } from '../../requests/authorized.request';

const mongo = require('mongodb');
const userAgent = config.app.companyName.replace(/[^a-zA-Z0-9]/g, '') + ' ICO/1.0.0';

@injectable()
export class JumioProvider implements KycProviderInterface {
  private logger = Logger.getInstance('JUMIO_KYC_CLIENT');
  apiToken: string;
  apiSecret: string;
  baseUrl: string;
  defaultTokenLifetime: number;
  kycEnabled: boolean;

  constructor(
    @inject(Web3ClientType) private web3Client: Web3ClientInterface
  ) {
    this.apiToken = config.kyc.jumio.apiToken;
    this.apiSecret = config.kyc.jumio.apiSecret;
    this.baseUrl = config.kyc.jumio.baseUrl;
    this.defaultTokenLifetime = config.kyc.jumio.defaultTokenLifetime;
    this.kycEnabled = config.kyc.enabled;

    request.defaults({
      throwResponseError: true
    });
  }

  async init(investor: Investor): Promise<KycInitResult> {
    const logger = this.logger.sub({ email: investor.email }).addPrefix('[init] ');

    try {
      logger.debug('Prepare investor for identification');

      if (this.kycEnabled) {
        const id = investor.id.toHexString();
        const hash = base64encode(bcrypt.hashSync(id + config.kyc.jumio.apiSecret));

        const kycOptions = {
          baseUrl: this.baseUrl,
          method: 'POST',
          auth: {
            user: this.apiToken,
            password: this.apiSecret
          },
          headers: {
            'User-Agent': userAgent
          },
          body: {
            merchantIdScanReference: uuid.v4(),
            successUrl: `${ config.app.apiUrl }/kyc/uploaded/${ id }/${ hash }`,
            errorUrl: `${ config.app.frontendUrl }/dashboard/verification/failure`,
            callbackUrl: `${ config.app.apiUrl }/kyc/callback`,
            customerId: investor.email,
            authorizationTokenLifetime: this.defaultTokenLifetime
          }
        };

        return await request.json<JumioInitResult>('/initiateNetverify', kycOptions);
      } else {
        return {
          timestamp: '1520846090',
          authorizationToken: 'token',
          jumioIdScanReference: 'id',
          clientRedirectUrl: 'http://localhost'
        } as JumioInitResult;
      }

    } catch (error) {
      logger.exception({ error });

      throw error;
    }
  }

  async getInitStatus(req: AuthorizedRequest, res, next) {
    switch (req.user.kycStatus) {
      case KYC_STATUS_VERIFIED:
        throw new KycAlreadyVerifiedError('Your account is verified already');
      case KYC_STATUS_FAILED:
        throw new KycFailedError('Your account verification failed. Please contact {{companyName}} team', {
          companyName: config.app.companyName
        });
      case KYC_STATUS_PENDING:
        throw new KycPendingError('Your account verification is pending. Please wait for status update');
    }
    res.json(req.user.kycInitResult);
  }

  async successUpload(req, res, next): Promise<void> {
    const decodedHash = base64decode(req.params.base64hash);

    if (bcrypt.compareSync(req.params.id + config.kyc.jumio.apiSecret, decodedHash)) {
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

  async callback(req, res, next): Promise<void> {
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

    const investor = (await investorRepo.createEntityCursor({
      _id: new mongo.ObjectId(verificationResult.customerId)
    }).toArray()).pop();

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
        console.error('unknown jumio status');
        throw Error('Unknown ID scan status');
    }

    await investorRepo.save(investor);
    res.status(200).send();
  }

  async reinit(req, res, next): Promise<void> {
    throw new Error('Method not supported.');
  }
}
