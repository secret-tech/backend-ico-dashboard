import { injectable, inject } from "inversify";
import { CoinpaymentsClientType } from "./coinpayments.client";

@injectable()
export class PaymentsService implements PaymentsServiceInterface {
  constructor(
    @inject(CoinpaymentsClientType) private coinpaimentsClient: CoinpaymentsClientInterface,
  ) {  }

  async initiateBuyEths(currentUser: any, needTokensAmount: number, displayInCurrency: string, purchaseInCurrency: string): Promise<TransactionInMongo> {
    throw new Error("Method not implemented.");
  }
}

const PaymentsServiceType = Symbol('PaymentsServiceInterface');
export { PaymentsServiceType };