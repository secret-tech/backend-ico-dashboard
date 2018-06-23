import * as chai from 'chai';
import app from '../../app';
import * as factory from './test.app.factory';
const Web3 = require('web3');
const bip39 = require('bip39');
import 'reflect-metadata';
import config from '../../config';
require('../../../test/load.fixtures');

chai.use(require('chai-http'));
const {expect, request} = chai;

const postRequest = (customApp, url: string) => {
  return request(customApp)
    .post(url)
    .set('Accept', 'application/json');
};

const getRequest = (customApp, url: string) => {
  return request(customApp)
    .get(url)
    .set('Accept', 'application/json');
};

describe('Users', () => {
  describe('POST /user', () => {
    it('should create user', (done) => {
      const params = {
        email: 'TesT@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true,
        source: {
          utm: 'utm',
          gtm: 'gtm'
        }
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('id');
        expect(res.body.firstName).to.eq('ICO');
        expect(res.body.lastName).to.eq('investor');
        expect(res.body.email).to.eq('test@test.com');
        expect(res.body.agreeTos).to.eq(true);
        expect(res.body.isVerified).to.eq(false);
        if (config.kyc.enabled) {
          expect(res.body.kycStatus).to.eq('not_verified');
        } else {
          expect(res.body.kycStatus).to.eq(config.kyc.status.default);
        }

        expect(res.body.defaultVerificationMethod).to.eq('email');
        expect(res.body.verification.id).to.equal('123');
        expect(res.body.verification.method).to.equal('email');
        expect(res.body.referralCode).to.equal('dGVzdEB0ZXN0LmNvbQ');
        expect(res.body.source).to.deep.equal({
          utm: 'utm',
          gtm: 'gtm'
        });
        expect(res.body).to.not.have.property('passwordHash');
        expect(res.body).to.not.have.property('password');
        done();
      });
    });

    it('should create user - optional phone', (done) => {
      config.kyc.shuftipro.defaultPhone = '+400000000000';
      const params = {
        email: 'TesT@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true,
        source: {
          utm: 'utm',
          gtm: 'gtm'
        }
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('id');
        expect(res.body.firstName).to.eq('ICO');
        expect(res.body.lastName).to.eq('investor');
        expect(res.body.phone).to.eq('+400000000000');
        expect(res.body.email).to.eq('test@test.com');
        expect(res.body.agreeTos).to.eq(true);
        expect(res.body.isVerified).to.eq(false);
        if (config.kyc.enabled) {
          expect(res.body.kycStatus).to.eq('not_verified');
        } else {
          expect(res.body.kycStatus).to.eq(config.kyc.status.default);
        }

        expect(res.body.defaultVerificationMethod).to.eq('email');
        expect(res.body.verification.id).to.equal('123');
        expect(res.body.verification.method).to.equal('email');
        expect(res.body.referralCode).to.equal('dGVzdEB0ZXN0LmNvbQ');
        expect(res.body.source).to.deep.equal({
          utm: 'utm',
          gtm: 'gtm'
        });
        expect(res.body).to.not.have.property('passwordHash');
        expect(res.body).to.not.have.property('password');
        done();
      });
    });

    it('should create user with phone - optional phone', (done) => {
      config.kyc.shuftipro.defaultPhone = '+400000000000';
      const params = {
        email: 'TesT@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true,
        source: {
          utm: 'utm',
          gtm: 'gtm'
        }
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('id');
        expect(res.body.firstName).to.eq('ICO');
        expect(res.body.lastName).to.eq('investor');
        expect(res.body.phone).to.eq('+45550000000');
        expect(res.body.email).to.eq('test@test.com');
        expect(res.body.agreeTos).to.eq(true);
        expect(res.body.isVerified).to.eq(false);
        if (config.kyc.enabled) {
          expect(res.body.kycStatus).to.eq('not_verified');
        } else {
          expect(res.body.kycStatus).to.eq(config.kyc.status.default);
        }

        expect(res.body.defaultVerificationMethod).to.eq('email');
        expect(res.body.verification.id).to.equal('123');
        expect(res.body.verification.method).to.equal('email');
        expect(res.body.referralCode).to.equal('dGVzdEB0ZXN0LmNvbQ');
        expect(res.body.source).to.deep.equal({
          utm: 'utm',
          gtm: 'gtm'
        });
        expect(res.body).to.not.have.property('passwordHash');
        expect(res.body).to.not.have.property('password');
        done();
      });
    });

    it('should not allow to create user if email already exists', (done) => {
      const params = {
        email: 'exiSTing@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        done();
      });
    });

    it('should create user and assign referral', (done) => {
      const params = {
        email: 'tesT1@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        referral: 'YWN0aXZhdGVkQHRlc3QuY29t',
        agreeTos: true
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body.referral).to.equal('activated@test.com');
        expect(res.body).to.not.have.property('passwordHash');
        expect(res.body).to.not.have.property('password');
        done();
      });
    });

    it('should not allow to set not existing referral', (done) => {
      const params = {
        email: 'test1@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        referral: 'dGVzdEB0ZXN0LmNvbQ',
        agreeTos: true
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('Not valid referral code');
        done();
      });
    });

    it('should not allow to set not activated referral', (done) => {
      const params = {
        email: 'test1@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        referral: 'ZXhpc3RpbmdAdGVzdC5jb20',
        agreeTos: true
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('Not valid referral code');
        done();
      });
    });

    it('should not allow to set random referral code', (done) => {
      const params = {
        email: 'test1@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        referral: 'randomstuff',
        agreeTos: true
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('Not valid referral code');
        done();
      });
    });

    it('should create user when additional fields are present in request (jumio provider)', (done) => {
      const params = {
        email: 'test@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true,
        additional: 'value'
      };
      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        done();
      });
    });

    it('should create user when additional fields are present in request (shuftipro provider)', (done) => {
      const params = {
        email: 'test@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true,
        additional: 'value'
      };
      postRequest(factory.testAppForSuccessRegistrationWithShuftiproProvider(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        done();
      });
    });

    it('should activate user', (done) => {
      const activateParams = {
        email: 'ExistinG@test.com',
        verificationId: 'activate_user_verification',
        code: '123456'
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user/activate').send(activateParams).end((err, res) => {
        expect(res.status).to.eq(200);
        expect(res.body.accessToken).to.eq('token');
        expect(res.body.wallets[0].ticker).to.eq('ETH');
        expect(res.body.wallets[0].balance).to.eq('0');
        expect(res.body.wallets[0]).to.have.property('privateKey');
        expect(res.body.wallets[0]).to.not.have.property('salt');
        expect(bip39.validateMnemonic(res.body.wallets[0].mnemonic)).to.eq(true);
        expect(Web3.utils.isAddress(res.body.wallets[0].address)).to.eq(true);
        done();
      });
    });

    it('should send transaction by private key during activation user', (done) => {
      const activateParams = {
        email: 'existing@test.com',
        verificationId: 'activate_user_verification',
        code: '123456'
      };

      postRequest(factory.testAppForSuccessSendTransactionByPrivateKey(), '/user/activate').send(activateParams).end((err, res) => {
        expect(res.status).to.eq(200);
        done();
      });
    });

    it('should require email on activate user', (done) => {
      const activateParams = {
        verificationId: '123',
        code: '123456'
      };

      postRequest(factory.testAppForSuccessRegistrationWithJumioProvider(), '/user/activate').send(activateParams).end((err, res) => {
        expect(res.status).to.eq(422);
        expect(res.body.message).to.equal('"email" is required');
        done();
      });
    });

    it('should validate email', (done) => {
      const params = {
        email: 'test.test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true
      };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"email" must be a valid email');
        done();
      });
    });

    it('should validate referral', (done) => {
      const params = {
        email: 'test@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1970-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true,
        referral: 'test.test.com'
      };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.equal('Not valid referral code');
        done();
      });
    });

    it('should require email', (done) => {
      const params = {firstName: 'ICO', lastName: 'investor', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"email" is required');
        done();
      });
    });

    it('should require firstName', (done) => {
      const params = {email: 'test@test.com', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.equal('"firstName" is required');
        done();
      });
    });

    it('should require lastName', (done) => {
      const params = {email: 'test@test.com', firstName: 'ICO', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.equal('"lastName" is required');
        done();
      });
    });

    it('should require country', (done) => {
      const params = {email: 'test@test.com', firstName: 'ICO', lastName: 'investor', phone: '+45550000000', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.equal('"country" is required');
        done();
      });
    });

    it('should require phone', (done) => {
      config.kyc.shuftipro.defaultPhone = undefined;
      const params = {email: 'test@test.com', firstName: 'ICO', lastName: 'investor', country: 'ru', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(factory.buildApp(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.equal('"phone" is required');
        done();
      });
    });

    it('should optional phone', (done) => {
      config.kyc.shuftipro.defaultPhone = '+4400000000000';
      const params = {email: 'test@test.com', firstName: 'ICO', lastName: 'investor', country: 'ru', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(factory.buildApp(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.not.equal('"phone" is required');
        done();
      });
    });

    it('should require valid phone number', (done) => {
      const params = {email: 'test@test.com', firstName: 'ICO', lastName: 'investor', country: 'ru', phone: '45550000000', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.equal('"phone" must be a valid phone number (+1234567890)');
        done();
      });
    });

    it('should require dob', (done) => {
      const params = {email: 'test@test.com', firstName: 'ICO', lastName: 'investor', country: 'ru', phone: '+45550000000', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.equal('"dob" is required');
        done();
      });
    });

    it('should require password', (done) => {
      const params = {email: 'test@test.com', firstName: 'ICO', lastName: 'investor', phone: '+45550000000', country: 'ru', dob: '1960-01-01', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"password" is required');
        done();
      });
    });

    it('should require valid password', (done) => {
      const params = {email: 'test@test.com', firstName: 'ICO', lastName: 'investor', phone: '+45550000000', country: 'ru', dob: '1960-01-01', password: 'qwerty'};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"password" must be at least 8 characters, contain at least one number, 1 small and 1 capital letter');
        done();
      });
    });

    it('should require agreeTos to be true', (done) => {
      const params = {email: 'test@test.com', firstName: 'ICO', lastName: 'investor', phone: '+45550000000', country: 'ru', dob: '1960-01-01', password: 'test12A6!@#$%^&*()_-=+|/'};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"agreeTos" is required');
        done();
      });
    });

    it('should require agreeTos to be true', (done) => {
      const params = {
        email: 'test@test.com',
        firstName: 'ICO',
        lastName: 'investor',
        phone: '+45550000000',
        country: 'us',
        dob: '1960-01-01',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: false
      };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"agreeTos" must be one of [true]');
        done();
      });
    });
  });

  describe('POST /user/login/initiate', () => {
    it('should initiate login', (done) => {
      const params = { email: 'activatED@test.com', password: 'test12A6!@#$%^&*()_-=+|/' };
      postRequest(factory.testAppForInitiateLogin(), '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal({
          accessToken: 'token',
          isVerified: false,
          verification: {
            status: 200,
            verificationId: '123',
            attempts: 0,
            expiredOn: 124545,
            method: 'email'
          }
        });
        done();
      });
    });

    it('should respond with 403 for incorrect password', (done) => {
      const params = { email: 'activated@test.com', password: 'passwordA11' };
      postRequest(factory.testAppForInitiateLogin(), '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(403);
        done();
      });
    });

    it('should respond with 403 if user is not activated', (done) => {
      const params = { email: 'existing@test.com', password: 'test12A6!@#$%^&*()_-=+|/' };
      postRequest(factory.testAppForInitiateLogin(), '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(403);
        expect(res.body.message).to.equal('Account is not activated! Please check your email');
        done();
      });
    });

    it('should respond with 404 if user is not found', (done) => {
      const params = { email: 'test123@test.com', password: 'passwordA11' };
      postRequest(factory.testAppForInitiateLogin(), '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(404);
        done();
      });
    });

    it('should require email', (done) => {
      const params = { password: 'passwordA1' };
      postRequest(app, '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"email" is required');
        done();
      });
    });

    it('should validate email', (done) => {
      const params = { email: 'test.test.com', password: 'passwordA1' };
      postRequest(app, '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"email" must be a valid email');
        done();
      });
    });

    it('should require password', (done) => {
      const params = { email: 'test@test.com' };
      postRequest(app, '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"password" is required');
        done();
      });
    });
  });

  describe('POST /user/login/verify', () => {
    it('should verify login', (done) => {
      const params = {
        accessToken: 'not_verified_token',
        verification: {
          id: 'verify_login_verification',
          code: '123',
          method: 'email'
        }
      };

      postRequest(factory.testAppForVerifyLogin(), '/user/login/verify').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal({
          accessToken: 'not_verified_token',
          isVerified: true,
          verification: {
            status: 200,
            verificationId: 'verify_login_verification',
            attempts: 1,
            expiredOn: 124545,
            method: 'email'
          }
        });
        done();
      });
    });

    it('should require accessToken', (done) => {
      const params = {
        verification: {
          id: '123',
          code: '123',
          method: 'email'
        }
      };

      postRequest(app, '/user/login/verify').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"accessToken" is required');
        done();
      });
    });

    it('should require verification id', (done) => {
      const params = {
        accessToken: 'token',
        verification: {
          code: '123',
          method: 'email'
        }
      };

      postRequest(app, '/user/login/verify').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"id" is required');
        done();
      });
    });

    it('should require verification code', (done) => {
      const params = {
        accessToken: 'token',
        verification: {
          id: '123',
          method: 'email'
        }
      };

      postRequest(app, '/user/login/verify').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"code" is required');
        done();
      });
    });

    it('should require verification method', (done) => {
      const params = {
        accessToken: 'token',
        verification: {
          id: '123',
          code: '123'
        }
      };

      postRequest(app, '/user/login/verify').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.message).to.equal('"method" is required');
        done();
      });
    });
  });

  describe('GET /user/me', () => {
    it('should provide user info', (done) => {
      const token = 'verified_token';

      getRequest(factory.testAppForUserMe(), '/user/me').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);

        expect(res.body).to.deep.equal({
          ethAddress: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
          email: 'activated@test.com',
          name: 'ICO Investor',
          kycStatus: 'not_verified',
          defaultVerificationMethod: 'email',
          firstName: 'ICO',
          lastName: 'Investor',
          dob: '1970-01-01',
          country: 'RU',
          phone: '+70000000000'
        });
        done();
      });
    });
  });

  describe('POST /user/me/changePassword', () => {
    it('should initiate password change', (done) => {
      const token = 'verified_token';
      const params = {
        oldPassword: 'test12A6!@#$%^&*()_-=+|/',
        newPassword: 'PasswordA1#$'
      };

      postRequest(factory.testAppForChangePassword(), '/user/me/changePassword/initiate')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.equal({
            verification: {
              status: 200,
              verificationId: '123',
              attempts: 0,
              expiredOn: 124545,
              method: 'email'
            }
          });
          done();
        });
    });

    it('should verify password change', (done) => {
      const token = 'verified_token';
      const params = {
        oldPassword: 'test12A6!@#$%^&*()_-=+|/',
        newPassword: 'PasswordA1#$',
        verification: {
          verificationId: 'change_password_verification',
          code: '123',
          method: 'email'
        }
      };

      postRequest(factory.testAppForChangePassword(), '/user/me/changePassword/verify')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.equal({
            accessToken: 'new_token'
          });
          done();
        });
    });

    it('should check old password on initiate', (done) => {
      const token = 'verified_token';
      const params = {
        oldPassword: '1234',
        newPassword: 'PasswordA1#$'
      };

      postRequest(factory.testAppForChangePassword(), '/user/me/changePassword/initiate')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          expect(res.body.message).to.equal('Invalid password');
          done();
        });
    });

    it('should require new password on initiate', (done) => {
      const token = 'verified_token';
      const params = {
        oldPassword: 'passwordA1'
      };

      postRequest(factory.testAppForChangePassword(), '/user/me/changePassword/initiate')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);

          expect(res.body.message).to.equal('"newPassword" is required');
          done();
        });
    });
  });

  describe('POST /user/resetPassword', () => {
    it('should initiate password reset', (done) => {
      const params = {
        email: 'activated@test.com'
      };

      postRequest(factory.testAppForResetPassword(), '/user/resetPassword/initiate')
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          done();
        });
    });

    it('should require email on initiate password reset', (done) => {
      const params = {
      };

      postRequest(factory.testAppForResetPassword(), '/user/resetPassword/initiate')
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body.message).to.equal('"email" is required');
          done();
        });
    });

    it('should respond with error on initiate if user is not found', (done) => {
      const params = {
        email: 'not_found@test.com'
      };

      postRequest(factory.testAppForResetPassword(), '/user/resetPassword/initiate')
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should reset password on verify', (done) => {
      const params = {
        email: 'actiVAted@test.com',
        password: 'PasswordA1',
        verification: {
          verificationId: 'reset_password_verification',
          method: 'email',
          code: '123456'
        }
      };

      postRequest(factory.testAppForResetPassword(), '/user/resetPassword/verify')
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.eq({
            status: 200,
            data: {
              verificationId: 'reset_password_verification',
              consumer: 'activated@test.com',
              expiredOn: 123456,
              attempts: 0,
              payload: {
                scope: 'reset_password'
              }
            }
          });
          done();
        });
    });

    it('should require password on verify', (done) => {
      const params = {
        email: 'activaTED@test.com',
        verification: {
          verificationId: 'activated_user_verification',
          method: 'google_auth',
          code: '123456'
        }
      };

      postRequest(factory.testAppForResetPassword(), '/user/resetPassword/verify')
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body.message).to.equal('"password" is required');
          done();
        });
    });
  });

  describe('POST /user/invite', () => {
    it('should invite users', (done) => {
      const token = 'verified_token';
      const params = {
        emails: [
          'ortgMA@gmail.com'
        ]
      };

      postRequest(factory.testAppForInvite(), '/user/invite')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(200);

          expect(res.body).to.deep.equal({
            emails: [
              {
                email: 'ortgma@gmail.com',
                invited: true
              }
            ]
          });
          done();
        });
    });

    it('should validate emails', (done) => {
      const token = 'verified_token';
      const params = {
        emails: [
          'inviTe1@test.com',
          'inviTe2.test.com',
          'inviTe3@test.com'
        ]
      };

      postRequest(factory.testAppForChangePassword(), '/user/invite')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body.message).to.equal('"1" must be a valid email');
          done();
        });
    });

    it('should not allow to invite more than 5 emails at once', (done) => {
      const token = 'verified_token';
      const params = {
        emails: [
          'inviTe1@test.com',
          'inviTe2@test.com',
          'inviTe3@test.com',
          'inviTe4@test.com',
          'inviTe5@test.com',
          'inviTe6@test.com'
        ]
      };

      postRequest(factory.testAppForChangePassword(), '/user/invite')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body.message).to.equal('"emails" must contain less than or equal to 5 items');
          done();
        });
    });

    it('should not allow to invite less than 1 email', (done) => {
      const token = 'verified_token';
      const params = {
        emails: []
      };

      postRequest(factory.testAppForChangePassword(), '/user/invite')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body.message).to.equal('"emails" must contain at least 1 items');
          done();
        });
    });

    it('should not allow to invite already existing users', (done) => {
      const token = 'verified_token';
      const params = {
        emails: [
          'inviTed@test.com',
          'exisTing@test.com'
        ]
      };

      postRequest(factory.testAppForChangePassword(), '/user/invite')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body.message).to.equal('existing@test.com account already exists');
          done();
        });
    });
  });

  describe('POST /user/enable2fa', () => {
    it('should initiate 2fa enable', function(done) {
      const token = 'verified_token';

      getRequest(factory.testAppForChangePassword(), '/user/enable2fa/initiate')
        .set('Authorization', `Bearer ${ token }`)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.equal({
            verification: {
              status: 200,
              verificationId: '123',
              attempts: 0,
              expiredOn: 124545,
              method: 'email'
            }
          });
          done();
        });
    });

    it('should respond with error on initiate if 2fa already enabled', function(done) {
      const token = 'verified_token_2fa_user';

      getRequest(factory.testAppForChangePassword(), '/user/enable2fa/initiate')
        .set('Authorization', `Bearer ${ token }`)
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.eq('Authenticator is enabled already');
          done();
        });
    });

    it('should respond with error on verify if 2fa already enabled', function(done) {
      const token = 'verified_token_2fa_user';
      const params = {
        verification: {
          verificationId: '123',
          code: '123',
          method: 'google_auth'
        }
      };

      postRequest(factory.testAppForChangePassword(), '/user/enable2fa/verify')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.eq('Authenticator is enabled already');
          done();
        });
    });

    it('should enable 2fa after success verification', function(done) {
      const token = 'verified_token';
      const params = {
        verification: {
          verificationId: 'enable_2fa_verification',
          code: '123',
          method: 'google_auth'
        }
      };

      postRequest(factory.testAppForChangePassword(), '/user/enable2fa/verify')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.eq({
            enabled: true
          });
          done();
        });
    });

    it('should require verification', function(done) {
      const token = 'verified_token';
      const params = {};

      postRequest(factory.testAppForChangePassword(), '/user/enable2fa/verify')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body.message).to.eq('"verification" is required');
          done();
        });
    });
  });

  describe('POST /user/disable2fa', () => {
    it('should initiate 2fa disable', function(done) {
      const token = 'verified_token_2fa_user';

      getRequest(factory.testAppForChangePassword(), '/user/disable2fa/initiate')
        .set('Authorization', `Bearer ${ token }`)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.equal({
            verification: {
              status: 200,
              verificationId: '123',
              attempts: 0,
              expiredOn: 124545,
              method: 'email'
            }
          });
          done();
        });
    });

    it('should respond with error on initiate if 2fa already disabled', function(done) {
      const token = 'verified_token';

      getRequest(factory.testAppForChangePassword(), '/user/disable2fa/initiate')
        .set('Authorization', `Bearer ${ token }`)
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.eq('Authenticator is disabled already');
          done();
        });
    });

    it('should respond with error on verify if 2fa already disabled', function(done) {
      const token = 'verified_token';
      const params = {
        verification: {
          verificationId: '123',
          code: '123',
          method: 'google_auth'
        }
      };

      postRequest(factory.testAppForChangePassword(), '/user/disable2fa/verify')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.eq('Authenticator is disabled already');
          done();
        });
    });

    it('should require verification', function(done) {
      const token = 'verified_token';
      const params = {};

      postRequest(factory.testAppForChangePassword(), '/user/disable2fa/verify')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body.message).to.eq('"verification" is required');
          done();
        });
    });

    it('should disable 2fa after success verification', function(done) {
      const token = 'verified_token_2fa_user';
      const params = {
        verification: {
          verificationId: 'disable_2fa_verification',
          code: '123',
          method: 'google_auth'
        }
      };

      postRequest(factory.testAppForChangePassword(), '/user/disable2fa/verify')
        .set('Authorization', `Bearer ${ token }`)
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.eq({
            enabled: false
          });
          done();
        });
    });
  });

  describe('POST /resendVerification', () => {
    it('should require email', function(done) {
      const params = {};

      postRequest(factory.testAppForResendVerification(), '/user/resendVerification')
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body.message).to.eq('"email" is required');
          done();
        });
    });

    it('should respond with 404 error on resend verification if email is wrong', function(done) {
      const params = {
        email: 'Wrong@test.ru'
      };

      postRequest(factory.testAppForResendVerification(), '/user/resendVerification')
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          expect(res.body.message).to.eq('User is not found');
          done();
        });
    });

    it('should respond with error on resend verification if user is activated', function(done) {
      const params = {
        email: 'Activated@test.com'
      };

      postRequest(factory.testAppForResendVerification(), '/user/resendVerification')
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          expect(res.body.message).to.eq('User is activated already');
          done();
        });
    });

    it('should resend verification', function(done) {
      const params = {
        email: 'exisTing@test.com'
      };

      postRequest(factory.testAppForResendVerification(), '/user/resendVerification')
        .send(params)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          done();
        });
    });
  });
});
