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
            USD: '1000000',
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
          data: 'dGVzdEB0ZXN0LmNvbQ',
          users: [
            {
              date: 1508241475,
              name: 'Investor 1',
              walletAddress: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
              tokens: '105'
            },
            {
              date: 1508241475,
              name: 'Investor 2',
              walletAddress: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eB',
              tokens: '1.01'
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
});
