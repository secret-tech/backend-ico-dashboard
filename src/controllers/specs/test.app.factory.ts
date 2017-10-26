import {
  VerificationClient,
  VerificationClientType
} from '../../services/verify.client';

import { Response, Request, NextFunction } from 'express';

import {
  AuthClient,
  AuthClientType
} from '../../services/auth.client';

import * as express from 'express';
import * as TypeMoq from 'typemoq';
import { container } from '../../ioc.container';
import { InversifyExpressServer } from 'inversify-express-utils';
import * as bodyParser from 'body-parser';
import { Auth } from '../../middlewares/auth';
import handle from '../../middlewares/error.handler';
import { EmailService, EmailServiceInterface, EmailServiceType } from '../../services/email.service';

const mockEmailClient = () => {
  const emailMock = TypeMoq.Mock.ofType(EmailService);

  emailMock.setup(x => x.send(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<any> => {
      return {};
    });

  container.rebind<EmailServiceInterface>(EmailServiceType).toConstantValue(emailMock.object);
};

const mockAuthMiddleware = () => {
  const authMock = TypeMoq.Mock.ofType(AuthClient);

  const verifyTokenResult = {
    login: 'activated@test.com'
  };

  const verifyTokenResult2fa = {
    login: '2fa@test.com'
  };

  const loginResult = {
    accessToken: 'new_token'
  };

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('verified_token')))
    .returns(async(): Promise<any> => verifyTokenResult);

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('verified_token_2fa_user')))
    .returns(async(): Promise<any> => verifyTokenResult2fa);

  authMock.setup(x => x.createUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<any> => {
      return {};
    });

  authMock.setup(x => x.loginUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<any> => loginResult);

  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);

  const auth = new Auth(container.get<AuthClientInterface>(AuthClientType));
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

  const validationResultToEnable2fa: ValidationResult = {
    status: 200,
    data: {
      verificationId: 'activated_user_verification',
      consumer: 'activated@test.com',
      expiredOn: 123456
    }
  };

  const validationResultToDisable2fa: ValidationResult = {
    status: 200,
    data: {
      verificationId: '2fa_user_verification',
      consumer: '2fa@test.com',
      expiredOn: 123456
    }
  };

  verifyMock.setup(x => x.initiateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<InitiateResult> => initiateResult);

  verifyMock.setup(x => x.validateVerification('google_auth', 'activated_user_verification', TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResultToEnable2fa);

  verifyMock.setup(x => x.validateVerification('google_auth', '2fa_user_verification', TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResultToDisable2fa);

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

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
  return buildApp();
};

export const testAppForInitiateLogin = () => {
  const verifyMock = TypeMoq.Mock.ofType(VerificationClient);
  const authMock = TypeMoq.Mock.ofType(AuthClient);

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

  authMock.setup(x => x.loginUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<AccessTokenResponse> => loginResult);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
  return buildApp();
};

export const testAppForVerifyLogin = () => {
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

export const testAppForInvite = () => {
  mockAuthMiddleware();
  mockEmailClient();
  return buildApp();
};

export function testAppForResetPassword() {
  mockVerifyClient();
  const authMock = TypeMoq.Mock.ofType(AuthClient);

  const loginResult: AccessTokenResponse = {
    accessToken: 'token'
  };

  authMock.setup(x => x.loginUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<AccessTokenResponse> => loginResult);

  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
  return buildApp();
}
