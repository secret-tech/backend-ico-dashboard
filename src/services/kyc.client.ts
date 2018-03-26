import * as request from 'web-request';
import { injectable } from 'inversify';
import config from '../config';
import 'reflect-metadata';
import { Investor } from '../entities/investor';
import * as uuid from 'node-uuid';
import { base64encode } from '../helpers/helpers';
import * as bcrypt from 'bcrypt-nodejs';
import { Logger } from '../logger';

const userAgent = config.app.companyName.replace(/[^a-zA-Z0-9]/g, '') + ' ICO/1.0.0';

@injectable()
export class KycClient implements KycClientInterface {
  private logger = Logger.getInstance('JUMIO_KYC_CLIENT');
  apiToken: string;
  apiSecret: string;
  baseUrl: string;
  defaultTokenLifetime: number;
  kycEnabled: boolean;

  constructor() {
    this.apiToken = config.kyc.apiToken;
    this.apiSecret = config.kyc.apiSecret;
    this.baseUrl = config.kyc.baseUrl;
    this.defaultTokenLifetime = config.kyc.defaultTokenLifetime;
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
        const hash = base64encode(bcrypt.hashSync(id + config.kyc.apiSecret));

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

        return await request.json<KycInitResult>('/initiateNetverify', kycOptions);
      } else {
        return {
          timestamp: '1520846090',
          authorizationToken: 'token',
          jumioIdScanReference: 'id',
          clientRedirectUrl: 'http://localhost'
        };
      }

    } catch (error) {
      logger.exception({ error });

      throw error;
    }
  }

  async getScanReferenceStatus(scanId: string): Promise<KycScanStatus> {
    const logger = this.logger.sub({ scanId }, '[getScanReferenceStatus] ');

    try {
      logger.debug('Get scan data');

      return await request.json<KycScanStatus>(`/scans/${ scanId }`, {
        baseUrl: this.baseUrl,
        method: 'GET',
        auth: {
          user: this.apiToken,
          password: this.apiSecret
        },
        headers: {
          'User-Agent': userAgent
        }
      });
    } catch (error) {
      logger.exception({ error });

      throw error;
    }
  }
}

const KycClientType = Symbol('KycClientInterface');
export { KycClientType };
