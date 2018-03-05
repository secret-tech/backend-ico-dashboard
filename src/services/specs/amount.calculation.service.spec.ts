import * as TypeMoq from 'typemoq';
import { expect } from 'chai';
import { FeeCalculationInterface, CoinpaymentsFeeService } from '../coinpayments/coinpayments.fee.service';
import { Web3ClientInterface, Web3Client } from '../web3.client';
import { AmountCalculationService, DefaultJcrTokenPriceProvider, FixedTokenPriceProvider } from '../amount.calculation.service';

describe('AmountCalculationService', () => {
  let feeCalcMock: TypeMoq.IMock<FeeCalculationInterface>;
  let web3Mock: TypeMoq.IMock<Web3ClientInterface>;
  let amountSvc: AmountCalculationService;

  beforeEach(() => {
    feeCalcMock = TypeMoq.Mock.ofType<FeeCalculationInterface>(CoinpaymentsFeeService);
    web3Mock = TypeMoq.Mock.ofType<Web3ClientInterface>(Web3Client);
    web3Mock.setup((x) => x.queryIcoMethod(TypeMoq.It.isAny()))
      .returns(async () => 1000);
    web3Mock.setup((x) => x.getCurrentGasPrice())
      .returns(async () => '100');

    amountSvc = new AmountCalculationService(web3Mock.object, feeCalcMock.object);
  });

  it('should calculate in currency by tokens amount with default price provider', async () => {
    feeCalcMock.setup((x) => x.calculateWithAccountOfAllFee(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
      .returns(async () => 10000);

    const priceProvider = new DefaultJcrTokenPriceProvider(10);
    expect(await amountSvc.calculateFromTokensAmount(priceProvider, 10000, 'ETH', 'ETH'))
      .is.eq(10000);
  });

  it('should calculate in tokens amount by currency amount with default price provider', async () => {
    feeCalcMock.setup((x) => x.calculateWithAllFee(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
      .returns(async () => 10000);

    const priceProvider = new DefaultJcrTokenPriceProvider(10);
    expect(await amountSvc.calculateFromPayInCurrency(priceProvider, 10000, 'ETH', 10))
      .is.eq(9000);
  });

  it('should calculate in currency by tokens amount with default price provider', async () => {
    feeCalcMock.setup((x) => x.calculateWithAccountOfAllFee(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
      .returns(async () => 10000);

    const priceProvider = new FixedTokenPriceProvider(10, 20, 30);
    expect(await amountSvc.calculateFromTokensAmount(priceProvider, 10000, 'ETH', 'ETH'))
      .is.eq(10000);
  });

  it('should calculate in tokens amount by currency amount with default price provider', async () => {
    feeCalcMock.setup((x) => x.calculateWithAllFee(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
      .returns(async () => 10000);

    const priceProvider = new FixedTokenPriceProvider(1, 1000, 0.0001);
    expect(await amountSvc.calculateFromPayInCurrency(priceProvider, 1, 'ETH', 1000))
      .is.eq(90000000);
  });
});
