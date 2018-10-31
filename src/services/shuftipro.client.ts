import * as request from 'web-request';
import * as crypto from 'crypto';
import { injectable } from 'inversify';

export class InvalidSignature extends Error {}
export class InvalidRequest extends Error {}

export interface ShuftiProClientInterface {
  init(verificationData: ShuftiProVerificationData): Promise<ShuftiProVerificationResponse>;
  status(reference: string): Promise<ShuftiProStatusResponse>;
}

@injectable()
export class ShuftiProClient implements ShuftiProClientInterface {
  private baseUrlApi: string;
  private rootPath = '/';
  private statusPath = '/status';
  private clientId: string;
  private secretKey: string;

  constructor(clientId: string, secretKey: string) {
    this.baseUrlApi = 'https://shuftipro.com/api';
    this.clientId = clientId;
    this.secretKey = secretKey;

    request.defaults({ throwResponseError: false });
  }

  public async init(verificationData: ShuftiProVerificationData): Promise<ShuftiProVerificationResponse> {
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.basicAuth()
      }
    };

    try {
      const response = await request.post(this.baseUrlApi + this.rootPath, options, JSON.stringify(verificationData));

      if (response.headers.sp_signature === this.spSignature(response.content)) {
        return JSON.parse(response.content) as ShuftiProVerificationResponse;
      }
      throw new InvalidSignature('Invalid signature');
    } catch (error) {
      throw new Error(error);
    }
  }

  public async status(reference: string): Promise<ShuftiProStatusResponse> {
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.basicAuth()
      }
    };

    try {
      const response = await request.post(this.baseUrlApi + this.statusPath, options, JSON.stringify({ reference }));

      if (response.statusCode === 404) {
        throw new InvalidRequest('Invalid Request');
      }

      if (response.headers.sp_signature === this.spSignature(response.content)) {
        return JSON.parse(response.content) as ShuftiProStatusResponse;
      }
      throw new InvalidSignature('Invalid signature');
    } catch (error) {
      throw new Error(error);
    }
  }

  private basicAuth(): string {
    return 'Basic ' + Buffer.from(`${this.clientId}:${this.secretKey}`).toString('base64');
  }

  private spSignature(data: any): string {
    return crypto.createHash('sha256').update(data + this.secretKey).digest('hex');
  }
}

const ShuftiProClientType = Symbol('ShuftiProClientInterface');
export { ShuftiProClientType };
