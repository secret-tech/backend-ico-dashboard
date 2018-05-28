import { container } from '../../ioc.container';
import { expect } from 'chai';
import { Investor } from '../../entities/investor';
import { getConnection } from 'typeorm';
import { KycProviderType } from '../../types';
import config from '../../config';
import * as nock from 'nock';

const kycProvider = container.get<KycProviderInterface>(KycProviderType);

describe('jumioProvider', () => {
  before(() => {
    const jumioEndpoint = nock(config.kyc.jumio.baseUrl)
      .post('/initiateNetverify').reply(200, {
        timestamp: '2017-11-09T06:47:31.467Z',
        authorizationToken: 'c87447f8-fa43-4f98-a933-3c88be4e86ea',
        clientRedirectUrl: 'https://lon.netverify.com/widget/jumio-verify/2.0/form?authorizationToken=c87447f8-fa43-4f98-a933-3c88be4e86ea',
        jumioIdScanReference: '7b58a08e-19cf-4d28-a828-4bb577c6f69a'
      });
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

    expect(result).to.include.all.keys('timestamp', 'authorizationToken', 'jumioIdScanReference', 'clientRedirectUrl');

    getConnection().mongoManager.remove(investor);
  });
});
