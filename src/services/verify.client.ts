import * as request from 'web-request';
import { injectable } from 'inversify';
import config from '../config';

export interface InitiateData {
  consumer: string,
  template: {
    body: string
  },
  generateCode: {
    length: number,
    symbolSet: Array<string>,
  },
  policy: {
    expiredOn: string
  }
}

interface Result {
  status: number
}

export interface InitiateResult extends Result {
  verificationId: string,
  attempts: number,
  expiredOn: number,
  method: string,
  barcode?: string
}

export interface ValidationResult extends Result {
  details?: any,
  data?: {
    verificationId: string,
    consumer: string,
    expiredOn: number
  }
}

export interface VerificationClientInterface {
  initiateVerification: (method: string, data: InitiateData) => Promise<InitiateResult>,
  validateVerification: (method:string, id: string, code: string) => Promise<ValidationResult>,
  invalidateVerification: (method:string, id:string) => Promise<void>
}

@injectable()
export class VerificationClient implements VerificationClientInterface {
  tenantToken: string;
  baseUrl: string;

  constructor(baseUrl: string) {
    request.defaults({
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      throwResponseError: true
    });

    this.baseUrl = baseUrl;
    this.tenantToken = config.auth.token;
  }

  async initiateVerification(method: string, data: InitiateData): Promise<InitiateResult> {
    const result = await request.json<InitiateResult>(`/methods/${ method }/actions/initiate`, {
      baseUrl: this.baseUrl,
      auth: {
        bearer: this.tenantToken
      },
      method: 'POST',
      body: data,
    });

    result.method = method;

    return result;
  }

  async validateVerification(method:string, id: string, code: string): Promise<ValidationResult> {
    return await request.json<ValidationResult>(`/methods/${ method }/verifiers/${ id }/actions/validate`, {
      baseUrl: this.baseUrl,
      auth: {
        bearer: this.tenantToken
      },
      method: 'POST',
      body: {
        code
      }
    });
  }

  async invalidateVerification(method:string, id:string): Promise<void> {
    await request.json<Result>(`/methods/${ method }/verifiers/${ id }`, {
      baseUrl: this.baseUrl,
      auth: {
        bearer: this.tenantToken
      },
      method: 'DELETE',
    });
  }
}

const VerificationClientType = Symbol('VerificationClientInterface');
export { VerificationClientType };