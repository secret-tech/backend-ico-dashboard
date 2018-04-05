import * as request from 'web-request';
import { injectable } from 'inversify';
import config from '../config';
import {
  MaxVerificationsAttemptsReached,
  NotCorrectVerificationCode,
  VerificationIsNotFound
} from '../exceptions/exceptions';
import { Logger } from '../logger';

const QR = require('qr-image');

/* istanbul ignore next */
@injectable()
export class VerificationClient implements VerificationClientInterface {
  private logger = Logger.getInstance('VERIFICATION_CLIENT');
  tenantToken: string;
  baseUrl: string;

  constructor(baseUrl: string) {
    request.defaults({
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      throwResponseError: true
    });

    this.baseUrl = baseUrl;
    this.tenantToken = config.auth.token;
  }

  async initiateVerification(method: string, data: InitiateData): Promise<InitiateResult> {
    try {
      const result = await request.json<InitiateResult>(`/methods/${ method }/actions/initiate`, {
        baseUrl: this.baseUrl,
        auth: {
          bearer: this.tenantToken
        },
        method: 'POST',
        body: data
      });

      result.method = method;
      delete result.code;
      if (result.totpUri) {
        const buffer = QR.imageSync(result.totpUri, {
          type: 'png',
          size: 20
        });
        result.qrPngDataUri = 'data:image/png;base64,' + buffer.toString('base64');
      }

      return result;
    } catch (error) {
      this.logger.exception('Initiate', error);

      throw error;
    }
  }

  async resendVerification(method: string, data: InitiateData): Promise<InitiateResult> {
    try {
      const result = await request.json<InitiateResult>(`/methods/${ method }/actions/resend`, {
        baseUrl: this.baseUrl,
        auth: {
          bearer: this.tenantToken
        },
        method: 'POST',
        body: data
      });

      result.method = method;

      return result;
    } catch (error) {
      this.logger.exception('Resend', error);

      throw error;
    }
  }

  async validateVerification(method: string, id: string, input: ValidateVerificationInput): Promise<ValidationResult> {
    try {
      return await request.json<ValidationResult>(`/methods/${ method }/verifiers/${ id }/actions/validate`, {
        baseUrl: this.baseUrl,
        auth: {
          bearer: this.tenantToken
        },
        method: 'POST',
        body: input
      });
    } catch (e) {
      if (e.statusCode === 422) {
        if (e.response.body.data.attempts >= config.verify.maxAttempts) {
          await this.invalidateVerification(method, id);
          throw new MaxVerificationsAttemptsReached('You have used all attempts to enter code');
        }

        throw new NotCorrectVerificationCode('Not correct code');
      }

      if (e.statusCode === 404) {
        throw new VerificationIsNotFound('Code was expired or not found. Please retry');
      }

      this.logger.exception('Validate', e);

      throw e;
    }
  }

  async invalidateVerification(method: string, id: string): Promise<void> {
    await request.json<Result>(`/methods/${ method }/verifiers/${ id }`, {
      baseUrl: this.baseUrl,
      auth: {
        bearer: this.tenantToken
      },
      method: 'DELETE'
    });
  }

  async getVerification(method: string, id: string): Promise<ValidationResult> {
    try {
      return await request.json<ValidationResult>(`/methods/${ method }/verifiers/${ id }`, {
        baseUrl: this.baseUrl,
        auth: {
          bearer: this.tenantToken
        },
        method: 'GET'
      });
    } catch (e) {
      if (e.statusCode === 404) {
        throw new VerificationIsNotFound('Code was expired or not found. Please retry');
      }

      this.logger.exception('getVerification', e);

      throw e;
    }
  }

  async checkVerificationPayloadAndCode(
    inputVerification: VerificationData,
    consumer: string,
    payload: any,
    removeSecret?: boolean
  ): Promise<ValidationResult> {
    const verification = await this.getVerification(
      inputVerification.method,
      inputVerification.verificationId
    );

    // JSON.stringify is the simplest method to check that 2 objects have same properties
    if (verification.data.consumer !== consumer || JSON.stringify(verification.data.payload) !== JSON.stringify(payload)) {
      throw new Error('Invalid verification payload');
    }

    return await this.validateVerification(
      inputVerification.method,
      inputVerification.verificationId,
      {
        code: inputVerification.code,
        removeSecret
      }
    );
  }
}

const VerificationClientType = Symbol('VerificationClientInterface');
export { VerificationClientType };
