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

process.env.KYC_PROVIDER = 'SHUFTIPRO';
config.kyc.enabled = true;

const mongo = require('mongodb');
container.rebind<KycProviderInterface>(KycProviderType).toConstantValue(new ShuftiproProvider(container.get(Web3ClientType)));
const kycProvider = container.get<KycProviderInterface>(KycProviderType);

const shuftiProEndpoint = nock(config.kyc.shuftipro.baseUrl)
  .post('/')
  .reply(200, {
    message: 'message',
    reference: 'reference',
    signature: '7e187432995e0a82442091b574dd297643f242eafc346775f96472f7dd3be752',
    status_code: 'SP2'
  });

describe('ShuftiPro Provider', () => {
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

    getConnection().mongoManager.remove(investor);
  });
});
