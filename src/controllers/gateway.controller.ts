import { Request, Response, NextFunction } from 'express';
import { controller, httpGet, httpPost } from 'inversify-express-utils';
import { injectable, inject } from 'inversify';
import { VerificationClientType } from '../services/verify.client';
import { IPNServiceType } from '../services/ipn.service';
import { PaymentsServiceType } from '../services/payments.service';
import { CoinpaymentsClientType, CoinPayments } from '../services/coinpayments/coinpayments.client';
import { AuthorizedRequest } from '../requests/authorized.request';
import config from '../config';
import { getConnection } from 'typeorm';
import { PaymentGateTransaction } from '../entities/payment.gate.transaction';

import { Logger } from '../logger';

const IPN_RESPONSE_STATUS_COMPLETE = 100;
const IPN_RESPONSE_STATUS_QUEUED_PAYOUT = 2;

const cpMiddleware = CoinPayments.ipn({
  merchantId: config.coinPayments.merchantId,
  merchantSecret: config.coinPayments.merchantSecret
});

@injectable()
@controller(
  '/gateway',
  'OnlyAcceptApplicationJson'
)
export class GatewayController {
  private logger = Logger.getInstance('DASHBOARD_CONTROLLER');

  constructor(
    @inject(VerificationClientType) private verificationClient: VerificationClientInterface,
    @inject(CoinpaymentsClientType) private coinpaimentsClient: CoinpaymentsClientInterface,
    @inject(PaymentsServiceType) private paymentsService: PaymentsServiceInterface,
    @inject(IPNServiceType) private ipnService: IPNServiceInterface
  ) { }

  @httpGet(
    '/currencies'
  )
  async currencies(req: Request, res: Response): Promise<void> {
    const rates = await this.coinpaimentsClient.rates({accepted: 1});
    Object.keys(rates).forEach(key => {
      if (!rates[key].accepted || !rates[key].can_convert) {
        delete rates[key];
      }
    });
    res.json(rates);
  }

  @httpPost(
    '/createTransaction',
    'AuthMiddleware'
  )
  async createTransaction(req: AuthorizedRequest, res: Response): Promise<void> {
    const logger = this.logger.sub({ email: req.user.email }, '[createTransaction] ');

    try {
      const tx = await this.paymentsService.initiateBuyEths(
        req.user,
        req.body.amount,
        config.coinPayments.currency1,
        req.body.currency
      );

      res.json(tx.buyCoinpaymentsData);
    } catch (error) {
      logger.exception(error);
      res.json(error);
    }
  }

  @httpGet(
    '/getTransactions',
    'AuthMiddleware'
  )
  async getPaymentGateTransactions(req: AuthorizedRequest, res: Response): Promise<void> {
    const paymentGateTransactionRepository = getConnection().mongoManager.getMongoRepository(PaymentGateTransaction);
    const txs = await paymentGateTransactionRepository.find({
      where: {userEmail: req.user.email}
    });

    res.json(txs);
  }

  @httpPost(
    '/ipn',
    (req, res, next) => cpMiddleware(req, {end: () => {}}, next)
  )
  async ipn(req: Request, res: Response, next): Promise<void> {
    const logger = this.logger.sub({ ipnId: req.body.ipn_id }, '[IPN Handler] ');
    try {
      if (req.body.status >= IPN_RESPONSE_STATUS_COMPLETE) {
        // complete
        await this.ipnService.processComplete(req.body);
      } else if (req.body.status < 0) {
        // fail
        await this.ipnService.processFail(req.body);
      } else {
        // pending
        await this.ipnService.processPending(req.body);
      }

      res.end('IPN OK');
    } catch (error) {
      logger.exception(error);
      res.end('IPN Error: ' + error);
    }
  }
}
