import * as chai from 'chai';
import * as factory from './test.app.factory';
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

describe('Dashboard', () => {
  describe('GET /dashboard', () => {
    it('should get dashboard data', (done) => {
      const token = 'verified_token';

      getRequest(factory.testAppForDashboard(), '/dashboard').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.eq({
          ethBalance: '1.0001',
          jcrTokenBalance: '500.00012345678912345',
          jcrTokensSold: '5000',
          jcrTokenPrice: {
            ETH: '0.005',
            USD: '1'
          },
          raised: {
            ETH: '2000',
            USD: '400000',
            BTC: '100'
          },
          daysLeft: 10
        });
        done();
      });
    });
  });

  describe('GET /dashboard/referral', () => {
    it('should get dashboard referral data', (done) => {
      const token = 'verified_token';

      getRequest(factory.testAppForDashboard(), '/dashboard/referral').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.eq({
          data: 'YWN0aXZhdGVkQHRlc3QuY29t',
          users: [
            {
              date: 1509885929,
              name: 'ICO investor',
              walletAddress: '0x446cd17EE68bD5A567d43b696543615a94b01760',
              tokens: '10'
            }
          ]
        });
        done();
      });
    });
  });

  describe('POST /invest', () => {
    it('/invest/initiate should require ethAmount', (done) => {
      const token = 'verified_token';
      const params = {
        mnemonic: 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit'
      };

      postRequest(factory.testAppForDashboard(), '/dashboard/invest/initiate').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.error.details[0].message).to.eq('"ethAmount" is required');
        done();
      });
    });

    it('/invest/initiate should require mnemonic', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 1
      };

      postRequest(factory.testAppForDashboard(), '/dashboard/invest/initiate').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.error.details[0].message).to.eq('"mnemonic" is required');
        done();
      });
    });

    it('/invest/initiate should require ethAmount to be greater than 1', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 0.99,
        mnemonic: 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit'
      };

      postRequest(factory.testAppForDashboard(), '/dashboard/invest/initiate').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.error.details[0].message).to.eq('"ethAmount" must be larger than or equal to 1');
        done();
      });
    });

    it('/invest/initiate should initiate verification', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 1,
        mnemonic: 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit'
      };

      postRequest(factory.testAppForDashboard(), '/dashboard/invest/initiate').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
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

    it('/invest/verify should require ethAmount', (done) => {
      const token = 'verified_token';
      const params = {
        mnemonic: 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit'
      };

      postRequest(factory.testAppForDashboard(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.error.details[0].message).to.eq('"ethAmount" is required');
        done();
      });
    });

    it('/invest/verify should require verification', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 1,
        mnemonic: 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit'
      };

      postRequest(factory.testAppForDashboard(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.error.details[0].message).to.eq('"verification" is required');
        done();
      });
    });

    it('/invest/verify should require mnemonic', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 1
      };

      postRequest(factory.testAppForDashboard(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.error.details[0].message).to.eq('"mnemonic" is required');
        done();
      });
    });

    it('/invest/verify should require ethAmount to be greater than 1', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 0.99,
        mnemonic: 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit'
      };

      postRequest(factory.testAppForDashboard(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.error.details[0].message).to.eq('"ethAmount" must be larger than or equal to 1');
        done();
      });
    });

    it('/invest/verify should send transaction', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 1,
        mnemonic: 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit',
        verification: {
          verificationId: 'verify_invest',
          method: 'email',
          code: '123456'
        }
      };

      postRequest(factory.testAppForDashboard(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.eq({
          transactionHash: 'transactionHash',
          status: 'pending',
          type: 'token_purchase'
        });
        done();
      });
    });
  });

  describe('GET /transactions', () => {
    it('should get transaction history', (done) => {
      const token = 'verified_token';

      getRequest(factory.testAppForDashboard(), '/dashboard/transactions').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.eq([
          {
            id: '59fef59e02ad7e0205556b11',
            transactionHash: '0x245b1fef4caff9d592e8bab44f3a3633a0777acb79840d16f60054893d7ff100',
            timestamp: 1509881247,
            blockNumber: 2008959,
            from: '0xBd0cb067A75C23EFB290B4e223059Af8E4AF4fd8',
            to: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
            ethAmount: '0',
            jcrAmount: '1',
            status: 'confirmed',
            type: 'jcr_transfer',
            direction: 'in'
          }
        ]);
        done();
      });
    });

    it('should require authorization', (done) => {
      getRequest(factory.testAppForDashboard(), '/dashboard/transactions').end((err, res) => {
        expect(res.status).to.equal(401);
        done();
      });
    });
  });
});
