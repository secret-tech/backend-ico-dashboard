import * as chai from 'chai';
import app from '../../app';
import * as factory from './test.app.factory';

chai.use(require('chai-http'));
const {expect, request} = chai;

const postRequest = (customApp, url: string) => {
  return request(customApp)
    .post(url)
    .set('Accept', 'application/json')
};


describe('Users', () => {
  describe('POST /user', () => {
    it('should create user', (done) => {
      const params = {
        email: 'test@test.com',
        name: 'ICO investor',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true
      };

      postRequest(factory.testAppWithVerifyAuthWeb3Mock(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('id');
        expect(res.body.name).to.eq('ICO investor');
        expect(res.body.email).to.eq('test@test.com');
        expect(res.body.agreeTos).to.eq(true);
        expect(res.body.isVerified).to.eq(false);
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
      const params = {
        email: 'test@test.com',
        name: 'ICO investor',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true,
        additional: 'value'
      };
      postRequest(factory.testAppWithVerifyAuthWeb3Mock(), '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        done();
      });
    });

    it('should activate user', (done) => {
      const params = {
        email: 'test@test.com',
        name: 'ICO investor',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true
      };

      postRequest(factory.testAppWithVerifyAuthWeb3Mock(), '/user').send(params).end((err, res) => {
        const activateParams = {
          email: 'test@test.com',
          verificationId: '123',
          code: '123456'
        };

        postRequest(factory.testAppWithVerifyAuthWeb3Mock(), '/user/activate').send(activateParams).end((err, res) => {
          expect(res.status).to.eq(200);
          expect(res.body.accessToken).to.eq('token');
          done();
        });
      });
    });

    it('should validate email', (done) => {
      const params = {
        email: 'test.test.com',
        name: 'ICO investor',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true
      };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"email" must be a valid email');
        done();
      });
    });

    it('should validate referral', (done) => {
      const params = {
        email: 'test@test.com',
        name: 'ICO investor',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: true,
        referral: 'test.test.com'
      };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"referral" must be a valid email');
        done();
      });
    });

    it('should require email', (done) => {
      const params = {name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"email" is required');
        done();
      });
    });

    it('should require name', (done) => {
      const params = {email: 'test@test.com', password: 'test12A6!@#$%^&*()_-=+|/', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"name" is required');
        done();
      });
    });

    it('should require password', (done) => {
      const params = {email: 'test@test.com', name: 'ICO investor', agreeTos: true};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"password" is required');
        done();
      });
    });

    it('should require agreeTos to be true', (done) => {
      const params = {email: 'test@test.com', name: 'ICO investor', password: 'test12A6!@#$%^&*()_-=+|/'};

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"agreeTos" is required');
        done();
      });
    });

    it('should require agreeTos to be true', (done) => {
      const params = {
        email: 'test@test.com',
        name: 'ICO investor',
        password: 'test12A6!@#$%^&*()_-=+|/',
        agreeTos: false
      };

      postRequest(app, '/user').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"agreeTos" must be one of [true]');
        done();
      });
    });
  });

  describe('POST /user/login/initiate', () => {
    it('should initiate login', (done) => {
      const params = { email: 'test@test.com', password: 'passwordA1' };
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
            method: 'email',
          }
        });
        done();
      });
    });

    it('should require email', (done) => {
      const params = { password: 'passwordA1' };
      postRequest(app, '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"email" is required');
        done();
      });
    });

    it('should validate email', (done) => {
      const params = { email: 'test.test.com', password: 'passwordA1' };
      postRequest(app, '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"email" must be a valid email');
        done();
      });
    });

    it('should require password', (done) => {
      const params = { email: 'test@test.com' };
      postRequest(app, '/user/login/initiate').send(params).end((err, res) => {
        expect(res.status).to.equal(422);

        expect(res.body.error.details[0].message).to.equal('"password" is required');
        done();
      });
    });
  });

  describe('POST /user/login/verify', () => {
    it('should verify login', (done) => {
      const params = {
        accessToken: 'token',
        verification: {
          id: '123',
          code: '123',
          method: 'email'
        }
      };

      postRequest(factory.testAppForVerifyLogin(), '/user/login/verify').send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal({
          accessToken: 'token',
          isVerified: true,
          verification: {
            status: 200,
            verificationId: '123',
            attempts: 0,
            expiredOn: 124545,
            method: 'email',
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

        expect(res.body.error.details[0].message).to.equal('"accessToken" is required');
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

        expect(res.body.error.details[0].message).to.equal('"id" is required');
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

        expect(res.body.error.details[0].message).to.equal('"code" is required');
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

        expect(res.body.error.details[0].message).to.equal('"method" is required');
        done();
      });
    });
  });
});
