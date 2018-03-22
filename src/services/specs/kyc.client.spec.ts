import { container } from '../../ioc.container';
import { expect } from 'chai';
import { KycClientType } from "../kyc.client";
import { Investor } from "../../entities/investor";
import { KycResult } from "../../entities/kyc.result";

const KycClientService = container.get<KycClientInterface>(KycClientType);

describe('KycClient', () => {
  it('init ', async() => {
    const userData = {
      email: 'invitor@test.com',
      name: 'ICO investor',
      agreeTos: true
    };

    const verification = {
      verificationId: '123'
    };

    const investor = <Investor>Investor.createInvestor(userData, verification);

    const result = KycClientService.init(investor);

    expect(result).to.include.all.keys('timestamp', 'authorizationToken', 'jumioIdScanReference', 'clientRedirectUrl');
  });
});