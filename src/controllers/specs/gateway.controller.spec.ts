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

describe('Gateway', () => {
  describe('GET /gateway/currencies', () => {
    it('should get expected currencies', (done) => {
      getRequest(factory.testAppForDashboardWithJumioProvider(), '/gateway/currencies').end((err, res) => {
        expect(res.status).to.equal(200);

        Object.keys(res.body).forEach(key => {
          expect(res.body[key].can_convert).to.eq(1);
          expect(res.body[key].accepted).to.eq(1);
        });
        done();
      });
    });
  });

  describe('POST /gateway/createTransaction', () => {
    it('should get expected create transaction', (done) => {
      const token = 'verified_token';
      const params = {
        currency: 'LTCT',
        amount: 0.5
      };
      postRequest(factory.testAppForDashboardWithJumioProvider(), '/gateway/createTransaction').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.includes.keys('txnId', 'address', 'statusUrl', 'qrcodeUrl');
        done();
      });
    });
  });

  describe('GET /gateway/getTransactions', () => {
    it('should get expected transaction', (done) => {
      const token = 'verified_token';
      getRequest(factory.testAppForDashboardWithJumioProvider(), '/gateway/getTransactions').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body[0]).to.includes.keys('id', 'type', 'status', 'expiredOn');
        expect(res.body[0].buyIpns[0]).to.includes.keys('ipnVersion', 'merchant', 'txnId', 'status', 'statusText');
        done();
      });
    });
  });
});
