import * as request from 'web-request';
import { injectable } from 'inversify';
import config from '../config';
import 'reflect-metadata';
import { Logger } from '../logger';

/* istanbul ignore next */
@injectable()
export class AuthClient implements AuthClientInterface {
  private logger = Logger.getInstance('AUTH_CLIENT');

  tenantToken: string;
  baseUrl: string;

  constructor(baseUrl: string) {
    this.tenantToken = config.auth.token;
    this.baseUrl = baseUrl;

    request.defaults({
      throwResponseError: true
    });
  }

  async registerTenant(email: string, password: string): Promise<TenantRegistrationResult> {
    try {
      return await request.json<TenantRegistrationResult>('/tenant', {
        baseUrl: this.baseUrl,
        method: 'POST',
        body: {
          email,
          password
        }
      });
    } catch (error) {
      this.logger.exception('registerTenant', error);
      throw error;
    }
  }

  async loginTenant(email: string, password: string): Promise<AccessTokenResponse> {
    try {
      return await request.json<AccessTokenResponse>('/tenant/login', {
        baseUrl: this.baseUrl,
        method: 'POST',
        body: {
          email,
          password
        }
      });
    } catch (error) {
      this.logger.exception('loginTenant', error);
      throw error;
    }
  }

  async verifyTenantToken(token: string): Promise<TenantVerificationResult> {
    try {
      return (await request.json<TenantVerificationResponse>('/tenant/verify', {
        baseUrl: this.baseUrl,
        method: 'POST',
        body: {
          token
        }
      })).decoded;
    } catch (error) {
      this.logger.exception('verifyTenantToken', error);
      throw error;
    }
  }

  async logoutTenant(token: string): Promise<void> {
    try {
      await request.json<TenantVerificationResult>('/tenant/logout', {
        baseUrl: this.baseUrl,
        method: 'POST',
        body: {
          token
        }
      });
    } catch (error) {
      this.logger.exception('logoutTenant', error);
      throw error;
    }
  }

  async createUser(data: AuthUserData): Promise<UserRegistrationResult> {
    try {
      return await request.json<UserRegistrationResult>('/user', {
        baseUrl: this.baseUrl,
        method: 'POST',
        body: data,
        headers: {
          'authorization': `Bearer ${this.tenantToken}`,
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      });
    } catch (error) {
      this.logger.exception('createUser', error);
      throw error;
    }
  }

  async deleteUser(login: string): Promise<void> {
    try {
      return await request.json<void>(`/user/${login}`, {
        baseUrl: this.baseUrl,
        method: 'DELETE',
        headers: {
          'authorization': `Bearer ${this.tenantToken}`
        }
      });
    } catch (error) {
      this.logger.exception('deleteUser', error);
      throw error;
    }
  }

  async loginUser(data: UserLoginData): Promise<AccessTokenResponse> {
    try {
      return await request.json<AccessTokenResponse>('/auth', {
        baseUrl: this.baseUrl,
        method: 'POST',
        headers: {
          'authorization': `Bearer ${this.tenantToken}`
        },
        body: data
      });
    } catch (error) {
      this.logger.exception('loginUser', error);
      throw error;
    }
  }

  async verifyUserToken(token: string): Promise<UserVerificationResult> {
    try {
      return (await request.json<UserVerificationResponse>('/auth/verify', {
        baseUrl: this.baseUrl,
        method: 'POST',
        headers: {
          'authorization': `Bearer ${this.tenantToken}`
        },
        body: { token }
      })).decoded;
    } catch (error) {
      this.logger.exception('verifyUserToken', error);
      throw error;
    }
  }

  async logoutUser(token: string): Promise<void> {
    try {
      await request.json<string>('/auth/logout', {
        baseUrl: this.baseUrl,
        method: 'POST',
        headers: {
          'authorization': `Bearer ${this.tenantToken}`
        },
        body: { token }
      });
    } catch (error) {
      this.logger.exception('logoutUser', error);
      throw error;
    }
  }
}

const AuthClientType = Symbol('AuthClientInterface');
export { AuthClientType };
