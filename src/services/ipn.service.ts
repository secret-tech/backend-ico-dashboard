import { injectable, inject } from 'inversify';
import { getConnection } from 'typeorm';
import { TransactionInMongo, TRANSACTION_IN_MONGO_STATUS_PENDING, TRANSACTION_IN_MONGO_STATUS_FAILED, TRANSACTION_IN_MONGO_STATUS_STARTED, TRANSACTION_IN_MONGO_TYPE_BUY, TRANSACTION_IN_MONGO_STATUS_COMPLETE, TRANSACTION_IN_MONGO_STATUS_INITIATE_TRANSFER_TOKENS, TRANSACTION_IN_MONGO_TYPE_CONVERT } from '../entities/transaction.in.mongo';
import { IPNResponse } from '../entities/ipn.response';
import { CoinpaymentsClient, CoinpaymentsClientType } from './coinpayments.client';
import config from '../config';

@injectable()
export class IPNService implements IPNServiceInterface {

  constructor(
    @inject(CoinpaymentsClientType) private cpClient: CoinpaymentsClientInterface
  ) { }

  async processFail(data: any) {
    const txRepository = getConnection().mongoManager.getMongoRepository(TransactionInMongo);
    const tx: TransactionInMongo = await txRepository.findOne({where: {
      'buyCoinpaymentsData.txn_id': data.txn_id
    }});

    if (!tx) {
      throw new Error('Transaction not found');
    }

    if ([TRANSACTION_IN_MONGO_STATUS_STARTED, TRANSACTION_IN_MONGO_STATUS_FAILED, TRANSACTION_IN_MONGO_STATUS_PENDING].indexOf(tx.status) < 0) {
      throw new Error('Invalid status');
    }

    const ipnResponse = IPNResponse.createIPNResponse(data);

    tx.status = TRANSACTION_IN_MONGO_STATUS_FAILED;
    if (tx.type === TRANSACTION_IN_MONGO_TYPE_BUY) {
      tx.buyIpns.push({...ipnResponse, timestamp: Date.now()});
    } else {
      tx.convertIpns.push({...ipnResponse, timestamp: Date.now()});
    }

    getConnection().mongoManager.save(tx);
  }

  async processPending(data: any) {
    const txRepository = getConnection().mongoManager.getMongoRepository(TransactionInMongo);
    const tx: TransactionInMongo = await txRepository.findOne({where: {
      'buyCoinpaymentsData.txn_id': data.txn_id
    }});

    if (!tx) {
      throw new Error('Transaction not found');
    }

    if ([TRANSACTION_IN_MONGO_STATUS_STARTED, TRANSACTION_IN_MONGO_STATUS_PENDING].indexOf(tx.status) < 0) {
      throw Error('Invalid status');
    }

    const ipnResponse = IPNResponse.createIPNResponse(data);

    tx.status = TRANSACTION_IN_MONGO_STATUS_PENDING;
    if (tx.type === TRANSACTION_IN_MONGO_TYPE_BUY) {
      tx.buyIpns.push({...ipnResponse, timestamp: Date.now()});
    } else {
      tx.convertIpns.push({...ipnResponse, timestamp: Date.now()});
    }

    getConnection().mongoManager.save(tx);
  }

  async processComplete(data: any) {
    const txRepository = getConnection().mongoManager.getMongoRepository(TransactionInMongo);
    const tx: TransactionInMongo = await txRepository.findOne({where: {
      'buyCoinpaymentsData.txn_id': data.txn_id
    }});

    if (!tx) {
      throw new Error('Transaction not found');
    }

    if ([TRANSACTION_IN_MONGO_STATUS_STARTED, TRANSACTION_IN_MONGO_STATUS_PENDING, TRANSACTION_IN_MONGO_STATUS_INITIATE_TRANSFER_TOKENS].indexOf(tx.status) < 0) {
      throw Error('Invalid status');
    }

    const ipnResponse = IPNResponse.createIPNResponse(data);
    tx.status = TRANSACTION_IN_MONGO_STATUS_COMPLETE;
    if (tx.type === TRANSACTION_IN_MONGO_TYPE_BUY) {
      tx.buyIpns.push({...ipnResponse, timestamp: Date.now()});
    } else {
      tx.convertIpns.push({...ipnResponse, timestamp: Date.now()});
    }

    if (tx.type !== TRANSACTION_IN_MONGO_TYPE_BUY) {
      return;
    }

    tx.type = TRANSACTION_IN_MONGO_TYPE_CONVERT;
    tx.status = TRANSACTION_IN_MONGO_STATUS_STARTED;
    getConnection().mongoManager.save(tx);

    tx.convertCoinpaymentsData = await this.cpClient.convertCoinsTransaction({
      amount: tx.buyCoinpaymentsData.amount,
      from: tx.buyCoinpaymentsData.currency2,
      to: config.coinPayments.currency1,
      address: tx.user.ethWallet.address
    });

    tx.status = TRANSACTION_IN_MONGO_STATUS_PENDING;

    getConnection().mongoManager.save(tx);
  }
}

const IPNServiceType = Symbol('IPNServiceInterface');
export { IPNServiceType };
