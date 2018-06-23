import * as chai from 'chai';
import * as factory from './test.app.factory';
import * as bcrypt from 'bcrypt-nodejs';
require('../../../test/load.fixtures');
import { base64encode } from '../../helpers/helpers';
import config from '../../config';
import { Investor, KYC_STATUS_VERIFIED, KYC_STATUS_NOT_VERIFIED, KYC_STATUS_FAILED } from '../../entities/investor';
import { getConnection, getConnectionManager } from 'typeorm';
import { ShuftiproKycResult } from '../../entities/shuftipro.kyc.result';
import * as nock from 'nock';
const mongo = require('mongodb');

chai.use(require('chai-http'));
const { expect, request } = chai;

const postRequest = (customApp, url: string) => {
  return request(customApp)
    .post(url)
    .set('Accept', 'application/json');
};

const getRequest = (customApp, url: string) => {
  const req = request(customApp)
    .get(url)
    .set('Accept', 'application/json') as any;

  return req.redirects(0);
};

describe('Kyc', () => {
  describe('JumioProvider', () => {
    describe('GET /kyc/init', () => {
      it('should init kyc process - provide user initiated info', (done) => {
        const token = 'verified_token';
        getRequest(factory.testAppForDashboardWithJumioProvider(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
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

        getRequest(factory.testAppForDashboardWithJumioProvider(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.eq('Your account is verified already');
          done();
        });
      });
    });

    describe('GET /kyc/init', () => {
      it('should not allow init if investor verification is failed', (done) => {
        const token = 'kyc_3_failed_token';

        getRequest(factory.testAppForDashboardWithJumioProvider(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.eq('Your account verification failed. Please contact secret_tech team');
          done();
        });
      });
    });

    describe('GET /uploaded/:id/:base64hash', () => {
      const id = '59f075eda6cca00fbd486167';
      const hash = base64encode(bcrypt.hashSync(id + config.kyc.jumio.apiSecret));

      it('should update investor status to pending', (done) => {
        getRequest(factory.testAppForDashboardWithJumioProvider(), `/kyc/uploaded/${ id }/${ hash }`).end((err, res) => {
          expect(res).redirectTo('https://demo.icodashboard.space/dashboard/verification/success');
          const investorRepo = getConnection().getMongoRepository(Investor);

          investorRepo.createEntityCursor({ _id: new mongo.ObjectId(id) }).toArray().then((investors) => {
            expect(investors[0].kycStatus).to.eq('pending');
            done();
          });
        });
      });
    });
  });

  describe('ShuftiproProvider', () => {
    before(() => {
      config.kyc.enabled = true;
      config.kyc.provider = 'SHUFTIPRO';
    });

    after(() => {
      config.kyc.enabled = false;
      config.kyc.provider = 'JUMIO';
    });

    describe('GET /kyc/init', () => {
      it('should init kyc process - provide user initiated info', (done) => {
        const originalToISOString = Date.prototype.toISOString;
        Date.prototype.toISOString = () => '2017-11-09T06:47:31.467Z';
        const token = 'verified_token_shuftipro';
        getRequest(factory.testAppForDashboardWithShuftiproProvider(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.eq({
            timestamp: '2017-11-09T06:47:31.467Z',
            message: 'message',
            reference: '59f07e23b41f6373f64a8dcb',
            signature: '149678856aa4b314fb5ff23aa9c746518b1e753932851fe530a0abb79c2f2e0a',
            status_code: 'SP2'
          });
          Date.prototype.toISOString = originalToISOString;
          done();
        });
      });

      it('should not allow init if investor is verified already', (done) => {
        const token = 'kyc_verified_token_shuftipro';

        getRequest(factory.testAppForDashboardWithShuftiproProvider(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.eq('Your account is verified already');
          done();
        });
      });

      it('should not allow init if investor verification is failed', (done) => {
        const token = 'kyc_3_failed_token_shuftipro';

        getRequest(factory.testAppForDashboardWithShuftiproProvider(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.eq('Your account verification failed. Please contact secret_tech team');
          done();
        });
      });

      it('should allow init if investor verification is failed', (done) => {
        config.kyc.shuftipro.allowRecreateSession = true;
        const originalToISOString = Date.prototype.toISOString;
        Date.prototype.toISOString = () => '2017-11-09T06:47:31.467Z';
        const token = 'kyc_3_failed_token_shuftipro';

        getRequest(factory.testAppForDashboardWithShuftiproProvider(), '/kyc/init').set('Authorization', `Bearer ${ token }`).end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.eq({
            message: 'message',
            reference: '59f07e23b41f6373f64a8dcb',
            signature: '149678856aa4b314fb5ff23aa9c746518b1e753932851fe530a0abb79c2f2e0a',
            status_code: 'SP2',
            timestamp: '2017-11-09T06:47:31.467Z'
          });
          done();
          config.kyc.shuftipro.allowRecreateSession = false;
          Date.prototype.toISOString = originalToISOString;
        });
      });
    });

    describe('GET /kyc/reinit', () => {
      it('should reinit kyc process - provide user initiated info', (done) => {
        const token = 'verified_token_shuftipro';
        const originalToISOString = Date.prototype.toISOString;
        Date.prototype.toISOString = () => '2018-05-13T07:15:13.994Z';
        getRequest(factory.testAppForDashboardWithShuftiproProvider(), '/kyc/reinit').set('Authorization', `Bearer ${ token }`).end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.eq({
            timestamp: '2018-05-13T07:15:13.994Z',
            message: 'message',
            reference: '59f07e23b41f6373f64a8dcb',
            signature: '149678856aa4b314fb5ff23aa9c746518b1e753932851fe530a0abb79c2f2e0a',
            status_code: 'SP2'
          });
          Date.prototype.toISOString = originalToISOString;
          done();
        });
      });
    });

    describe('GET /kyc/callback', () => {
      it('should callback kyc process - status SP2', (done) => {
        const params = {
          timestamp: '2017-11-09T06:47:31.467Z',
          message: 'message',
          reference: '59f07e23b41f6373f64a8dcb',
          signature: '149678856aa4b314fb5ff23aa9c746518b1e753932851fe530a0abb79c2f2e0a',
          status_code: 'SP2'
        };

        postRequest(factory.testAppForDashboardWithShuftiproProvider(), '/kyc/callback').send(params).end((err, res) => {
          expect(res.status).to.equal(200);
          getConnection().mongoManager.findOne(ShuftiproKycResult, {signature: params.signature}).then((kycResult) => {
            expect(kycResult.signature).to.equal(params.signature);
            expect(kycResult.user.toHexString()).to.equal('59f07e23b41f6373f64a8dcb');
            done();
          });
        });
      });

      it('should callback kyc process - status SP1', (done) => {
        const originalToISOString = Date.prototype.toISOString;
        Date.prototype.toISOString = () => '2017-11-09T06:47:31.467Z';

        const params = {
          message: 'message',
          reference: '59f07e23b41f6373f64a8dcb',
          signature: '57b6aa8b377a4818aafa462051d319037a052f5f61ad06c763657674d8063579',
          status_code: 'SP1'
        };

        postRequest(factory.testAppForDashboardWithShuftiproProvider(), '/kyc/callback').send(params).end((err, res) => {
          expect(res.status).to.equal(200);
          getConnection().mongoManager.findOne(ShuftiproKycResult, {signature: params.signature}).then((res) => {
            expect(res.signature).to.equal(params.signature);
            getConnection().mongoManager.findOneById(Investor, new mongo.ObjectId(params.reference)).then(res => {
              expect(res.kycStatus).to.equal(KYC_STATUS_VERIFIED);
              expect(res.kycInitResult).to.deep.equal({
                message: 'message',
                reference: '59f07e23b41f6373f64a8dcb',
                signature: '57b6aa8b377a4818aafa462051d319037a052f5f61ad06c763657674d8063579',
                statusCode: 'SP1',
                timestamp: '2017-11-09T06:47:31.467Z'
              });
              Date.prototype.toISOString = originalToISOString;
              done();
            });
          });
        });
      });

      it('should callback kyc process - status SP1 (recall)', (done) => {
        const originalToISOString = Date.prototype.toISOString;
        Date.prototype.toISOString = () => '2017-11-09T06:47:31.467Z';

        const params = {
          message: 'message',
          reference: '59f07e23b41f6373f64a8dcb',
          signature: '57b6aa8b377a4818aafa462051d319037a052f5f61ad06c763657674d8063579',
          status_code: 'SP1'
        };

        const customApp = factory.testAppForDashboardWithShuftiproProvider();

        postRequest(customApp, '/kyc/callback').send(params).end((err, res) => {
          expect(res.status).to.equal(200);
          getConnection().mongoManager.findOne(ShuftiproKycResult, {signature: params.signature}).then((res) => {
            expect(res.signature).to.equal(params.signature);
            getConnection().mongoManager.findOneById(Investor, new mongo.ObjectId(params.reference)).then(res => {
              expect(res.kycStatus).to.equal(KYC_STATUS_VERIFIED);
              expect(res.kycInitResult).to.deep.equal({
                message: 'message',
                reference: '59f07e23b41f6373f64a8dcb',
                signature: '57b6aa8b377a4818aafa462051d319037a052f5f61ad06c763657674d8063579',
                statusCode: 'SP1',
                timestamp: '2017-11-09T06:47:31.467Z'
              });
              Date.prototype.toISOString = () => '2017-11-09T06:47:31.468Z';
              postRequest(customApp, '/kyc/callback').send(params).end((err, res) => {
                expect(res.status).to.equal(200);
                getConnection().mongoManager.findOne(ShuftiproKycResult, {signature: params.signature}).then((res) => {
                  expect(res.signature).to.equal(params.signature);
                  getConnection().mongoManager.findOneById(Investor, new mongo.ObjectId(params.reference)).then(res => {
                    expect(res.kycStatus).to.equal(KYC_STATUS_VERIFIED);
                    expect(res.kycInitResult).to.deep.equal({
                      message: 'message',
                      reference: '59f07e23b41f6373f64a8dcb',
                      signature: '57b6aa8b377a4818aafa462051d319037a052f5f61ad06c763657674d8063579',
                      statusCode: 'SP1',
                      timestamp: '2017-11-09T06:47:31.467Z'
                    });
                    Date.prototype.toISOString = originalToISOString;
                    done();
                  });
                });
              });
            });
          });
        });
      });

      it('should callback kyc process - status SP1 (recall with a different status)', (done) => {
        const originalToISOString = Date.prototype.toISOString;
        Date.prototype.toISOString = () => '2017-11-09T06:47:31.467Z';

        const paramsFirst = {
          message: 'message',
          reference: '59f07e23b41f6373f64a8dcb',
          signature: '57b6aa8b377a4818aafa462051d319037a052f5f61ad06c763657674d8063579',
          status_code: 'SP1'
        };

        const paramsSecond = {
          message: 'message 2',
          reference: '59f07e23b41f6373f64a8dcb',
          signature: '3d5bbb9442aecf6b19f6cfc71dda41e05bab58f63f7e019c5beb323a1b27fdcb',
          status_code: 'SP2'
        };

        const customApp = factory.testAppForDashboardWithShuftiproProvider();

        postRequest(customApp, '/kyc/callback').send(paramsFirst).end((err, res) => {
          expect(res.status).to.equal(200);
          getConnection().mongoManager.findOne(ShuftiproKycResult, {signature: paramsFirst.signature}).then((res) => {
            expect(res.signature).to.equal(paramsFirst.signature);
            getConnection().mongoManager.findOneById(Investor, new mongo.ObjectId(paramsFirst.reference)).then(res => {
              expect(res.kycStatus).to.equal(KYC_STATUS_VERIFIED);
              expect(res.kycInitResult).to.deep.equal({
                message: 'message',
                reference: '59f07e23b41f6373f64a8dcb',
                signature: '57b6aa8b377a4818aafa462051d319037a052f5f61ad06c763657674d8063579',
                statusCode: 'SP1',
                timestamp: '2017-11-09T06:47:31.467Z'
              });
              Date.prototype.toISOString = () => '2017-11-09T06:47:31.468Z';
              postRequest(customApp, '/kyc/callback').send(paramsSecond).end((err, res) => {
                expect(res.status).to.equal(200);
                getConnection().mongoManager.findOne(ShuftiproKycResult, {signature: paramsFirst.signature}).then((res) => {
                  expect(res.signature).to.equal(paramsFirst.signature);
                  getConnection().mongoManager.findOneById(Investor, new mongo.ObjectId(paramsFirst.reference)).then(res => {
                    expect(res.kycStatus).to.equal(KYC_STATUS_VERIFIED);
                    expect(res.kycInitResult).to.deep.equal({
                      message: 'message',
                      reference: '59f07e23b41f6373f64a8dcb',
                      signature: '57b6aa8b377a4818aafa462051d319037a052f5f61ad06c763657674d8063579',
                      statusCode: 'SP1',
                      timestamp: '2017-11-09T06:47:31.467Z'
                    });
                    Date.prototype.toISOString = originalToISOString;
                    done();
                  });
                });
              });
            });
          });
        });
      });

      it('should callback kyc process - manual verified', (done) => {
        const originalToISOString = Date.prototype.toISOString;
        Date.prototype.toISOString = () => '2017-11-09T06:47:31.467Z';

        const paramsSuccess = {
          message: 'verified',
          reference: 'c361c055-2ff2-43d2-8aa2-7942cf40a1b4',
          signature: '15e7dfc1057ebd2ee29e6dee8af62d4b8f86367f23c20b92ef9f5a994b4395d2',
          status_code: 'SP1'
        };

        const customApp = factory.testAppForDashboardWithShuftiproProvider();

        postRequest(customApp, '/kyc/callback').send(paramsSuccess).end((err, res) => {
          expect(res.status).to.eq(200);
          getConnection().mongoManager.findOneById(Investor, new mongo.ObjectId('59f07e23b41f6373f64a8dcb')).then(investor => {
            expect((investor.kycInitResult as ShuftiproKycResult).statusCode).to.eq('SP1');
            expect(investor.kycStatus).to.eq(KYC_STATUS_VERIFIED);
            done();
          });
        });
      });

      it('should callback kyc process - SP1 after SP0', (done) => {
        const paramsFailed = {
          message: 'not verified',
          reference: '59f07e23b41f6373f64a8dcb',
          signature: '4bbf773432d5c39452807cdc5ca11c382f2b781b6171a16c1b5e42c9fbe60132',
          status_code: 'SP0'
        };

        const paramsSuccess = {
          message: 'verified',
          reference: 'c361c055-2ff2-43d2-8aa2-7942cf40a1b4',
          signature: '15e7dfc1057ebd2ee29e6dee8af62d4b8f86367f23c20b92ef9f5a994b4395d2',
          status_code: 'SP1'
        };

        const customApp = factory.testAppForDashboardWithShuftiproProvider();

        postRequest(customApp, '/kyc/callback').send(paramsFailed).end((err, res) => {
          expect(res.status).to.eq(200);
          getConnection().mongoManager.findOneById(Investor, new mongo.ObjectId('59f07e23b41f6373f64a8dcb')).then(investor => {
            expect((investor.kycInitResult as ShuftiproKycResult).statusCode).to.eq('SP0');
            expect(investor.kycStatus).to.eq(KYC_STATUS_FAILED);
            postRequest(customApp, '/kyc/callback').send(paramsSuccess).end((err, res) => {
              expect(res.status).to.eq(200);
              getConnection().mongoManager.findOneById(Investor, new mongo.ObjectId('59f07e23b41f6373f64a8dcb')).then(investor => {
                expect((investor.kycInitResult as ShuftiproKycResult).statusCode).to.eq('SP1');
                expect(investor.kycStatus).to.eq(KYC_STATUS_VERIFIED);
                done();
              });
            });
          });
        });
      });
    });
  });
});
