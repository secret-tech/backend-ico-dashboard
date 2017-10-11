import * as request from 'web-request';
import { injectable } from 'inversify';
import config from '../config';

interface RegistrationResult {
  id: string,
  email: string,
  login: string
}

interface TenantRegistrationResult extends RegistrationResult {

}

export interface UserRegistrationResult extends RegistrationResult {
  tenant: string,
  sub: string,
  scope?: any
}

interface VerificationResult {
  id: string,
  login: string,
  jti: string,
  iat: number,
  aud: string
}

interface TenantVerificationResult extends VerificationResult {
  isTenant: boolean
}

interface UserVerificationResult extends VerificationResult {
  deviceId: string,
  sub: string,
  exp: number,
  scope?: any
}

interface UserData {
  email: string,
  login: string,
  password: string,
  sub: string,
  scope?: any
}

interface UserLoginData {
  login: string,
  password: string,
  deviceId: string
}

export interface AccessTokenResponse {
  accessToken: string
}

export interface AuthClientInterface {
  tenantToken: string,
  registerTenant: (email: string, password: string) => Promise<TenantRegistrationResult>;
  loginTenant: (email: string, password: string) => Promise<AccessTokenResponse>;
  verifyTenantToken: (token: string) => Promise<TenantVerificationResult>;
  logoutTenant: (token: string) => Promise<void>;
  createUser: (data: UserData) => Promise<UserRegistrationResult>;
  loginUser: (data: UserLoginData) => Promise<AccessTokenResponse>;
  verifyUserToken: (token: string) => Promise<UserVerificationResult>;
  logoutUser: (token: string) => Promise<void>;
  deleteUser: (login: string) => Promise<void>;
}


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
        password,
      }
    });
  }

  async loginTenant(email: string, password: string): Promise<AccessTokenResponse> {
    return await request.json<AccessTokenResponse>('/tenant/login', {
      baseUrl: this.baseUrl,
      method: 'POST',
      body: {
        email,
        password,
      }
    });
  }

  async verifyTenantToken(token: string): Promise<TenantVerificationResult> {
    return await request.json<TenantVerificationResult>('/tenant/verify', {
      baseUrl: this.baseUrl,
      method: 'POST',
      body: {
        token
      }
    });
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

  async createUser(data: UserData): Promise<UserRegistrationResult> {
    return await request.json<UserRegistrationResult>('/user', {
      baseUrl: this.baseUrl,
      method: 'POST',
      body: data,
      headers: {
        'authorization': `Bearer ${ this.tenantToken }`,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
    });
  }

  async deleteUser(login: string): Promise<void> {
    return await request.json<void>(`/user/${ login }`, {
      baseUrl: this.baseUrl,
      method: 'DELETE',
      headers: {
        'authorization': `Bearer: ${ this.tenantToken }`
      }
    });
  }

  async loginUser(data: UserLoginData): Promise<AccessTokenResponse> {
    return await request.json<AccessTokenResponse>('/auth', {
      baseUrl: this.baseUrl,
      method: 'POST',
      headers: {
        'authorization': `Bearer: ${ this.tenantToken }`
      },
      body: data
    });
  }

  async verifyUserToken(token: string): Promise<UserVerificationResult> {
    return await request.json<UserVerificationResult>('/auth/verify', {
      baseUrl: this.baseUrl,
      method: 'POST',
      headers: {
        'authorization': `Bearer: ${ this.tenantToken }`
      },
      body: { token }
    });
  }

  async logoutUser(token: string): Promise<void> {
    await request.json<string>('/auth/logout', {
      baseUrl: this.baseUrl,
      method: 'POST',
      headers: {
        'authorization': `Bearer: ${ this.tenantToken }`
      },
      body: { token }
    });
  }
}

const AuthClientType = Symbol('AuthClientInterface');
export { AuthClientType };