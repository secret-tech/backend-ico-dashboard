import { StorageService, StorageServiceType } from './storage.service';
import { AuthClientInterface, AuthClientType } from './auth.client';
import { VerificationClientInterface, VerificationClientType, InitiateResult } from './verify.client';
import { Web3ClientType, Web3ClientInterface } from './web3.client';
import * as uuid from 'node-uuid';
import * as bcrypt from 'bcrypt-nodejs';
import { injectable, inject } from 'inversify';
import 'reflect-metadata';

interface UserData {
  email: string,
  name: string,
  agreeTos: boolean,
  referral?: string
}

interface InputUserData extends UserData {
  password: string
}

interface Wallet {
  ticker: string,
  address: string,
  balance: string
}

interface CreatedUserData extends UserData {
  id: string,
  verification: {
    id: string,
    method: string
  },
  wallets: Array<Wallet>,
  verificationRequired: boolean,
  defaultVerificationMethod: string,
  barCode?: string
}

interface InitiateLoginResult {
  accessToken: string,
  isVerified: boolean,
  verification: InitiateResult
}

interface ValidateLoginResult extends InitiateLoginResult {

}

interface ActivationUserData {
  email: string,
  verificationId: string,
  code: string
}

interface ActivationResult {
  accessToken: string
}

interface InitiateLoginInput {
  login: string,
  password: string
}

interface ValidateLoginInput {
  accessToken: string,
  verification: {
    id: string,
    code: string,
    method: string
  }
}

export interface UserServiceInterface {
  create: (userData: InputUserData) => Promise<any>;
  activate: (activationData: ActivationUserData) => Promise<ActivationResult>;
  initiateLogin: (inputData: InitiateLoginInput) => Promise<InitiateLoginResult>;
  validateLogin: (inputData: ValidateLoginInput) => Promise<ValidateLoginResult>;
  getKey: (tenant: string, login: string) => string;
}

/**
 * UserService
 */
@injectable()
export class UserService implements UserServiceInterface {
  /**
   * constructor
   *
   * @param  storageService  redis client
   * @param  authClient  auth service client
   * @param  verificationClient  verification service client
   * @param  web3Client web3 service client
   */
  constructor(
    @inject(StorageServiceType) private storageService: StorageService,
    @inject(AuthClientType) private authClient: AuthClientInterface,
    @inject(VerificationClientType) private verificationClient: VerificationClientInterface,
    @inject(Web3ClientType) private web3Client: Web3ClientInterface
  ) { }

  /**
   * Save user's data
   *
   * @param userData user info
   * @return promise
   */
  async create(userData: InputUserData): Promise<CreatedUserData> {
    const { email, name, password, agreeTos, referral } = userData;
    const verificationMethod = 'email';

    const verification = await this.verificationClient.initiateVerification(verificationMethod, {
      consumer: email,
      template: {
        body: 'Your code: {{{CODE}}}',
      },
      generateCode: {
        length: 6,
        symbolSet: [
          'DIGITS'
        ]
      },
      policy: {
        expiredOn: '24:00:00'
      }
    });

    const address = this.web3Client.createAccount().address;

    const passwordHash: string = bcrypt.hashSync(password);
    const key: string = this.getKey(email);
    const data = {
      id: uuid.v4(),
      email,
      name,
      agreeTos,
      passwordHash,
      verification: {
        id: verification.verificationId,
        method: 'email'
      },
      wallets: [
        {
          ticker: 'ETH',
          address: address,
          balance: '0'
        }
      ],
      verificationRequired: true,
      defaultVerificationMethod: 'email',
      referral
    };

    await this.authClient.createUser({
      email: email,
      login: email,
      password: passwordHash,
      sub: verification.verificationId
    });

    await this.storageService.set(key, JSON.stringify(data));
    delete data.passwordHash;
    return data;
  }

  /**
   * Save user's data
   *
   * @param loginData user info
   * @return promise
   */
  async initiateLogin(loginData: InitiateLoginInput): Promise<InitiateLoginResult> {
    const user = await this.getUser(loginData.login);

    const passwordMatch = bcrypt.compareSync(loginData.password, user.passwordHash);

    if (!passwordMatch) {
      throw Error('Incorrect password');
    }

    const tokenData = await this.authClient.loginUser({
      login: user.email,
      password: user.passwordHash,
      deviceId: 'device'
    });

    const verificationData = await this.verificationClient.initiateVerification(
      user.defaultVerificationMethod,
      {
        consumer: user.email,
        template: {
          body: 'Your login code is {{{CODE}}}'
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS'],
        },
        policy: {
          expiredOn: '00:05:00'
        }
      }
    );

    const resultingData = {
      accessToken: tokenData.accessToken,
      isVerified: false,
      verification: verificationData
    };

    this.storageService.set(`token: ${ tokenData.accessToken }`, JSON.stringify(resultingData));
    return resultingData;
  }

  /**
   * Validate login
   *
   * @param inputData user info
   * @return promise
   */
  async validateLogin(inputData: ValidateLoginInput): Promise<ValidateLoginResult> {
    const tokenDataStr = await this.storageService.get(`token: ${ inputData.accessToken }`);

    if (!tokenDataStr) {
      throw Error('Token is not found');
    }

    const tokenData = JSON.parse(tokenDataStr);

    if (tokenData.verification.verificationId !== inputData.verification.id) {
      throw Error('Invalid verification id');
    }

    await this.verificationClient.validateVerification(
      inputData.verification.method,
      inputData.verification.id,
      inputData.verification.code
    );

    tokenData.isVerified = true;

    await this.storageService.set(`token: ${ tokenData.accessToken }`, JSON.stringify(tokenData));

    return tokenData;
  }

  async activate(activationData: ActivationUserData): Promise<ActivationResult> {
    const user = await this.getUser(activationData.email);

    if (!user.verificationRequired) {
      throw Error('User is activated already');
    }

    if (activationData.verificationId !== user.verification.id) {
      throw Error('Incorrect verification id');
    }

    await this.verificationClient.validateVerification(
      user.verification.method,
      activationData.verificationId,
      activationData.code
    );

    user.verificationRequired = false;
    await this.storageService.set(this.getKey(user.email), JSON.stringify(user));

    return await this.authClient.loginUser({
      login: user.email,
      password: user.passwordHash,
      deviceId: 'device'
    });
  }

  /**
   * Return user's data
   *
   * @param  email
   * @return promise
   */
  async getUser(email: string): Promise<any> {
    const userStr = await this.storageService.get(this.getKey(email));

    if (!userStr) {
      throw Error('User is not found');
    }

    return JSON.parse(userStr);
  }

  getKey(email: string) {
    return `user:${ email }`;
  }

}

const UserServiceType = Symbol('UserServiceInterface');
export { UserServiceType };
