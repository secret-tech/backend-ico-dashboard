import * as Bull from 'bull';
import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import config from '../config';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import { getConnection } from 'typeorm';
import { Investor, KYC_STATUS_VERIFIED } from '../entities/investor';
import { Logger } from '../logger';

export interface Web3QueueInterface {
}

@injectable()
export class Web3Queue implements Web3QueueInterface {
  private logger = Logger.getInstance('WEB3_QUEUE');
  private queueWrapper: any;

  constructor(
    @inject(Web3ClientType) private web3Client: Web3ClientInterface
  ) {
    this.queueWrapper = new Bull('check_whitelist', config.redis.url);
    this.queueWrapper.process((job) => {
      return this.checkWhiteList(job);
    });
    this.queueWrapper.add({}, {repeat: {cron: '*/10 * * * *'}});
    this.queueWrapper.on('error', (error) => {
      this.logger.exception(error);
    });
    this.logger.verbose('Email web3 worker started');
  }

  async checkWhiteList(job: any) {
    const logger = this.logger.sub(null, '[checkWhiteList] ');

    // restore investors to whitelist if they are not there
    const verifiedInvestors = await getConnection().mongoManager.find(Investor, {
      kycStatus: KYC_STATUS_VERIFIED
    });

    logger.debug('Process investors for whitelist', verifiedInvestors.length);
    for (let investor of verifiedInvestors) {
      if (!investor.ethWallet || !investor.ethWallet.address) {
        logger.error('Invalid investor record:', investor.email);
        continue;
      }
      if (!(await this.web3Client.isAllowed(investor.ethWallet.address))) {
        logger.info(`adding to whitelist: ${ investor.ethWallet.address }`);
        await this.web3Client.addAddressToWhiteList(investor.ethWallet.address);
      }
    }

    // check that referrals were added and add them if not
    const investorsWithReferral = await getConnection().mongoManager.createEntityCursor(Investor, {
      referral: {
        '$ne': null
      }
    }).toArray();

    logger.debug('Process investors for referral', investorsWithReferral.length);
    for (let investor of investorsWithReferral) {
      if (!investor.ethWallet || !investor.ethWallet.address) {
        logger.error('Invalid investor record:', investor.email);
        continue;
      }

      const referral = await getConnection().mongoManager.findOne(Investor, {
        email: investor.referral.toLowerCase()
      });

      if (referral) {
        if (!referral.ethWallet || !referral.ethWallet.address) {
          logger.error('Invalid referral record:', referral.email);
          continue;
        }

        const addressFromWhiteList = await this.web3Client.getReferralOf(investor.ethWallet.address);
        if (addressFromWhiteList.toLowerCase() !== referral.ethWallet.address.toLowerCase()) {
          this.logger.info(`adding referral of: ${ investor.ethWallet.address } , ${ referral.ethWallet.address }`);
          await this.web3Client.addReferralOf(investor.ethWallet.address, referral.ethWallet.address);
        }
      }
    }

    return true;
  }
}
