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

describe('Kyc', () => {
  describe('GET /kyc/init', () => {
    it('should init kyc process - provide user initiated info', (done) => {
      const token = 'verified_token';
      getRequest(factory.testAppForDashboard(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.deep.eq({
          timestamp: '2017-11-09T06:47:31.467Z',
          authorizationToken: 'c87447f8-fa43-4f98-a933-3c88be4e86ea',
          clientRedirectUrl: 'https://lon.netverify.com/widget/jumio-verify/2.0/form?authorizationToken=c87447f8-fa43-4f98-a933-3c88be4e86ea',
          jumioIdScanReference: '7b58a08e-19cf-4d28-a828-4bb577c6f69a'
        });
        done();
      });
    });
  });

  describe('GET /kyc/init', () => {
    it('should not allow init if investor is verified already', (done) => {
      const token = 'kyc_verified_token';

      getRequest(factory.testAppForDashboard(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(400);
        expect(res.body.error).to.eq('Your account is verified already');
        done();
      });
    });
  });

  describe('GET /kyc/init', () => {
    it('should not allow init if investor verification is failed', (done) => {
      const token = 'kyc_3_failed_token';

      getRequest(factory.testAppForDashboard(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(400);
        expect(res.body.error).to.eq('Your account verification failed. Please contact Jincor team');
        done();
      });
    });
  });
});
