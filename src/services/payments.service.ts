import { injectable } from "inversify";

@injectable()
export class PaymentsService implements PaymentsServiceInterface {
  initiateBuyEths(currentUser: any, needTokensAmount: number, displayInCurrency: number, purchaseInCurrency: number) {
    throw new Error("Method not implemented.");
  }
}

const PaymentsServiceType = Symbol('PaymentsServiceInterface');
export { PaymentsServiceType };