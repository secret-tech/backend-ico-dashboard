import { injectable, inject } from 'inversify';
import { CoinpaymentsClientType } from './coinpayments.client';
import { Investor } from '../entities/investor';
import { TransactionInMongo, TRANSACTION_IN_MONGO_STATUS_STARTED, TRANSACTION_IN_MONGO_TYPE_BUY } from '../entities/transaction.in.mongo';
import { getConnection } from 'typeorm';

@injectable()
export class PaymentsService implements PaymentsServiceInterface {
  constructor(
    @inject(CoinpaymentsClientType) private coinpaimentsClient: CoinpaymentsClientInterface
  ) { }

  async initiateBuyEths(currentUser: Investor, needTokensAmount: number, displayInCurrency: string, purchaseInCurrency: string): Promise<TransactionInMongoInterface> {
    const txCoinpaymentsData = await this.coinpaimentsClient.createTransaction({
      amount: needTokensAmount * 0.1, // todo: use convertion service
      currency: purchaseInCurrency,
      buyer_email: currentUser.email
    });

    const tx = new TransactionInMongo();
    tx.buyCoinpaymentsData = txCoinpaymentsData;
    tx.buyIpns = [];
    tx.convertIpns = [];
    tx.convertCoinpaymentsData = null;
    tx.expiredOn = txCoinpaymentsData.timeout + Date.now();
    tx.status = TRANSACTION_IN_MONGO_STATUS_STARTED;
    tx.type = TRANSACTION_IN_MONGO_TYPE_BUY;
    tx.user = currentUser;

    await getConnection().getMongoRepository(TransactionInMongo).save(tx);

    return tx;
  }
}

const PaymentsServiceType = Symbol('PaymentsServiceInterface');
export { PaymentsServiceType };
