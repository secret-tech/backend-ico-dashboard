import { Container } from 'inversify';
import { StorageServiceType, StorageService, RedisService } from './services/storage.service';
import { UserController } from './controllers/user.controller';
import { interfaces, TYPE } from 'inversify-express-utils';
import { UserService, UserServiceInterface, UserServiceType } from './services/user.service';
import { AuthClientInterface, AuthClientType, AuthClient } from './services/auth.client';
import { VerificationClientInterface, VerificationClientType, VerificationClient } from './services/verify.client';
import { Web3ClientInterface, Web3ClientType, Web3Client } from './services/web3.client';
import { Auth } from './middlewares/auth';
import config from './config';
import * as express from 'express';
import * as validation from './middlewares/request.validation';

let container = new Container();

// services
container.bind<StorageService>(StorageServiceType).to(RedisService);
container.bind<UserServiceInterface>(UserServiceType).to(UserService);
container.bind<AuthClientInterface>(AuthClientType).toConstantValue(new AuthClient('http://auth:3000'));
container.bind<VerificationClientInterface>(VerificationClientType).toConstantValue(new VerificationClient('http://verify:3000'));
container.bind<Web3ClientInterface>(Web3ClientType).to(Web3Client);

// middlewares
container.bind<express.RequestHandler>('CreateUserValidation').toConstantValue(
  (req: any, res: any, next: any) => validation.createUser(req, res, next)
);
container.bind<express.RequestHandler>('ActivateUserValidation').toConstantValue(
  (req: any, res: any, next: any) => validation.activateUser(req, res, next)
);
container.bind<express.RequestHandler>('CreateTenantValidation').toConstantValue(
  (req: any, res: any, next: any) => validation.createTenant(req, res, next)
);
container.bind<express.RequestHandler>('LoginTenantValidation').toConstantValue(
  (req: any, res: any, next: any) => validation.loginTenant(req, res, next)
);
container.bind<express.RequestHandler>('CreateTokenValidation').toConstantValue(
  (req: any, res: any, next: any) => validation.createToken(req, res, next)
);
container.bind<express.RequestHandler>('TokenRequiredValidation').toConstantValue(
  (req: any, res: any, next: any) => validation.tokenRequired(req, res, next)
);

// controllers
container.bind<interfaces.Controller>(TYPE.Controller).to(UserController).whenTargetNamed('UserController');

export { container };
