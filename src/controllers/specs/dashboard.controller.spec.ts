import * as chai from 'chai';
import * as factory from './test.app.factory';
require('../../../test/load.fixtures');

chai.use(require('chai-http'));
const { expect, request } = chai;

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

      getRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.eq({
          ethBalance: '1.0001',
          tokenBalance: '500.00012345678912345',
          tokensSold: '5000',
          tokenPrice: {
            ETH: '0.005',
            USD: '1'
          },
          raised: {
            ETH: '2000',
            USD: '400000',
            BTC: '0'
          },
          daysLeft: Math.floor((1517443200 - Math.floor(Date.now() / 1000)) / (3600 * 24)) + 1
        });
        done();
      });
    });

    it('should get dashboard data - with the balance from old contracts', (done) => {
      const token = 'verified_token';

      getRequest(factory.testAppForDashboardWithOldSmartContracts(), '/dashboard').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.eq({
          ethBalance: '1.0001',
          tokenBalance: '500.00012345678912345',
          tokensSold: '15000',
          tokenPrice: {
            ETH: '0.005',
            USD: '1'
          },
          raised: {
            ETH: '6000',
            USD: '1200000',
            BTC: '0'
          },
          daysLeft: Math.floor((1517443200 - Math.floor(Date.now() / 1000)) / (3600 * 24)) + 1
        });
        done();
      });
    });

    it('should equal balance to 0.1 ETH after actiovation user', (done) => {
      const token = 'verified_token';

      getRequest(factory.testAppForDashboardAfterActivationUser(), '/dashboard').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.eq(200);
        expect(res.body.ethBalance).to.eq('0.1');
        done();
      });
    });
  });

  describe('GET /dashboard/referral', () => {
    it('should get dashboard referral data', (done) => {
      const token = 'verified_token';

      getRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/referral').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.eq({
          data: 'YWN0aXZhdGVkQHRlc3QuY29t',
          referralCount: 1,
          users: [
            {
              date: 1509885929,
              name: 'ICO investor',
              walletAddress: '0x99eb89a5D15A6D487da3f3C1fC4fc2378eE227aF',
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

      postRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/invest/initiate').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('"ethAmount" is required');
        done();
      });
    });

    it('/invest/initiate should require mnemonic', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 0.1
      };

      postRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/invest/initiate').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('"mnemonic" is required');
        done();
      });
    });

    it('/invest/initiate should require ethAmount to be greater than 0.1', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 0.099,
        mnemonic: 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit'
      };

      postRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/invest/initiate').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('"ethAmount" must be larger than or equal to 0.1');
        done();
      });
    });

    it('/invest/initiate should initiate verification', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 1,
        mnemonic: 'pig turn bounce jeans left mouse hammer sketch hold during grief spirit'
      };

      postRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/invest/initiate').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
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
      const params = {};

      postRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('"ethAmount" is required');
        done();
      });
    });

    it('/invest/verify should require verification', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 1,
        mnemonic: 'mnemonic'
      };

      postRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('"verification" is required');
        done();
      });
    });

    it('/invest/verify should require ethAmount to be greater than 1', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 0.09,
        verification: {
          verificationId: 'id',
          method: 'email',
          code: '123456'
        }
      };

      postRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('"ethAmount" must be larger than or equal to 0.1');
        done();
      });
    });

    it('/invest/verify should require mnemonic', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 1,
        verification: {
          verificationId: 'id',
          method: 'email',
          code: '123445'
        }
      };

      postRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(422);
        expect(res.body.message).to.eq('"mnemonic" is required');
        done();
      });
    });

    it('/invest/verify should send transaction', (done) => {
      const token = 'verified_token';
      const params = {
        ethAmount: 1,
        mnemonic: 'mnemonic',
        verification: {
          verificationId: 'verify_invest',
          method: 'email',
          code: '123456'
        }
      };

      postRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/invest/verify').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
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

      getRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/transactions').set('Authorization', `Bearer ${ token }`).end((err, res) => {
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
            tokenAmount: '1',
            status: 'confirmed',
            type: 'token_transfer',
            direction: 'in'
          },
          {
            address: '0x99eb89a5D15A6D487da3f3C1fC4fc2378eE227aa',
            confirmsNeeded: 0,
            currency: 'BTC',
            expiredOn: 1234567890,
            id: '563143b280d2387c91807933',
            qrcodeUrl: 'qrcode_url',
            receivedAmount: '0.1',
            receivedConfirms: '0',
            status: '100',
            statusUrl: 'status_url',
            totalAmount: 1,
            txnId: 'abc123432',
            type: 'gateway_transaction',
            timeout: 3600
          },
          {
            address: '0x99eb89a5D15A6D487da3f3C1fC4fc2378eE227aa',
            confirmsNeeded: 0,
            currency: 'BTC',
            expiredOn: 1234567890,
            id: '563143b280d2387c91807f00',
            qrcodeUrl: 'qrcode_url',
            status: '-1',
            statusUrl: 'status_url',
            timeout: 3600,
            totalAmount: 1,
            txnId: 'abc124',
            type: 'gateway_transaction'
          }
        ]);
        done();
      });
    });

    it('should require authorization', (done) => {
      getRequest(factory.testAppForDashboardWithJumioProvider(), '/dashboard/transactions').end((err, res) => {
        expect(res.status).to.equal(401);
        done();
      });
    });
  });

  describe('GET /investTxFee', () => {
    it('should get expected tx fee', (done) => {

      getRequest(factory.testAppForDashboardWithShuftiproProvider(), '/dashboard/investTxFee').end((err, res) => {
        expect(res.status).to.equal(200);
        done();
      });
    });
  });
});
