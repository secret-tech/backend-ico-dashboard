import { Request, Response, NextFunction } from 'express';
import { VerificationClientType } from '../services/verify.client';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import 'reflect-metadata';
import { AuthorizedRequest } from '../requests/authorized.request';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';
import config from '../config';
import { TransactionServiceInterface, TransactionServiceType } from '../services/transaction.service';
import { IncorrectMnemonic, InsufficientEthBalance } from '../exceptions/exceptions';
import { transformReqBodyToInvestInput } from '../transformers/transformers';
import { Investor } from '../entities/investor';
import { getConnection } from 'typeorm';

import { Logger } from '../logger';
import { EmailTemplateServiceType, EmailTemplateService } from '../services/email.template.service';

const TRANSACTION_STATUS_PENDING = 'pending';

const TRANSACTION_TYPE_TOKEN_PURCHASE = 'token_purchase';

export const INVEST_SCOPE = 'invest';

/**
 * Dashboard controller
 */
@injectable()
@controller(
  '/dashboard',
  'OnlyAcceptApplicationJson'
)
export class DashboardController {
  private logger = Logger.getInstance('DASHBOARD_CONTROLLER');
  private icoContractAddresses: Array<string> = [];

  constructor(
    @inject(VerificationClientType) private verificationClient: VerificationClientInterface,
    @inject(Web3ClientType) private web3Client: Web3ClientInterface,
    @inject(TransactionServiceType) private transactionService: TransactionServiceInterface,
    @inject(EmailTemplateServiceType) private emailTemplateService: EmailTemplateService
  ) {
    this.icoContractAddresses.push(config.contracts.ico.address);
    if (config.contracts.ico.oldAddresses.length > 0) {
      this.icoContractAddresses.push(...config.contracts.ico.oldAddresses);
    }
  }

  /**
   * Get main dashboard data
   */
  @httpGet(
    '/',
    'AuthMiddleware'
  )
  async dashboard(req: AuthorizedRequest, res: Response): Promise<void> {
    const currentTokenEthPrice = await this.web3Client.getTokenEthPrice();
    const ethCollected = await this.web3Client.getEthCollected(this.icoContractAddresses);

    res.json({
      ethBalance: await this.web3Client.getEthBalance(req.user.ethWallet.address),
      tokensSold: await this.web3Client.getSoldIcoTokens(this.icoContractAddresses),
      tokenBalance: await this.web3Client.getTokenBalanceOf(req.user.ethWallet.address),
      tokenPrice: {
        ETH: (config.contracts.token.priceUsd / Number(currentTokenEthPrice)).toString(),
        USD: config.contracts.token.priceUsd.toString()
      },
      raised: {
        ETH: ethCollected,
        USD: (Number(ethCollected) * currentTokenEthPrice).toString(),
        BTC: '0'
      },
      // calculate days left and add 1 as Math.floor always rounds to less value
      daysLeft: Math.floor((config.app.icoEndTimestamp - Math.floor(Date.now() / 1000)) / (3600 * 24)) + 1
    });
  }

  @httpGet(
    '/public'
  )
  async publicData(req: Request, res: Response): Promise<void> {
    const ethCollected = await this.web3Client.getEthCollected(this.icoContractAddresses);
    const contributionsCount = await this.web3Client.getContributionsCount();

    res.json({
      tokensSold: await this.web3Client.getSoldIcoTokens(this.icoContractAddresses),
      ethCollected,
      contributionsCount,
      // calculate days left and add 1 as Math.floor always rounds to less value
      daysLeft: Math.floor((config.app.icoEndTimestamp - Math.floor(Date.now() / 1000)) / (3600 * 24)) + 1
    });
  }

  @httpGet(
    '/investTxFee'
  )
  async getCurrentInvestFee(req: Request, res: Response): Promise<void> {
    res.json(await this.web3Client.investmentFee());
  }

  /**
   * Get referral data
   */
  @httpGet(
    '/referral',
    'AuthMiddleware'
  )
  async referral(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    res.json(await this.transactionService.getReferralIncome(req.user));
  }

  /**
   * Get transaction history
   */
  @httpGet(
    '/transactions',
    'AuthMiddleware'
  )
  async transactionHistory(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    res.json(await this.transactionService.getTransactionsOfUser(req.user));
  }

  @httpPost(
    '/invest/initiate',
    'AuthMiddleware',
    'InvestValidation'
  )
  async investInitiate(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    const account = this.web3Client.getAccountByMnemonicAndSalt(req.body.mnemonic, req.user.ethWallet.salt);
    if (account.address !== req.user.ethWallet.address) {
      throw new IncorrectMnemonic('Not correct mnemonic phrase');
    }

    const logger = this.logger.sub({ email: req.user.email }, '[investInitiate] ');

    if (!req.body.gasPrice) {
      req.body.gasPrice = await this.web3Client.getCurrentGasPrice();
    }
    const txInput = transformReqBodyToInvestInput(req.body, req.user);

    logger.debug('Check sufficient balance');

    if (!(await this.web3Client.sufficientBalance(txInput))) {
      throw new InsufficientEthBalance('Insufficient funds to perform this operation and pay tx fee');
    }

    if (req.user.referral) {
      const referral = await getConnection().mongoManager.findOne(Investor, {
        email: req.user.referral.toLowerCase()
      });

      logger.debug('Check referral from whitelist');

      const addressFromWhiteList = await this.web3Client.getReferralOf(req.user.ethWallet.address);
      if (addressFromWhiteList.toLowerCase() !== referral.ethWallet.address.toLowerCase()) {
        throw Error(`Error. Please try again in few minutes. Contact ${config.app.companyName} Team if you continue to receive this`);
      }
    }

    logger.debug('Check from whitelist');

    if (!(await this.web3Client.isAllowed(req.user.ethWallet.address))) {
      throw Error(`Error. Please try again in few minutes. Contact ${config.app.companyName} Team if you continue to receive this`);
    }

    logger.debug('Initiate verification');

    const verificationResult = await this.verificationClient.initiateVerification(
      req.user.defaultVerificationMethod,
      {
        consumer: req.user.email,
        issuer: config.app.companyName,
        template: {
          fromEmail: config.email.from.general,
          subject: `You Purchase Validation Code to Use at ${config.app.companyName}`,
          body: await this.emailTemplateService.getRenderedTemplate('init-buy-tokens', { name: req.user.name })
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '01:00:00'
        },
        payload: {
          scope: INVEST_SCOPE,
          ethAmount: req.body.ethAmount.toString()
        }
      }
    );

    res.json({
      verification: verificationResult
    });
  }

  @httpPost(
    '/invest/verify',
    'AuthMiddleware',
    'InvestValidation',
    'VerificationRequiredValidation'
  )
  async investVerify(req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> {
    const account = this.web3Client.getAccountByMnemonicAndSalt(req.body.mnemonic, req.user.ethWallet.salt);
    if (account.address !== req.user.ethWallet.address) {
      throw new IncorrectMnemonic('Not correct mnemonic phrase');
    }

    const logger = this.logger.sub({ email: req.user.email }, '[investInitiate] ');

    if (req.user.referral) {
      const referral = await getConnection().mongoManager.findOne(Investor, {
        email: req.user.referral.toLowerCase()
      });

      logger.debug('Check referral from whitelist');

      const addressFromWhiteList = await this.web3Client.getReferralOf(req.user.ethWallet.address);
      if (addressFromWhiteList.toLowerCase() !== referral.ethWallet.address.toLowerCase()) {
        throw Error(`Error. Please try again in few minutes. Contact ${config.app.companyName} Team if you continue to receive this`);
      }
    }

    logger.debug('Check from whitelist');

    if (!(await this.web3Client.isAllowed(req.user.ethWallet.address))) {
      throw Error(`Error. Please try again in few minutes. Contact ${config.app.companyName} Team if you continue to receive this`);
    }

    const payload = {
      scope: INVEST_SCOPE,
      ethAmount: req.body.ethAmount.toString()
    };

    logger.debug('Validate verification');

    await this.verificationClient.checkVerificationPayloadAndCode(req.body.verification, req.user.email, payload);

    if (!req.body.gasPrice) {
      logger.debug('Get current gas price');

      req.body.gasPrice = await this.web3Client.getCurrentGasPrice();
    }
    const txInput = transformReqBodyToInvestInput(req.body, req.user);

    logger.debug('Send transaction', { tx: txInput });

    const transactionHash = await this.web3Client.sendTransactionByMnemonic(
      txInput,
      req.body.mnemonic,
      req.user.ethWallet.salt
    );

    res.json({
      transactionHash,
      status: TRANSACTION_STATUS_PENDING,
      type: TRANSACTION_TYPE_TOKEN_PURCHASE
    });
  }
}
