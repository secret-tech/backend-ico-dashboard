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
    it('should init kyc process', (done) => {
      const token = 'verified_token';
      done();
      /*getRequest(factory.testAppForDashboard(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(200);
        console.log(res.body);
        done();
      });*/
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
    it('should not allow init if investor tried 3 times already', (done) => {
      const token = 'kyc_3_failed_token';

      getRequest(factory.testAppForDashboard(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
        expect(res.status).to.equal(400);
        expect(res.body.error).to.eq('You have tried to pass ID verification at least 3 times. Please contact Jincor team.');
        done();
      });
    });
  });
});
