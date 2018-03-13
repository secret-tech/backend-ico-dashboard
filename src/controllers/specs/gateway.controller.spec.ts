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
      getRequest(factory.testAppForDashboard(), '/gateway/currencies').end((err, res) => {
        expect(res.status).to.equal(200);
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
      postRequest(factory.testAppForDashboard(), '/gateway/createTransaction').set('Authorization', `Bearer ${ token }`).send(params).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.includes.keys('txn_id', 'address', 'status_url', 'qrcode_url');
        done();
      });
    });
  });
});
