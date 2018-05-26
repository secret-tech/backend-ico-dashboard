import * as chai from 'chai';
import * as bcrypt from 'bcrypt-nodejs';
import { base64encode } from '../../helpers/helpers';
import config from '../../config';
import { Investor } from '../../entities/investor';
import { getConnection, ObjectID } from 'typeorm';
import { expect } from 'chai';
import * as nock from 'nock';
import { container } from '../../ioc.container';
import { KycProviderType } from '../../types';
import { ShuftiproProvider } from '../kyc/shuftipro.provider';
import { Web3ClientType } from '../../services/web3.client';
import { ShuftiproKycResult } from '../../entities/shuftipro.kyc.result';

process.env.KYC_PROVIDER = 'SHUFTIPRO';
config.kyc.enabled = true;

const mongo = require('mongodb');
container.rebind<KycProviderInterface>(KycProviderType).toConstantValue(new ShuftiproProvider(container.get(Web3ClientType)));
const kycProvider = container.get<KycProviderInterface>(KycProviderType);

describe('ShuftiPro Provider', () => {
  before(() => {
    nock.cleanAll();
    const shuftiProEndpoint = nock(config.kyc.shuftipro.baseUrl)
      .post('/')
      .reply(200, {
        message: 'link to form',
        reference: '061af401-d049-4aab-a899-b3f57861eb5e',
        signature: '2c7cfea8f19b9372facaaeaa84e3519557b23fd15f54a6cb01febfa84356d4b9',
        status_code: 'SP2'
      });
  });

  after(() => {
    config.kyc.enabled = false;
    config.kyc.provider = 'JUMIO';
  });

  it('init ', async() => {
    const userData = {
      email: 'investortesting@test.com',
      firstName: 'ICO',
      lastName: 'test investor',
      phone: '+45550000000',
      country: 'ru',
      dob: '1970-01-01',
      agreeTos: true
    };

    const verification = {
      verificationId: '1234'
    };

    const investor = Investor.createInvestor(userData, verification) as Investor;

    await getConnection().mongoManager.save(investor);

    const result = await kycProvider.init(investor);
    expect(result).to.include.all.keys('timestamp', 'status_code', 'message', 'reference', 'signature');

    const shuftyproKycResult = await getConnection().mongoManager.findOne(ShuftiproKycResult, { user: investor.id });
    expect(shuftyproKycResult).to.include.all.keys('id', 'statusCode', 'message', 'reference', 'signature', 'timestamp', 'user');

    getConnection().mongoManager.remove(investor);
  });
});
