import { container } from '../../ioc.container';
import { expect } from 'chai';
import { KycClientType } from "../kyc.client";
import { Investor } from "../../entities/investor";
import {getConnection} from "typeorm";

const KycClientService = container.get<KycClientInterface>(KycClientType);

describe('KycClient', () => {
  it('init ', async() => {
    const userData = {
      email: 'investortesting@test.com',
      name: 'ICO test investor',
      agreeTos: true,
    };

    const verification = {
      verificationId: '1234'
    };

    const investor = <Investor>Investor.createInvestor(userData, verification);

    await getConnection().mongoManager.save(investor);

    const result = await KycClientService.init(investor);

    expect(result).to.include.all.keys('timestamp', 'authorizationToken', 'jumioIdScanReference', 'clientRedirectUrl');

    getConnection().mongoManager.remove(investor);
  });
});