import {
  VerificationClient,
  VerificationClientType
} from '../../services/verify.client';

import { Response, Request, NextFunction } from 'express';

import {
  StorageServiceType,
  StorageService,
  RedisService
} from '../../services/storage.service';

import {
  AuthClient,
  AuthClientType,
} from '../../services/auth.client';

import * as express from 'express';
import * as TypeMoq from 'typemoq';
import { container } from '../../ioc.container';
import { InversifyExpressServer } from 'inversify-express-utils';
import * as bodyParser from 'body-parser';
import * as bcrypt from 'bcrypt-nodejs';
import { Auth } from '../../middlewares/auth';
import handle from '../../middlewares/error.handler';

const mockAuthMiddleware = () => {
  const storageMock = TypeMoq.Mock.ofType(RedisService);
  const authMock = TypeMoq.Mock.ofType(AuthClient);

  const getTokenResult = {
    accessToken: 'valid_token',
    isVerified: true,
    verification: {
      status: 200,
      verificationId: '123',
      attempts: 0,
      expiredOn: 124545,
      method: 'email'
    }
  };

  const verifyTokenResult = {
    login: 'existing@test.com'
  };

  const getUserResult = {
    id: 'id',
    email: 'existing@test.com',
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
    referral: 'referral@test.com',
    kycStatus: 'Not verified'
  };

  const loginResult = {
    accessToken: 'new_token'
  };

  storageMock.setup(x => x.getToken(TypeMoq.It.isValue('valid_token')))
    .returns(async(): Promise<any> => getTokenResult);

  storageMock.setup(x => x.getUser(TypeMoq.It.isValue('existing@test.com')))
    .returns(async(): Promise<any> => getUserResult);

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('valid_token')))
    .returns(async(): Promise<any> => verifyTokenResult);

  authMock.setup(x => x.createUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<any> => {
      return {};
    });

  authMock.setup(x => x.createUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<any> => {
      return {};
    });

  authMock.setup(x => x.loginUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<any> => loginResult);

  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
  container.rebind<StorageService>(StorageServiceType).toConstantValue(storageMock.object);

  const auth = new Auth(container.get<AuthClientInterface>(AuthClientType), container.get<StorageService>(StorageServiceType));
  container.rebind<express.RequestHandler>('AuthMiddleware').toConstantValue(
    (req: any, res: any, next: any) => auth.authenticate(req, res, next)
  );
};

const mockVerifyClient = () => {
  const verifyMock = TypeMoq.Mock.ofType(VerificationClient);

  const initiateResult: InitiateResult = {
    status: 200,
    verificationId: '123',
    attempts: 0,
    expiredOn: 124545,
    method: 'email'
  };

  verifyMock.setup(x => x.initiateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<InitiateResult> => initiateResult);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
};

const buildApp = () => {
  const newApp = express();
  newApp.use(bodyParser.json());
  newApp.use(bodyParser.urlencoded({ extended: false }));

  const server = new InversifyExpressServer(container, null, null, newApp);
  server.setErrorConfig((app) => {
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => handle(err, req, res, next));
  });

  return server.build();
};

export const testAppForSuccessRegistration = () => {
  const verifyMock = TypeMoq.Mock.ofType(VerificationClient);
  const authMock = TypeMoq.Mock.ofType(AuthClient);
  const storageMock = TypeMoq.Mock.ofType(RedisService);

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
    sub: 'sub'
  };

  const loginResult: AccessTokenResponse = {
    accessToken: 'token'
  };

  verifyMock.setup(x => x.initiateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<InitiateResult> => initiateResult);

  verifyMock.setup(x => x.validateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResult);

  authMock.setup(x => x.createUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<UserRegistrationResult> => registrationResult);

  authMock.setup(x => x.loginUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<AccessTokenResponse> => loginResult);

  storageMock.setup(x => x.getUser(TypeMoq.It.isValue('test@test.com')))
    .returns(async(): Promise<any> => null);

  const existingUser = {
    id: 'id',
    email: 'existing@test.com',
    name: 'ICO investor',
    agreeTos: true,
    passwordHash: bcrypt.hashSync('passwordA1'),
    verification: {
      id: '123',
      method: 'email'
    },
    wallets: [
      {
        ticker: 'ETH',
        address: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
        balance: '0'
      }
    ],
    isVerified: false,
    defaultVerificationMethod: 'email',
    referral: null
  };

  storageMock.setup(x => x.getUser(TypeMoq.It.isValue('existing@test.com')))
    .returns(async(): Promise<any> => existingUser);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
  container.rebind<StorageService>(StorageServiceType).toConstantValue(storageMock.object);

  return buildApp();
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
    method: 'email'
  };

  const loginResult: AccessTokenResponse = {
    accessToken: 'token'
  };

  verifyMock.setup(x => x.initiateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<InitiateResult> => initiateResult);

  storageMock.setup(x => x.getUser(TypeMoq.It.isValue('test@test.com')))
    .returns(async(): Promise<any> => getUserResult);

  storageMock.setup(x => x.getUser(TypeMoq.It.isValue('test123@test.com')))
    .returns(async(): Promise<any> => null);

  authMock.setup(x => x.loginUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<AccessTokenResponse> => loginResult);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
  container.rebind<StorageService>(StorageServiceType).toConstantValue(storageMock.object);

  return buildApp();
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
      method: 'email'
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
    .returns(async(): Promise<InitiateResult> => initiateResult);

  storageMock.setup(x => x.getToken(TypeMoq.It.isAny()))
    .returns(async(): Promise<any> => getTokenResult);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
  container.rebind<StorageService>(StorageServiceType).toConstantValue(storageMock.object);

  return buildApp();
};

export const testAppForUserMe = () => {
  mockAuthMiddleware();
  return buildApp();
};

export const testAppForDashboard = () => {
  mockAuthMiddleware();
  return buildApp();
};

export const testAppForChangePassword = () => {
  mockAuthMiddleware();
  mockVerifyClient();
  return buildApp();
};

export function testAppForResetPassword() {
  const storageMock = TypeMoq.Mock.ofType(RedisService);

  const getUserResult = {
    id: 'id',
    email: 'ortgma@gmail.com',
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
    referral: 'referral@test.com',
    kycStatus: 'Not verified'
  };

  storageMock.setup(x => x.getUser(TypeMoq.It.isValue('ortgma@gmail.com')))
    .returns(async(): Promise<any> => getUserResult);

  container.rebind<StorageService>(StorageServiceType).toConstantValue(storageMock.object);

  return buildApp();
}
