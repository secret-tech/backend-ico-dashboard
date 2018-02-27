import { toBN, BN } from 'web3-utils';
import { injectable, inject } from 'inversify';
import config from '../../config';
import { processAsyncIteratorByChunks } from '../../helpers/helpers';
import { CoinpaymentsClientType } from './coinpayments.client';

export interface CoinpaymentsPendingTransactionsInterface {
}

const TRANSACTION_EXPIRED = 'expired';
const TRANSACTION_PENDING = 'pending';

/**
 * This service try to solve problem when IPN from coinpayments wasn't recieved after
 * half time of transaction expired period.
 */
@injectable()
export class CoinpaymentsPendingTransactions implements CoinpaymentsPendingTransactionsInterface {
  private watcherTimerId;

  constructor(
    @inject(CoinpaymentsClientType) private cpClient: CoinpaymentsClientInterface,
    @inject(CoinpaymentsIpnServiceType) private cpIpnService: any,
    @inject(CoinpaymentsPendingTransactionsRepository) private cpTransactionsRepository: any
  ) {
  }

  /**
   * Start watching of pending transactions.
   * @param intervalInSeconds
   */
  startWatcher(intervalInSeconds: number) {
    const nextTimerTick = () => {
      this.watcherTimerId = setTimeout(() => {
        this.processPendingTransactions().then(nextTimerTick, nextTimerTick);
      }, intervalInSeconds * 1000);
    };
    nextTimerTick();
  }

  /**
   * Stop watching of pending transactions.
   */
  stopWatcher() {
    if (this.watcherTimerId) {
      clearTimeout(this.watcherTimerId);
    }
  }

  /**
   * Process transactions in pending state.
   */
  async processPendingTransactions() {
    const txInPendingStateCursor = this.cpTransactionsRepository.getAllPendingTransactions();

    // @TODO: need to run in more smart concurrent mode
    await processAsyncIteratorByChunks(txInPendingStateCursor, 8, async (tx: CoinpaymentsTransaction) => {
      if (tx.expiredOn / 2 + tx.createdAt / 2 < ~~(+new Date() / 1000)) {
        // not interesting transaction yet
        return;
      }
      try {
        if (tx.expiredOn > ~~(+new Date() / 1000)) {
          tx.status = TRANSACTION_EXPIRED;
          await this.cpTransactionsRepository.save(tx);
          return;
        }

        const txCoinpaymentsData = await this.cpClient.getTransactionInfo(tx.coinpaymentsData.tx_id);
        if (txCoinpaymentsData.status == 100) {
          await this.cpIpnService.processComplete(txCoinpaymentsData);
        } else if (txCoinpaymentsData.status < 0) {
          await this.cpIpnService.processFailed(txCoinpaymentsData);
        }
      } catch (err) {
        // replace it by logger
        console.error('Process pending transaction is failed:', tx, 'Error was occurred:', err);
      }
    });
  }
}

const CoinpaymentsPendingTransactionsType = Symbol('CoinpaymentsPendingTransactionsInterface');
export { CoinpaymentsPendingTransactionsType };
