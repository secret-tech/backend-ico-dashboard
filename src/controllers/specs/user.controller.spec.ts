import * as chai from 'chai';
import app from '../../app';
import * as express from 'express';
import * as TypeMoq from 'typemoq';
import { container } from '../../ioc.container';
import { InitiateResult, VerificationClient, VerificationClientInterface, VerificationClientType, ValidationResult } from '../../services/verify.client';
import { InversifyExpressServer } from 'inversify-express-utils';
import * as bodyParser from 'body-parser';
import { AuthClient, AuthClientInterface, AuthClientType, UserRegistrationResult, AccessTokenResponse } from "../../services/auth.client";
import { CreateAccountResult, Web3Client, Web3ClientInterface, Web3ClientType } from "../../services/web3.client";

chai.use(require('chai-http'));
const { expect, request } = chai;

let postRequest;

describe('Users', () => {

  describe('POST /user', () => {
    const testAppWithVerifyAuthWeb3Mock = () => {
      const verifyMock = TypeMoq.Mock.ofType(VerificationClient);
      const authMock = TypeMoq.Mock.ofType(AuthClient);
      const web3Mock = TypeMoq.Mock.ofType(Web3Client);

      const initiateResult: InitiateResult = {
        status: 200,
        verificationId: '123',
        attempts: 0,
        expiredOn: 124545,
        method: 'email',
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

      const web3MockResult: CreateAccountResult = {
        address: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
      };

      verifyMock.setup(x => x.initiateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                .returns(async (): Promise<InitiateResult> => initiateResult);

      verifyMock.setup(x => x.validateVerification(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                .returns(async (): Promise<ValidationResult> => validationResult);

      authMock.setup(x => x.createUser(TypeMoq.It.isAny()))
              .returns(async (): Promise<UserRegistrationResult> => registrationResult);

      authMock.setup(x => x.loginUser(TypeMoq.It.isAny()))
              .returns(async (): Promise<AccessTokenResponse> => loginResult);

      web3Mock.setup(x => x.createAccount()).returns(() => web3MockResult);

      container.rebind<VerificationClientInterface>(VerificationClientType).toConstantValue(verifyMock.object);
      container.rebind<AuthClientInterface>(AuthClientType).toConstantValue(authMock.object);
      container.rebind<Web3ClientInterface>(Web3ClientType).toConstantValue(web3Mock.object);

      const newApp = express();
      newApp.use(bodyParser.json());
      newApp.use(bodyParser.urlencoded({ extended: false }));

      return new InversifyExpressServer(container, null, null, newApp).build();
    };

    before(() => {
      this.app = testAppWithVerifyAuthWeb3Mock();

      postRequest = (customApp, url: string) => {
        return request(customApp)
          .post(url)
          .set('Accept', 'application/json')
      };
    });

    it('should create user', (done) => {
      const params = { email: 'test@test.com', name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true };

      postRequest(this.app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('id');
        expect(res.body.name).to.eq('ICO investor');
        expect(res.body.email).to.eq('test@test.com');
        expect(res.body.agreeTos).to.eq(true);
        expect(res.body.verificationRequired).to.eq(true);
        expect(res.body.defaultVerificationMethod).to.eq('email');
        expect(res.body.wallets).to.deep.eq([{
          ticker: 'ETH',
          address: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
          balance: '0'
        }]);
        expect(res.body.verification.id).to.equal('123');
        expect(res.body.verification.method).to.equal('email');
        expect(res.body).to.not.have.property('passwordHash');
        expect(res.body).to.not.have.property('password');
        done();
      });
    });

    it('should create user when additional fields are present in request', (done) => {
      const params = { email: 'test@test.com', name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true, additional: 'value' };
      postRequest(this.app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        done();
      });
    });

    it('should activate user', (done) => {
      const params = { email: 'test@test.com', name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true };

      postRequest(this.app, '/user').send(params).end((err, res) => {
        const activateParams = {
          email: 'test@test.com',
          verificationId: '123',
          code: '123456'
        };

        postRequest(this.app, '/user/activate').send(activateParams).end((err, res) => {
          expect(res.status).to.eq(200);
          expect(res.body.accessToken).to.eq('token');
          done();
        });
      });
    });

    it('should validate email', (done) => {
      const params = { email: 'test.test.com', name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"email" must be a valid email');
        done();
      });
    });

    it('should validate referral', (done) => {
      const params = { email: 'test@test.com', name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true, referral: 'test.test.com' };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"referral" must be a valid email');
        done();
      });
    });

    it('should require email', (done) => {
      const params = { name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"email" is required');
        done();
      });
    });

    it('should require name', (done) => {
      const params = { email: 'test@test.com', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"name" is required');
        done();
      });
    });

    it('should require password', (done) => {
      const params = { email: 'test@test.com', name: 'ICO investor', agreeTos: true };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"password" is required');
        done();
      });
    });

    it('should require agreeTos to be true', (done) => {
      const params = { email: 'test@test.com', name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/' };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"agreeTos" is required');
        done();
      });
    });

    it('should require agreeTos to be true', (done) => {
      const params = { email: 'test@test.com', name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: false };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"agreeTos" must be one of [true]');
        done();
      });
    });
  });
});
