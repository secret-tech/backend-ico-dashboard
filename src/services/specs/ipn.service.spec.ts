import { container } from '../../ioc.container';
import { expect } from 'chai';
import { IPNServiceType } from '../ipn.service';
import { getConnection } from 'typeorm';
import { PaymentGateTransaction, PAYMENT_GATE_TRANSACTION_STATUS_FAILED, PAYMENT_GATE_TRANSACTION_STATUS_PENDING, PAYMENT_GATE_TRANSACTION_TYPE_CONVERT } from '../../entities/payment.gate.transaction';
import { IPNResponse } from '../../entities/ipn.response';
import { CoinpaymentsClient, CoinpaymentsClientType } from '../coinpayments.client';
import * as TypeMoq from 'typemoq';
import { CoinpaymentsTransactionResult } from '../../entities/coinpayments.transaction.result';

const mongo = require('mongodb');

describe('ipn service', () => {
  it('process fail', async() => {
    const ipnService = container.get<IPNServiceInterface>(IPNServiceType);
    const ipnResponse = IPNResponse.createIPNResponse({
      ipn_version: '1.0',
      ipn_id: '17549438956480f7fddadbd6a7f387f8',
      ipn_mode: 'hmac',
      merchant: '123',
      ipn_type: 'api',
      txn_id: 'abc123',
      status: '-1',
      status_text: 'Fail...',
      currency1: 'ETH',
      currency2: 'BTC',
      amount1: '1',
      amount2: '0.1',
      fee: '0.00025',
      buyer_name: 'CoinPayments API',
      received_amount: '0',
      received_confirms: '0'
    });

    await ipnService.processFail(ipnResponse);

    const tx = await getConnection().mongoManager.getMongoRepository(PaymentGateTransaction).findOne({
      where: {
        'buyCoinpaymentsData.txn_id': 'abc123'
      }
    });

    expect(tx.status).to.eq(PAYMENT_GATE_TRANSACTION_STATUS_FAILED);
    expect(tx.buyIpns[0]).to.contain(ipnResponse);
  });

  it('process pending', async() => {
    const ipnService = container.get<IPNServiceInterface>(IPNServiceType);
    const ipnResponse = IPNResponse.createIPNResponse({
      ipn_version: '1.0',
      ipn_id: '17549438956480f7fddadbd6a7f387f8',
      ipn_mode: 'hmac',
      merchant: '123',
      ipn_type: 'api',
      txn_id: 'abc123',
      status: '-1',
      status_text: 'Fail...',
      currency1: 'ETH',
      currency2: 'BTC',
      amount1: '1',
      amount2: '0.1',
      fee: '0.00025',
      buyer_name: 'CoinPayments API',
      received_amount: '0',
      received_confirms: '0'
    });

    await ipnService.processPending(ipnResponse);

    const tx = await getConnection().mongoManager.getMongoRepository(PaymentGateTransaction).findOne({
      where: {
        'buyCoinpaymentsData.txn_id': 'abc123'
      }
    });

    expect(tx.status).to.eq(PAYMENT_GATE_TRANSACTION_STATUS_PENDING);
    expect(tx.buyIpns[0]).to.contain(ipnResponse);
  });

  it('process complete', async() => {
    const cpMock = TypeMoq.Mock.ofType(CoinpaymentsClient);
    const converResult = {id: 'abc123'};
    const ipnResponse = IPNResponse.createIPNResponse({
      ipn_version: '1.0',
      ipn_id: '17549438956480f7fddadbd6a7f387f8',
      ipn_mode: 'hmac',
      merchant: '123',
      ipn_type: 'api',
      txn_id: 'abc123',
      status: '100',
      status_text: 'Complete...',
      currency1: 'ETH',
      currency2: 'BTC',
      amount1: '1',
      amount2: '0.1',
      fee: '0.00025',
      buyer_name: 'CoinPayments API',
      received_amount: '0',
      received_confirms: '0'
    });
    cpMock.setup(x => x.convertCoinsTransaction(TypeMoq.It.isAny())).returns(async(): Promise<any> => converResult);
    container.rebind<CoinpaymentsClientInterface>(CoinpaymentsClientType).toConstantValue(cpMock.object);

    const ipnService = container.get<IPNServiceInterface>(IPNServiceType);

    const tx = await ipnService.processComplete(ipnResponse);

    expect(tx.type).to.eq(PAYMENT_GATE_TRANSACTION_TYPE_CONVERT);
  });
});
