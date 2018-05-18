import {
  VerificationClient,
  VerificationClientType
} from '../../services/verify.client';

import {
  Web3ClientInterface,
  Web3ClientType,
  Web3Client
} from '../../services/web3.client';

import {
  CoinpaymentsClient, CoinpaymentsClientType
} from '../../services/coinpayments/coinpayments.client';

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
import { EmailQueue, EmailQueueInterface, EmailQueueType } from '../../queues/email.queue';
import {
  ACTIVATE_USER_SCOPE,
  CHANGE_PASSWORD_SCOPE,
  DISABLE_2FA_SCOPE,
  ENABLE_2FA_SCOPE,
  LOGIN_USER_SCOPE,
  RESET_PASSWORD_SCOPE
} from '../../services/user.service';
import { INVEST_SCOPE } from '../dashboard.controller';
import { CoinpaymentsTransactionResult } from '../../entities/coinpayments.transaction.result';
import { JumioProvider } from '../../providers/kyc/jumio.provider';
import { KycProviderType } from '../../types';
import * as nock from 'nock';
import config from '../../config';
import { ShuftiproProvider } from '../../providers/kyc/shuftipro.provider';

const mockEmailQueue = () => {
  const emailMock = TypeMoq.Mock.ofType(EmailQueue);

  emailMock.setup(x => x.addJob(TypeMoq.It.isAny()))
    .returns((): any => null);

  container.rebind<EmailQueueInterface>(EmailQueueType).toConstantValue(emailMock.object);
};

const mockWeb3 = () => {
  const web3Mock = TypeMoq.Mock.ofType(Web3Client);

  web3Mock.setup(x => x.sendTransactionByMnemonic(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => 'transactionHash');

  web3Mock.setup(x => x.sendTransactionByPrivateKey(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => 'transactionHash');

  web3Mock.setup(x => x.getTokenEthPrice())
    .returns(async(): Promise<number> => 200);

  web3Mock.setup(x => x.getEthBalance(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '1.0001');

  web3Mock.setup(x => x.getTokenBalanceOf(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '500.00012345678912345');

  web3Mock.setup(x => x.getEthCollected(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '2000');

  web3Mock.setup(x => x.getSoldIcoTokens(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '5000');

  web3Mock.setup(x => x.sufficientBalance(TypeMoq.It.isAny()))
    .returns(async(): Promise<boolean> => true);

  web3Mock.setup(x => x.isAllowed(TypeMoq.It.isAny()))
    .returns(async(): Promise<boolean> => true);

  const generatedAccount = {
    address: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
    privateKey: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA'
  };

  web3Mock.setup(x => x.getAccountByMnemonicAndSalt(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns((): any => generatedAccount);

  web3Mock.setup(x => x.generateMnemonic())
    .returns((): string => 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit');

  container.rebind<Web3ClientInterface>(Web3ClientType).toConstantValue(web3Mock.object);
};

const mockWeb3Client = () => {
  const web3Mock = TypeMoq.Mock.ofType(Web3Client);

  web3Mock.setup(x => x.sendTransactionByMnemonic(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => 'transactionHash');

  web3Mock.setup(x => x.sendTransactionByPrivateKey(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => 'transactionHash');

  web3Mock.setup(x => x.getTokenEthPrice())
    .returns(async(): Promise<number> => 200);

  web3Mock.setup(x => x.getEthBalance(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '0.1');

  web3Mock.setup(x => x.getTokenBalanceOf(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '500.00012345678912345');

  web3Mock.setup(x => x.getEthCollected(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '2000');

  web3Mock.setup(x => x.getSoldIcoTokens(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '5000');

  web3Mock.setup(x => x.sufficientBalance(TypeMoq.It.isAny()))
    .returns(async(): Promise<boolean> => true);

  web3Mock.setup(x => x.isAllowed(TypeMoq.It.isAny()))
    .returns(async(): Promise<boolean> => true);

  const generatedAccount = {
    address: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
    privateKey: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA'
  };

  web3Mock.setup(x => x.getAccountByMnemonicAndSalt(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns((): any => generatedAccount);

  web3Mock.setup(x => x.generateMnemonic())
    .returns((): string => 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit');

  container.rebind<Web3ClientInterface>(Web3ClientType).toConstantValue(web3Mock.object);
};

const mockWeb3WithOldContracts = () => {
  const web3Mock = TypeMoq.Mock.ofType(Web3Client);

  web3Mock.setup(x => x.sendTransactionByMnemonic(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => 'transactionHash');

  web3Mock.setup(x => x.getTokenEthPrice())
    .returns(async(): Promise<number> => 200);

  web3Mock.setup(x => x.getEthBalance(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '1.0001');

  web3Mock.setup(x => x.getTokenBalanceOf(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '500.00012345678912345');

  web3Mock.setup(x => x.getEthCollected(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '6000');

  web3Mock.setup(x => x.getSoldIcoTokens(TypeMoq.It.isAny()))
    .returns(async(): Promise<string> => '15000');

  web3Mock.setup(x => x.sufficientBalance(TypeMoq.It.isAny()))
    .returns(async(): Promise<boolean> => true);

  web3Mock.setup(x => x.isAllowed(TypeMoq.It.isAny()))
    .returns(async(): Promise<boolean> => true);

  const generatedAccount = {
    address: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
    privateKey: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA'
  };

  web3Mock.setup(x => x.getAccountByMnemonicAndSalt(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns((): any => generatedAccount);

  web3Mock.setup(x => x.generateMnemonic())
    .returns((): string => 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit');

  container.rebind<Web3ClientInterface>(Web3ClientType).toConstantValue(web3Mock.object);
};

const mockAuthMiddleware = () => {
  const authMock = TypeMoq.Mock.ofType(AuthClient);

  const verifyTokenResult = {
    login: 'activated@test.com'
  };

  const verifyTokenResultShuftipro = {
    login: 'activated_shuftipro@test.com'
  };

  const verifyTokenResult2fa = {
    login: '2fa@test.com'
  };

  const verifyTokenResultKycVerified = {
    login: 'kyc.verified@test.com'
  };

  const verifyTokenResultKycVerifiedShuftipro = {
    login: 'kyc.verified_shuftipro@test.com'
  };

  const verifyTokenResultKycFailed3 = {
    login: 'kyc.failed3@test.com'
  };

  const verifyTokenResultKycFailed3Shuftipro = {
    login: 'kyc.failed3_shuftipro@test.com'
  };

  const loginResult = {
    accessToken: 'new_token'
  };

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('verified_token')))
    .returns(async(): Promise<any> => verifyTokenResult);

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('verified_token_shuftipro')))
    .returns(async(): Promise<any> => verifyTokenResultShuftipro);

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('verified_token_2fa_user')))
    .returns(async(): Promise<any> => verifyTokenResult2fa);

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('kyc_verified_token')))
    .returns(async(): Promise<any> => verifyTokenResultKycVerified);

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('kyc_verified_token_shuftipro')))
    .returns(async(): Promise<any> => verifyTokenResultKycVerifiedShuftipro);

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('kyc_3_failed_token')))
    .returns(async(): Promise<any> => verifyTokenResultKycFailed3);

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('kyc_3_failed_token_shuftipro')))
    .returns(async(): Promise<any> => verifyTokenResultKycFailed3Shuftipro);

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

const mockCoinpaymentsClient = () => {
  const cpMock = TypeMoq.Mock.ofType(CoinpaymentsClient);

  const currenciesResult = require('../../../test/fixtures/coinpayments/rates.json');

  const transactionResult = CoinpaymentsTransactionResult.createCoinpaymentsTransactionResult({
    currency1: 'ETH',
    currency2: 'LTCT',
    amount: '0.5',
    txn_id: 'd17a8ee84b1de669bdd0f15b38f20a7e9781d569d20c096e49983ad9ad40ce4c',
    address: 'PVS1Xo3xCU2MyXHadU2EbhFZCbnyjZHBjx',
    confirms_needed: '5',
    timeout: 5400,
    status_url: 'https://www.coinpayments.net/index.php?cmd=status&id=d17a8ee84b1de669bdd0f15b38f',
    qrcode_url: 'https://www.coinpayments.net/qrgen.php?id=CPBF4COHLYGEZZYIGFDKFY9NDP&key=90e5561c1e8cd4452069f7726d3e0370'
  });

  cpMock.setup(x => x.rates(TypeMoq.It.isAny())).returns(async(): Promise<any> => currenciesResult);
  cpMock.setup(x => x.createTransaction(TypeMoq.It.isAny())).returns(async(): Promise<CoinpaymentsTransactionResult> => transactionResult);

  container.rebind<CoinpaymentsClientInterface>(CoinpaymentsClientType).toConstantValue(cpMock.object);
};

const mockVerifyClient = () => {
  const verifyMock = TypeMoq.Mock.ofInstance(container.get<VerificationClientInterface>(VerificationClientType));
  verifyMock.callBase = true;

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
      verificationId: 'enable_2fa_verification',
      consumer: 'activated@test.com',
      expiredOn: 123456,
      attempts: 0,
      payload: {
        scope: ENABLE_2FA_SCOPE
      }
    }
  };

  const validationResultToDisable2fa: ValidationResult = {
    status: 200,
    data: {
      verificationId: 'disable_2fa_verification',
      consumer: '2fa@test.com',
      expiredOn: 123456,
      attempts: 0,
      payload: {
        scope: DISABLE_2FA_SCOPE
      }
    }
  };

  const validationResultToVerifyInvestment: ValidationResult = {
    status: 200,
    data: {
      verificationId: 'verify_invest',
      consumer: 'activated@test.com',
      expiredOn: 123456,
      attempts: 0,
      payload: {
        scope: INVEST_SCOPE,
        ethAmount: '1'
      }
    }
  };

  const validationResultChangePassword: ValidationResult = {
    status: 200,
    data: {
      verificationId: 'change_password_verification',
      consumer: 'activated@test.com',
      expiredOn: 123456,
      attempts: 0,
      payload: {
        scope: CHANGE_PASSWORD_SCOPE
      }
    }
  };

  const validationResultResetPassword: ValidationResult = {
    status: 200,
    data: {
      verificationId: 'reset_password_verification',
      consumer: 'activated@test.com',
      expiredOn: 123456,
      attempts: 0,
      payload: {
        scope: RESET_PASSWORD_SCOPE
      }
    }
  };

  const validationResultActivateUser: ValidationResult = {
    status: 200,
    data: {
      verificationId: 'activated_user_verification',
      consumer: 'existing@test.com',
      expiredOn: 123456,
      attempts: 0,
      payload: {
        scope: ACTIVATE_USER_SCOPE
      }
    }
  };

  const validationResultVerifyLogin: ValidationResult = {
    status: 200,
    data: {
      verificationId: 'verify_login_verification',
      consumer: 'activated@test.com',
      expiredOn: 123456,
      attempts: 0,
      payload: {
        scope: LOGIN_USER_SCOPE
      }
    }
  };

  verifyMock.setup(x => x.initiateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<InitiateResult> => initiateResult);

  verifyMock.setup(x => x.validateVerification('google_auth', 'enable_2fa_verification', TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResultToEnable2fa);

  verifyMock.setup(x => x.getVerification('google_auth', 'enable_2fa_verification'))
    .returns(async(): Promise<ValidationResult> => validationResultToEnable2fa);

  verifyMock.setup(x => x.validateVerification('google_auth', 'disable_2fa_verification', TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResultToDisable2fa);

  verifyMock.setup(x => x.getVerification('google_auth', 'disable_2fa_verification'))
    .returns(async(): Promise<ValidationResult> => validationResultToDisable2fa);

  verifyMock.setup(x => x.validateVerification('email', 'verify_invest', TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResultToVerifyInvestment);

  verifyMock.setup(x => x.getVerification('email', 'verify_invest'))
    .returns(async(): Promise<ValidationResult> => validationResultToVerifyInvestment);

  verifyMock.setup(x => x.validateVerification('email', 'change_password_verification', TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResultChangePassword);

  verifyMock.setup(x => x.getVerification('email', 'change_password_verification'))
    .returns(async(): Promise<ValidationResult> => validationResultChangePassword);

  verifyMock.setup(x => x.validateVerification('email', 'reset_password_verification', TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResultResetPassword);

  verifyMock.setup(x => x.getVerification('email', 'reset_password_verification'))
    .returns(async(): Promise<ValidationResult> => validationResultResetPassword);

  verifyMock.setup(x => x.validateVerification('email', 'activate_user_verification', TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResultActivateUser);

  verifyMock.setup(x => x.getVerification('email', 'activate_user_verification'))
    .returns(async(): Promise<ValidationResult> => validationResultActivateUser);

  verifyMock.setup(x => x.validateVerification('email', 'verify_login_verification', TypeMoq.It.isAny()))
    .returns(async(): Promise<ValidationResult> => validationResultVerifyLogin);

  verifyMock.setup(x => x.getVerification('email', 'verify_login_verification'))
    .returns(async(): Promise<ValidationResult> => validationResultVerifyLogin);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
};

export const buildApp = () => {
  const newApp = express();
  newApp.use(bodyParser.json());
  newApp.use(bodyParser.urlencoded({ extended: false }));

  const server = new InversifyExpressServer(container, null, null, newApp);
  server.setErrorConfig((app) => {
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.status(404).send({
        statusCode: 404,
        error: 'Route is not found'
      });
    });

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => handle(err, req, res, next));
  });

  return server.build();
};

export const testAppForSuccessRegistrationWithJumioProvider = () => {
  container.rebind<KycProviderInterface>(KycProviderType).toConstantValue(new JumioProvider(container.get(Web3ClientType)));

  const jumioEndpoint = nock(config.kyc.jumio.baseUrl)
    .post('/').reply(200, {
      timestamp: '2017-11-09T06:47:31.467Z',
      authorizationToken: 'c87447f8-fa43-4f98-a933-3c88be4e86ea',
      clientRedirectUrl: 'https://lon.netverify.com/widget/jumio-verify/2.0/form?authorizationToken=c87447f8-fa43-4f98-a933-3c88be4e86ea',
      jumioIdScanReference: '7b58a08e-19cf-4d28-a828-4bb577c6f69a'
    });

  mockWeb3();

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
      expiredOn: 123456,
      attempts: 0
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

export const testAppForSuccessRegistrationWithShuftiproProvider = () => {
  container.rebind<KycProviderInterface>(KycProviderType).toConstantValue(new ShuftiproProvider(container.get(Web3ClientType)));

  const shuftiProEndpoint = nock(config.kyc.shuftipro.baseUrl)
  .post('/')
  .reply(200, {
    message: 'message',
    reference: '59f07e23b41f6373f64a8dcb',
    signature: '149678856aa4b314fb5ff23aa9c746518b1e753932851fe530a0abb79c2f2e0a',
    status_code: 'SP2'
  });

  mockWeb3();

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
      expiredOn: 123456,
      attempts: 0
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
  mockEmailQueue();

  const authMock = TypeMoq.Mock.ofType(AuthClient);

  const verifyTokenResultNotVerified = {
    login: 'activated@test.com'
  };

  authMock.setup(x => x.verifyUserToken(TypeMoq.It.isValue('not_verified_token')))
    .returns(async(): Promise<any> => verifyTokenResultNotVerified);

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
  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
  return buildApp();
};

export const testAppForUserMe = () => {
  mockAuthMiddleware();
  return buildApp();
};

export const testAppForDashboardWithJumioProvider = () => {
  process.env.KYC_PROVIDER = 'JUMIO';
  config.contracts.ico.oldAddresses = [];
  container.rebind<KycProviderInterface>(KycProviderType).toConstantValue(new JumioProvider(container.get(Web3ClientType)));

  const jumioEndpoint = nock(config.kyc.jumio.baseUrl)
    .post('/').reply(200, {
      timestamp: '2017-11-09T06:47:31.467Z',
      authorizationToken: 'c87447f8-fa43-4f98-a933-3c88be4e86ea',
      clientRedirectUrl: 'https://lon.netverify.com/widget/jumio-verify/2.0/form?authorizationToken=c87447f8-fa43-4f98-a933-3c88be4e86ea',
      jumioIdScanReference: '7b58a08e-19cf-4d28-a828-4bb577c6f69a'
    });

  mockAuthMiddleware();
  mockVerifyClient();
  mockWeb3();
  mockCoinpaymentsClient();
  return buildApp();
};

export const testAppForDashboardWithShuftiproProvider = () => {
  process.env.KYC_PROVIDER = 'SHUFTIPRO';
  config.contracts.ico.oldAddresses = [];

  nock.cleanAll();
  const shuftiProEndpoint = nock(config.kyc.shuftipro.baseUrl)
  .post('/').times(4)
  .reply(200, {
    message: 'message',
    reference: '59f07e23b41f6373f64a8dcb',
    signature: '149678856aa4b314fb5ff23aa9c746518b1e753932851fe530a0abb79c2f2e0a',
    status_code: 'SP2'
  })
  .post('/status')
  .reply(200, {
    message: 'message',
    reference: '59f07e23b41f6373f64a8dcb',
    signature: 'eeccb1dab308e5bdbe1bb80a325eb7790d099cf8c766437b98ee8a24d29be774',
    status_code: 'SP25'
  });

  mockAuthMiddleware();
  mockVerifyClient();
  mockWeb3();
  mockCoinpaymentsClient();

  container.rebind<KycProviderInterface>(KycProviderType).toConstantValue(new ShuftiproProvider(container.get(Web3ClientType)));

  return buildApp();
};

export const testAppForDashboardWithOldSmartContracts = () => {
  config.contracts.ico.oldAddresses = ['0x7672210729e053B2462D39CF3746A5d19B405aAD','0x7672210729e053B2462D39CF3746A5d19B405aAD','0x7672210729e053B2462D39CF3746A5d19B405aAD'];
  process.env.KYC_PROVIDER = 'JUMIO';
  config.contracts.ico.oldAddresses = [];
  container.rebind<KycProviderInterface>(KycProviderType).toConstantValue(new JumioProvider(container.get(Web3ClientType)));

  const jumioEndpoint = nock(config.kyc.jumio.baseUrl)
    .post('/').reply(200, {
      timestamp: '2017-11-09T06:47:31.467Z',
      authorizationToken: 'c87447f8-fa43-4f98-a933-3c88be4e86ea',
      clientRedirectUrl: 'https://lon.netverify.com/widget/jumio-verify/2.0/form?authorizationToken=c87447f8-fa43-4f98-a933-3c88be4e86ea',
      jumioIdScanReference: '7b58a08e-19cf-4d28-a828-4bb577c6f69a'
    });

  mockAuthMiddleware();
  mockVerifyClient();
  mockWeb3WithOldContracts();
  mockCoinpaymentsClient();
  return buildApp();
};

export const testAppForChangePassword = () => {
  mockAuthMiddleware();
  mockVerifyClient();
  return buildApp();
};

export const testAppForInvite = () => {
  mockAuthMiddleware();
  mockEmailQueue();
  return buildApp();
};

export function testAppForResetPassword() {
  mockVerifyClient();
  const authMock = TypeMoq.Mock.ofType(AuthClient);

  authMock.setup(x => x.createUser(TypeMoq.It.isAny()))
    .returns(async(): Promise<any> => null);

  container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
  return buildApp();
}

export function testAppForResendVerification() {
  const verifyMock = TypeMoq.Mock.ofType(VerificationClient);

  const initiateResult: InitiateResult = {
    status: 200,
    verificationId: '123',
    attempts: 0,
    expiredOn: 124545,
    method: 'email'
  };

  verifyMock.setup(x => x.resendVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
    .returns(async(): Promise<InitiateResult> => initiateResult);

  container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);

  return buildApp();
}

export function testAppForSuccessSendTransactionByPrivateKey() {
  mockWeb3Client();

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
      expiredOn: 123456,
      attempts: 0
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
}

export function testAppForDashboardAfterActivationUser() {
  mockAuthMiddleware();
  mockVerifyClient();
  mockWeb3Client();
  mockCoinpaymentsClient();
  return buildApp();
}
