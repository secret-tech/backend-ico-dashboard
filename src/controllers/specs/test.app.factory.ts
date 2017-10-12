import {
  InitiateResult,
  VerificationClient,
  VerificationClientInterface,
  VerificationClientType,
  ValidationResult
} from '../../services/verify.client';

import {
  StorageServiceType,
  StorageService,
  RedisService
} from '../../services/storage.service';

import {
  AuthClient,
  AuthClientInterface,
  AuthClientType,
  UserRegistrationResult,
  AccessTokenResponse
} from "../../services/auth.client";

import {
  CreateAccountResult,
  Web3Client,
  Web3ClientInterface,
  Web3ClientType
} from "../../services/web3.client";

import * as express from 'express';
import * as TypeMoq from 'typemoq';
import { container } from '../../ioc.container';
import { InversifyExpressServer } from 'inversify-express-utils';
import * as bodyParser from 'body-parser';
import * as bcrypt from 'bcrypt-nodejs';

export const testAppWithVerifyAuthWeb3Mock = () => {
  const verifyMock = TypeMoq.Mock.ofType(VerificationClient);
  const authMock = TypeMoq.Mock.ofType(AuthClient);

  const initiateResult: InitiateResult = {
    status: 200,
    verificationId: '123',
    attempts: 0,
    expiredOn: 124545,
    method: 'email'
  };

  const validationResult: ValidationResult = {
    status: 200,
    data: {
      verificationId: '123',
      consumer: 'test@test.com',
      expiredOn: 123456
    }
  };

  const registrationResult: UserRegistrationResult = {
    id: 'id',
    email: 'test@test.com',
    login: 'test@test.com',
    tenant: 'tenant',
    sub: 'sub',
  };

  const loginResult: AccessTokenResponse = {
    accessToken: 'token'
  };

  verifyMock.setup(x => x.initiateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async (): Promise<InitiateResult> => initiateResult);

  verifyMock.setup(x => x.validateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async (): Promise<ValidationResult> => validationResult);

  authMock.setup(x => x.createUser(TypeMoq.It.isAny()))
    .returns(async (): Promise<UserRegistrationResult> => registrationResult);

  authMock.setup(x => x.loginUser(TypeMoq.It.isAny()))
    .returns(async (): Promise<AccessTokenResponse> => loginResult);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);

  const newApp = express();
  newApp.use(bodyParser.json());
  newApp.use(bodyParser.urlencoded({ extended: false }));

  return new InversifyExpressServer(container, null, null, newApp).build();
};

export const testAppForInitiateLogin = () => {
  const verifyMock = TypeMoq.Mock.ofType(VerificationClient);
  const authMock = TypeMoq.Mock.ofType(AuthClient);
  const storageMock = TypeMoq.Mock.ofType(RedisService);

  const getUserResult = {
    id: 'id',
    email: 'test@test.com',
    name: 'ICO investor',
    agreeTos: true,
    passwordHash: bcrypt.hashSync('passwordA1'),
    verification: {
      id: 'id',
      method: 'email'
    },
    wallets: [
      {
        ticker: 'ETH',
        address: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
        balance: '0'
      }
    ],
    isVerified: true,
    defaultVerificationMethod: 'email',
    referral: 'referral@test.com'
  };

  const initiateResult: InitiateResult = {
    status: 200,
    verificationId: '123',
    attempts: 0,
    expiredOn: 124545,
    method: 'email',
  };

  const loginResult: AccessTokenResponse = {
    accessToken: 'token'
  };

  verifyMock.setup(x => x.initiateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async (): Promise<InitiateResult> => initiateResult);

  storageMock.setup(x => x.getUser(TypeMoq.It.isValue('test@test.com')))
    .returns(async (): Promise<any> => getUserResult);

  authMock.setup(x => x.loginUser(TypeMoq.It.isAny()))
    .returns(async (): Promise<AccessTokenResponse> => loginResult);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
  container.rebind<StorageService>(StorageServiceType).toConstantValue(storageMock.object);

  const newApp = express();
  newApp.use(bodyParser.json());
  newApp.use(bodyParser.urlencoded({ extended: false }));

  return new InversifyExpressServer(container, null, null, newApp).build();
};

export const testAppForVerifyLogin = () => {
  const verifyMock = TypeMoq.Mock.ofType(VerificationClient);
  const storageMock = TypeMoq.Mock.ofType(RedisService);

  const getTokenResult = {
    accessToken: 'token',
    isVerified: false,
    verification: {
      status: 200,
      verificationId: '123',
      attempts: 0,
      expiredOn: 124545,
      method: 'email',
    }
  };

  const initiateResult: InitiateResult = {
    status: 200,
    verificationId: '123',
    attempts: 0,
    expiredOn: 124545,
    method: 'email'
  };

  verifyMock.setup(x => x.initiateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async (): Promise<InitiateResult> => initiateResult);

  storageMock.setup(x => x.getToken(TypeMoq.It.isAny()))
    .returns(async (): Promise<any> => getTokenResult);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
  container.rebind<StorageService>(StorageServiceType).toConstantValue(storageMock.object);

  const newApp = express();
  newApp.use(bodyParser.json());
  newApp.use(bodyParser.urlencoded({ extended: false }));

  return new InversifyExpressServer(container, null, null, newApp).build();
};
