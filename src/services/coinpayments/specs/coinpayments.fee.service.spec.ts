import { readFileSync } from 'fs';
import { expect } from 'chai';
import { toBN, BN } from 'web3-utils';
import * as TypeMoq from 'typemoq';
import { CoinpaymentsClient } from '../coinpayments.client';
import { CoinpaymentsFeeService } from '../coinpayments.fee.service';

describe('CoinpaymentsFeeService', () => {
  const ratesDataFixture = JSON.parse(readFileSync(__dirname + '/../../../../test/fixtures/coinpayments/rates.json', 'utf-8'));
  let coinpaymentsMock: TypeMoq.IMock<CoinpaymentsClientInterface>;
  let cpSvcFee: CoinpaymentsFeeService;

  beforeEach(() => {
    coinpaymentsMock = TypeMoq.Mock.ofType<CoinpaymentsClientInterface>(CoinpaymentsClient);
    coinpaymentsMock.setup((x) => x.rates(TypeMoq.It.isAny())).returns(async () => ratesDataFixture);

    cpSvcFee = new CoinpaymentsFeeService(coinpaymentsMock.object);
  });

  it('should calculate btc only with account of all tx fee', async () => {
    expect(await cpSvcFee.calculateWithAccountOfAllFee(
      'BTC',
      1,
      'BTC',
      'BTC'
    )).is.equal(1.005729136023357);
  });

  it('should calculate btc with with tx fee', async () => {
    expect(await cpSvcFee.calculateWithAllFee(
      'BTC',
      1,
      'BTC',
      'BTC'
    )).is.equal(0.9943035);
  });

  it('should calculate btc result conversions', async () => {
    const withAccountOfFee = await cpSvcFee.calculateWithAccountOfAllFee(
      'BTC',
      1,
      'ETH',
      'USD'
    );

    expect(await cpSvcFee.calculateWithAllFee(
      'ETH',
      withAccountOfFee,
      'BTC',
      'USD'
    )).is.closeTo(1.0, 1e-8);
  });
});
