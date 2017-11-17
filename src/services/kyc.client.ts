import * as request from 'web-request';
import { injectable } from 'inversify';
import config from '../config';
import 'reflect-metadata';
import { Investor } from '../entities/investor';
import * as uuid from 'node-uuid';

@injectable()
export class KycClient implements KycClientInterface {
  apiToken: string;
  apiSecret: string;
  baseUrl: string;
  defaultTokenLifetime: number;

  constructor() {
    this.apiToken = config.kyc.apiToken;
    this.apiSecret = config.kyc.apiSecret;
    this.baseUrl = config.kyc.baseUrl;
    this.defaultTokenLifetime = config.kyc.defaultTokenLifetime;

    request.defaults({
      throwResponseError: true
    });
  }

  async init(investor: Investor): Promise<KycInitResult> {
    return await request.json<KycInitResult>('/initiateNetverify', {
      baseUrl: this.baseUrl,
      method: 'POST',
      auth: {
        user: this.apiToken,
        password: this.apiSecret
      },
      headers: {
        'User-Agent': 'JINCOR ICO/1.0.0'
      },
      body: {
        merchantIdScanReference: uuid.v4(),
        successUrl: `${ config.app.frontendUrl }/dashboard/verification/success`,
        errorUrl: `${ config.app.frontendUrl }/dashboard/verification/failure`,
        callbackUrl: `${ config.app.apiUrl }/kyc/callback`,
        customerId: investor.email,
        authorizationTokenLifetime: this.defaultTokenLifetime
      }
    });
  }

  async getScanReferenceStatus(scanId: string): Promise<KycScanStatus> {
    return await request.json<KycScanStatus>(`/scans/${ scanId }`, {
      baseUrl: this.baseUrl,
      method: 'GET',
      auth: {
        user: this.apiToken,
        password: this.apiSecret
      },
      headers: {
        'User-Agent': 'JINCOR ICO/1.0.0'
      }
    });
  }
}

const KycClientType = Symbol('KycClientInterface');
export { KycClientType };
