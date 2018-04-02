import { injectable, inject } from 'inversify';
import { CoinpaymentsClientType } from './coinpayments/coinpayments.client';
import { Investor } from '../entities/investor';
import { PaymentGateTransaction, PAYMENT_GATE_TRANSACTION_STATUS_STARTED, PAYMENT_GATE_TRANSACTION_TYPE_BUY } from '../entities/payment.gate.transaction';
import { getConnection } from 'typeorm';

@injectable()
export class PaymentsService implements PaymentsServiceInterface {
  constructor(
    @inject(CoinpaymentsClientType) private coinpaimentsClient: CoinpaymentsClientInterface
  ) { }

  async initiateBuyEths(currentUser: Investor, amount: number, displayInCurrency: string, purchaseInCurrency: string): Promise<PaymentGateTransactionInterface> {
    const txCoinpaymentsData = await this.coinpaimentsClient.createTransaction({
      amount: amount,
      currency: purchaseInCurrency,
      buyer_email: currentUser.email
    });

    const tx = new PaymentGateTransaction();
    tx.buyCoinpaymentsData = txCoinpaymentsData;
    tx.buyIpns = [];
    tx.convertCoinpaymentsData = null;
    tx.expiredOn = txCoinpaymentsData.timeout + Date.now();
    tx.status = PAYMENT_GATE_TRANSACTION_STATUS_STARTED;
    tx.type = PAYMENT_GATE_TRANSACTION_TYPE_BUY;
    tx.userEmail = currentUser.email;
    tx.timestamp = Date.now();

    await getConnection().getMongoRepository(PaymentGateTransaction).save(tx);

    return tx;
  }
}

const PaymentsServiceType = Symbol('PaymentsServiceInterface');
export { PaymentsServiceType };
