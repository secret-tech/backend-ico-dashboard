import { container } from '../../ioc.container';
import { expect } from 'chai';
import { Investor } from '../../entities/investor';
import { getConnection } from 'typeorm';
import { KycProviderType } from '../../types';

const kycProvider = container.get<KycProviderInterface>(KycProviderType);

describe('jumioProvider', () => {
  it('init ', async() => {
    const userData = {
      email: 'investortesting@test.com',
      name: 'ICO test investor',
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
