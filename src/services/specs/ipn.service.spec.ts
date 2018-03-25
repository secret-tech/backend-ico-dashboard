import { container } from '../../ioc.container';
import { expect } from 'chai';
import { IPNServiceType } from '../ipn.service';
import { getConnection } from 'typeorm';
import { PaymentGateTransaction, PAYMENT_GATE_TRANSACTION_STATUS_FAILED, PAYMENT_GATE_TRANSACTION_STATUS_PENDING, PAYMENT_GATE_TRANSACTION_TYPE_CONVERT, PAYMENT_GATE_TRANSACTION_TYPE_BUY, PAYMENT_GATE_TRANSACTION_STATUS_STARTED } from '../../entities/payment.gate.transaction';
import { IPNResponse } from '../../entities/ipn.response';
import { CoinpaymentsClient, CoinpaymentsClientType } from '../coinpayments/coinpayments.client';
import * as TypeMoq from 'typemoq';
import { CoinpaymentsTransactionResult } from '../../entities/coinpayments.transaction.result';

const mongo = require('mongodb');

describe('IPN Service', () => {
  describe('Payment gate transaction type BUY', () => {
    it('Process Fail', async() => {
      const ipnService = container.get<IPNServiceInterface>(IPNServiceType);
      const rawResponse = {
        ipn_version: '1.0',
        ipn_id: '17549438956480f7fddadbd6a7f387f8',
        ipn_mode: 'hmac',
        merchant: '123',
        ipn_type: 'api',
        txn_id: 'abc123',
        status: -1,
        status_text: 'Fail...',
        currency1: 'ETH',
        currency2: 'BTC',
        amount1: '1',
        amount2: '0.1',
        fee: '0.00025',
        buyer_name: 'CoinPayments API',
        received_amount: '0',
        received_confirms: '0'
      };
      const ipnResponse = IPNResponse.createIPNResponse(rawResponse);
      const tx = await ipnService.processFail(rawResponse);

      expect(tx.status).to.eq(PAYMENT_GATE_TRANSACTION_STATUS_FAILED);
      expect(tx.type).to.eq(PAYMENT_GATE_TRANSACTION_TYPE_BUY);
      expect(tx.buyIpns.length).to.eq(1);
      expect(tx.buyIpns[0]).to.contain(ipnResponse);
    });

    it('Process Pending', async() => {
      const ipnService = container.get<IPNServiceInterface>(IPNServiceType);
      const rawResponse = {
        ipn_version: '1.0',
        ipn_id: '17549438956480f7fddadbd6a7f387f8',
        ipn_mode: 'hmac',
        merchant: '123',
        ipn_type: 'api',
        txn_id: 'abc123',
        status: 0,
        status_text: 'Pending...',
        currency1: 'ETH',
        currency2: 'BTC',
        amount1: '1',
        amount2: '0.1',
        fee: '0.00025',
        buyer_name: 'CoinPayments API',
        received_amount: '0',
        received_confirms: '0'
      };
      const ipnResponse = IPNResponse.createIPNResponse(rawResponse);
      const tx = await ipnService.processPending(rawResponse);

      expect(tx.status).to.eq(PAYMENT_GATE_TRANSACTION_STATUS_PENDING);
      expect(tx.type).to.eq(PAYMENT_GATE_TRANSACTION_TYPE_BUY);
      expect(tx.buyIpns.length).to.eq(1);
      expect(tx.buyIpns[0]).to.contain(ipnResponse);
    });

    it('Process Complete', async() => {
      const cpMock = TypeMoq.Mock.ofType(CoinpaymentsClient);
      const converResult = {id: 'abc123'};
      const rawResponse = {
        ipn_version: '1.0',
        ipn_id: '17549438956480f7fddadbd6a7f387f8',
        ipn_mode: 'hmac',
        merchant: '123',
        ipn_type: 'api',
        txn_id: 'abc123',
        status: 100,
        status_text: 'Complete...',
        currency1: 'ETH',
        currency2: 'BTC',
        amount1: '1',
        amount2: '0.1',
        fee: '0.00025',
        net: '0.09975',
        buyer_name: 'CoinPayments API',
        received_amount: '0.1',
        received_confirms: '2'
      };
      const ipnResponse = IPNResponse.createIPNResponse(rawResponse);

      cpMock.setup(x => x.convertCoinsTransaction(TypeMoq.It.isAny())).returns(async(): Promise<any> => converResult);
      container.rebind<CoinpaymentsClientInterface>(CoinpaymentsClientType).toConstantValue(cpMock.object);

      const ipnService = container.get<IPNServiceInterface>(IPNServiceType);
      const tx = await ipnService.processComplete(rawResponse);

      expect(tx.type).to.eq(PAYMENT_GATE_TRANSACTION_TYPE_CONVERT);
      expect(tx.status).to.eq(PAYMENT_GATE_TRANSACTION_STATUS_STARTED);
      expect(tx.buyIpns.length).to.eq(1);
      expect(tx.convertCoinpaymentsData).to.contain(converResult);
      expect(tx.buyIpns[0]).to.contain(ipnResponse);
      expect(tx.buyIpns[0].net).to.eq('0.09975');
    });
  });
});
