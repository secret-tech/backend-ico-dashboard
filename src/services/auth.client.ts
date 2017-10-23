import * as request from 'web-request';
import { injectable } from 'inversify';
import config from '../config';

@injectable()
export class AuthClient implements AuthClientInterface {
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
    return await request.json<TenantRegistrationResult>('/tenant', {
      baseUrl: this.baseUrl,
      method: 'POST',
      body: {
        email,
        password
      }
    });
  }

  async loginTenant(email: string, password: string): Promise<AccessTokenResponse> {
    return await request.json<AccessTokenResponse>('/tenant/login', {
      baseUrl: this.baseUrl,
      method: 'POST',
      body: {
        email,
        password
      }
    });
  }

  async verifyTenantToken(token: string): Promise<TenantVerificationResult> {
    return (await request.json<TenantVerificationResponse>('/tenant/verify', {
      baseUrl: this.baseUrl,
      method: 'POST',
      body: {
        token
      }
    })).decoded;
  }

  async logoutTenant(token: string): Promise<void> {
    await request.json<TenantVerificationResult>('/tenant/logout', {
      baseUrl: this.baseUrl,
      method: 'POST',
      body: {
        token
      }
    });
  }

  async createUser(data: AuthUserData): Promise<UserRegistrationResult> {
    return await request.json<UserRegistrationResult>('/user', {
      baseUrl: this.baseUrl,
      method: 'POST',
      body: data,
      headers: {
        'authorization': `Bearer ${ this.tenantToken }`,
        'accept': 'application/json',
        'content-type': 'application/json'
      }
    });
  }

  async deleteUser(login: string): Promise<void> {
    return await request.json<void>(`/user/${ login }`, {
      baseUrl: this.baseUrl,
      method: 'DELETE',
      headers: {
        'authorization': `Bearer ${ this.tenantToken }`
      }
    });
  }

  async loginUser(data: UserLoginData): Promise<AccessTokenResponse> {
    return await request.json<AccessTokenResponse>('/auth', {
      baseUrl: this.baseUrl,
      method: 'POST',
      headers: {
        'authorization': `Bearer ${ this.tenantToken }`
      },
      body: data
    });
  }

  async verifyUserToken(token: string): Promise<UserVerificationResult> {
    return (await request.json<UserVerificationResponse>('/auth/verify', {
      baseUrl: this.baseUrl,
      method: 'POST',
      headers: {
        'authorization': `Bearer ${ this.tenantToken }`
      },
      body: { token }
    })).decoded;
  }

  async logoutUser(token: string): Promise<void> {
    await request.json<string>('/auth/logout', {
      baseUrl: this.baseUrl,
      method: 'POST',
      headers: {
        'authorization': `Bearer ${ this.tenantToken }`
      },
      body: { token }
    });
  }
}

const AuthClientType = Symbol('AuthClientInterface');
export { AuthClientType };
