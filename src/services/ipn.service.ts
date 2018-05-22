import { injectable, inject } from 'inversify';
import { getConnection } from 'typeorm';
import { PaymentGateTransaction, PAYMENT_GATE_TRANSACTION_STATUS_PENDING, PAYMENT_GATE_TRANSACTION_STATUS_FAILED, PAYMENT_GATE_TRANSACTION_STATUS_STARTED, PAYMENT_GATE_TRANSACTION_TYPE_BUY, PAYMENT_GATE_TRANSACTION_STATUS_COMPLETE, PAYMENT_GATE_TRANSACTION_STATUS_INITIATE_TRANSFER_TOKENS, PAYMENT_GATE_TRANSACTION_TYPE_CONVERT } from '../entities/payment.gate.transaction';
import { IPNResponse } from '../entities/ipn.response';
import { CoinpaymentsClient, CoinpaymentsClientType } from './coinpayments/coinpayments.client';
import config from '../config';
import { Investor } from '../entities/investor';
import { Logger } from '../logger';

@injectable()
export class IPNService implements IPNServiceInterface {
  private logger = Logger.getInstance('IPN_SERVICE');

  constructor(
    @inject(CoinpaymentsClientType) private cpClient: CoinpaymentsClientInterface
  ) { }

  async processFail(data: IPNApiTypeResponse): Promise<PaymentGateTransactionInterface> {
    const logger = this.logger.sub({ ipn_id: data.ipn_id }, '[processFail] ');

    const txRepository = getConnection().mongoManager.getMongoRepository(PaymentGateTransaction);

    logger.debug('Find transaction', { txId: data.txn_id } );

    const tx: PaymentGateTransaction = await txRepository.findOne({where: {
      'buyCoinpaymentsData.txnId': data.txn_id
    }});

    if (!tx) {
      throw new Error('Transaction not found');
    }

    if ([PAYMENT_GATE_TRANSACTION_STATUS_STARTED, PAYMENT_GATE_TRANSACTION_STATUS_FAILED, PAYMENT_GATE_TRANSACTION_STATUS_PENDING].indexOf(tx.status) < 0) {
      throw new Error('Invalid status');
    }

    const ipnResponse = IPNResponse.createIPNResponse(data);

    tx.status = PAYMENT_GATE_TRANSACTION_STATUS_FAILED;
    if (tx.type === PAYMENT_GATE_TRANSACTION_TYPE_BUY) {
      tx.buyIpns.push({...ipnResponse});
    }

    return getConnection().mongoManager.save(tx);
  }

  async processPending(data: IPNApiTypeResponse): Promise<PaymentGateTransactionInterface> {
    const logger = this.logger.sub({ ipn_id: data.ipn_id }, '[processPending] ');

    const txRepository = getConnection().mongoManager.getMongoRepository(PaymentGateTransaction);

    logger.debug('Find transaction', { txn_id: data.txn_id });

    const tx: PaymentGateTransaction = await txRepository.findOne({where: {
      'buyCoinpaymentsData.txnId': data.txn_id
    }});

    if (!tx) {
      throw new Error('Transaction not found');
    }

    if ([PAYMENT_GATE_TRANSACTION_STATUS_STARTED, PAYMENT_GATE_TRANSACTION_STATUS_PENDING].indexOf(tx.status) < 0) {
      throw Error('Invalid status');
    }

    const ipnResponse = IPNResponse.createIPNResponse(data);

    tx.status = PAYMENT_GATE_TRANSACTION_STATUS_PENDING;
    if (tx.type === PAYMENT_GATE_TRANSACTION_TYPE_BUY) {
      tx.buyIpns.push({...ipnResponse});
    }

    return getConnection().mongoManager.save(tx);
  }

  async processComplete(data: IPNApiTypeResponse): Promise<PaymentGateTransactionInterface> {
    const logger = this.logger.sub({ ipnId: data.ipn_id }, '[processComplete] ');

    const txRepository = getConnection().mongoManager.getMongoRepository(PaymentGateTransaction);
    const investorRepository = getConnection().mongoManager.getMongoRepository(Investor);

    logger.debug('Find transaction', { txn_id: data.txn_id });

    const tx: PaymentGateTransaction = await txRepository.findOne({where: {
      'buyCoinpaymentsData.txnId': data.txn_id
    }});

    if (!tx) {
      throw new Error('Transaction not found');
    }

    if ([PAYMENT_GATE_TRANSACTION_STATUS_STARTED,
      PAYMENT_GATE_TRANSACTION_STATUS_PENDING].indexOf(tx.status) < 0) {
      throw Error('Invalid status');
    }

    const ipnResponse = IPNResponse.createIPNResponse(data);
    tx.buyIpns.push({...ipnResponse});
    const investor = await investorRepository.findOne({where: {email: tx.userEmail.toLowerCase()}});

    try {
      logger.debug('Convert Coins');
      tx.convertCoinpaymentsData = await this.cpClient.convertCoinsTransaction({
        amount: data.net,
        from: tx.buyCoinpaymentsData.currency2,
        to: config.coinPayments.currency1,
        address: investor.ethWallet.address
      });
      tx.type = PAYMENT_GATE_TRANSACTION_TYPE_CONVERT;
      tx.status = PAYMENT_GATE_TRANSACTION_STATUS_STARTED;
    } catch (error) {
      tx.status = PAYMENT_GATE_TRANSACTION_STATUS_FAILED;
      tx.convertCoinpaymentsData = error;
    }

    return getConnection().mongoManager.save(tx);
  }
}

const IPNServiceType = Symbol('IPNServiceInterface');
export { IPNServiceType };
