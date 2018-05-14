import { AuthClientType } from './auth.client';
import { VerificationClientType } from './verify.client';
import { Web3ClientType, Web3ClientInterface } from './web3.client';
import { EmailQueueType, EmailQueueInterface } from '../queues/email.queue';
import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {
  UserExists,
  UserNotFound,
  InvalidPassword,
  UserNotActivated,
  TokenNotFound, ReferralDoesNotExist, ReferralIsNotActivated, AuthenticatorError, InviteIsNotAllowed, UserActivated
} from '../exceptions/exceptions';
import config from '../config';
import { Investor } from '../entities/investor';
import { VerifiedToken } from '../entities/verified.token';
import { AUTHENTICATOR_VERIFICATION, EMAIL_VERIFICATION, Verification } from '../entities/verification';
import * as transformers from '../transformers/transformers';
import { getConnection } from 'typeorm';
import * as bcrypt from 'bcrypt-nodejs';
import { KycClientType } from './kyc.client';
import { Logger } from '../logger';
import { EmailTemplateServiceType } from './email.template.service';

export const ACTIVATE_USER_SCOPE = 'activate_user';
export const LOGIN_USER_SCOPE = 'login_user';
export const CHANGE_PASSWORD_SCOPE = 'change_password';
export const RESET_PASSWORD_SCOPE = 'reset_password';
export const ENABLE_2FA_SCOPE = 'enable_2fa';
export const DISABLE_2FA_SCOPE = 'disable_2fa';

/**
 * UserService
 */
@injectable()
export class UserService implements UserServiceInterface {
  private logger = Logger.getInstance('USER_SERVICE');

  /**
   * constructor
   *
   * @param  authClient  auth service client
   * @param  verificationClient  verification service client
   * @param  web3Client web3 service client
   * @param  emailQueue email queue
   * @param  kycClient kycClient
   * @param  emailTemplateService email template service
   */
  constructor(
    @inject(AuthClientType) private authClient: AuthClientInterface,
    @inject(VerificationClientType) private verificationClient: VerificationClientInterface,
    @inject(Web3ClientType) private web3Client: Web3ClientInterface,
    @inject(EmailQueueType) private emailQueue: EmailQueueInterface,
    @inject(KycClientType) private kycClient: KycClientInterface,
    @inject(EmailTemplateServiceType) private emailTemplateService: EmailTemplateServiceInterface
  ) { }

  /**
   * Save user's data
   *
   * @param userData user info
   * @return promise
   */
  async create(userData: InputUserData): Promise<CreatedUserData> {
    const { email } = userData;
    const existingUser = await getConnection().getMongoRepository(Investor).findOne({
      email: email
    });

    if (existingUser) {
      throw new UserExists('User already exists');
    }

    const logger = this.logger.sub({ email }, '[create] ');

    if (userData.referral) {
      logger.debug('Find referral');

      const referral = await getConnection().getMongoRepository(Investor).findOne({
        email: userData.referral
      });

      if (!referral) {
        throw new ReferralDoesNotExist('Not valid referral code');
      }

      if (!referral.isVerified) {
        throw new ReferralIsNotActivated('Not valid referral code');
      }
    }

    const encodedEmail = encodeURIComponent(email);
    const link = `${ config.app.frontendUrl }/auth/signup?type=activate&code={{{CODE}}}&verificationId={{{VERIFICATION_ID}}}&email=${ encodedEmail }`;

    logger.debug('Init verification');

    const verification = await this.verificationClient.initiateVerification(EMAIL_VERIFICATION, {
      consumer: email,
      issuer: config.app.companyName,
      template: {
        fromEmail: config.email.from.general,
        subject: `Verify your email at ${config.app.companyName}`,
        body: await this.emailTemplateService.getRenderedTemplate('1_initiate_signup', {name: userData.name, link: link})
      },
      generateCode: {
        length: 6,
        symbolSet: [
          'DIGITS'
        ]
      },
      policy: {
        expiredOn: '24:00:00'
      },
      payload: {
        scope: ACTIVATE_USER_SCOPE
      }
    });

    userData.passwordHash = bcrypt.hashSync(userData.password);
    const investor = Investor.createInvestor(userData, {
      verificationId: verification.verificationId
    });

    await getConnection().mongoManager.save(investor);

    logger.debug('Create user in auth');

    await this.authClient.createUser(transformers.transformInvestorForAuth(investor));

    return transformers.transformCreatedInvestor(investor);
  }

  async resendVerification(userData: ResendVerificationInput): Promise<CreatedUserData> {
    const email = userData.email;
    const user = await getConnection().getMongoRepository(Investor).findOne({
      email: email
    });

    if (!user) {
      throw new UserNotFound('User is not found');
    }

    if (user.isVerified) {
      throw new UserActivated('User is activated already');
    }

    const logger = this.logger.sub({ email }, '[resend] ');

    const encodedEmail = encodeURIComponent(email);
    const link = `${ config.app.frontendUrl }/auth/signup?type=activate&code={{{CODE}}}&verificationId={{{VERIFICATION_ID}}}&email=${ encodedEmail }`;

    logger.debug('Resend verification');

    const verification = await this.verificationClient.resendVerification(EMAIL_VERIFICATION, {
      consumer: email,
      issuer: config.app.companyName,
      template: {
        fromEmail: config.email.from.general,
        subject: `Verify your email at ${config.app.companyName}`,
        body: await this.emailTemplateService.getRenderedTemplate('1_initiate_signup', {name: user.name, link: link})
      },
      policy: {
        expiredOn: '24:00:00',
        verificationId: user.verification.id
      },
      payload: {
        scope: ACTIVATE_USER_SCOPE
      }
    });

    user.verification = Verification.createVerification(verification);
    await getConnection().getMongoRepository(Investor).save(user);

    return transformers.transformCreatedInvestor(user);
  }

  /**
   * Save user's data
   *
   * @param loginData user info
   * @param ip string
   * @return promise
   */
  async initiateLogin(loginData: InitiateLoginInput, ip: string): Promise<InitiateLoginResult> {
    const user = await getConnection().getMongoRepository(Investor).findOne({
      email: loginData.email
    });

    if (!user) {
      throw new UserNotFound('User is not found');
    }

    if (!user.isVerified) {
      throw new UserNotActivated('Account is not activated! Please check your email.');
    }

    const passwordMatch = bcrypt.compareSync(loginData.password, user.passwordHash);

    if (!passwordMatch) {
      throw new InvalidPassword('Incorrect password');
    }

    const logger = this.logger.sub({ email: loginData.email }, '[initiateLogin] ');

    logger.debug('Login user');

    const tokenData = await this.authClient.loginUser({
      login: user.email,
      password: user.passwordHash,
      deviceId: 'device'
    });

    logger.debug('Init verification');

    const verificationData = await this.verificationClient.initiateVerification(
      user.defaultVerificationMethod,
      {
        consumer: user.email,
        issuer: config.app.companyName,
        template: {
          fromEmail: config.email.from.general,
          subject: `${config.app.companyName} Login Verification Code`,
          body: await this.emailTemplateService.getRenderedTemplate('3_initiate_signin_code', {
            name: user.name,
            datetime: new Date().toUTCString(),
            ip: ip
          })
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '01:00:00'
        },
        payload: {
          scope: LOGIN_USER_SCOPE
        }
      }
    );

    const token = VerifiedToken.createNotVerifiedToken(
      tokenData.accessToken,
      verificationData
    );

    await getConnection().getMongoRepository(VerifiedToken).save(token);

    return {
      accessToken: tokenData.accessToken,
      isVerified: false,
      verification: verificationData
    };
  }

  /**
   * Verify login
   *
   * @param inputData user info
   * @return promise
   */
  async verifyLogin(inputData: VerifyLoginInput): Promise<VerifyLoginResult> {
    const token = await getConnection().getMongoRepository(VerifiedToken).findOne({
      token: inputData.accessToken
    });

    if (!token) {
      throw new TokenNotFound('Token is not found');
    }

    if (token.verification.id !== inputData.verification.id) {
      throw new Error('Invalid verification id');
    }

    this.logger.debug('[verifyLogin] Check access token by auth');

    const verifyAuthResult = await this.authClient.verifyUserToken(inputData.accessToken);

    const user = await getConnection().getMongoRepository(Investor).findOne({
      email: verifyAuthResult.login
    });

    if (!user) {
      throw new UserNotFound('User is not found');
    }

    const logger = this.logger.sub({ email: user.email }, '[verifyLogin] ');

    const inputVerification = {
      verificationId: inputData.verification.id,
      code: inputData.verification.code,
      method: inputData.verification.method
    };

    const payload = {
      scope: LOGIN_USER_SCOPE
    };

    logger.debug('Validate verification');

    await this.verificationClient.checkVerificationPayloadAndCode(inputVerification, user.email, payload);

    token.makeVerified();
    await getConnection().getMongoRepository(VerifiedToken).save(token);

    logger.debug('Send notification');

    this.emailQueue.addJob({
      sender: config.email.from.general,
      subject: `${config.app.companyName} Successful Login Notification`,
      recipient: user.email,
      text: await this.emailTemplateService.getRenderedTemplate('5_success_signin', {
        name: user.name,
        datetime: new Date().toUTCString()
      })
    });
    return transformers.transformVerifiedToken(token);
  }

  async activate(activationData: ActivationUserData): Promise<ActivationResult> {
    const user = await getConnection().getMongoRepository(Investor).findOne({
      email: activationData.email
    });

    if (!user) {
      throw new UserNotFound('User is not found');
    }

    if (user.isVerified) {
      throw Error('User is activated already');
    }

    const logger = this.logger.sub({ email: user.email }, '[activate] ');

    const inputVerification = {
      verificationId: activationData.verificationId,
      method: EMAIL_VERIFICATION,
      code: activationData.code
    };

    const payload = {
      scope: ACTIVATE_USER_SCOPE
    };

    logger.debug('Validate verification');

    await this.verificationClient.checkVerificationPayloadAndCode(inputVerification, activationData.email, payload);

    logger.debug('Generate eth wallet');

    const mnemonic = this.web3Client.generateMnemonic();
    const salt = bcrypt.genSaltSync();
    const account = this.web3Client.getAccountByMnemonicAndSalt(mnemonic, salt);

    user.addEthWallet({
      ticker: 'ETH',
      address: account.address,
      balance: '0',
      salt
    });

    if (user.referral) {
      logger.debug('Find referral user', user.referral);

      const referral = await getConnection().getMongoRepository(Investor).findOne({
        email: user.referral
      });

      logger.debug('Add referral to the list');

      await this.web3Client.addReferralOf(account.address, referral.ethWallet.address);
    }

    logger.debug('Initialization of KYC verification');

    user.kycInitResult = await this.kycClient.init(user);
    user.isVerified = true;
    await getConnection().getMongoRepository(Investor).save(user);

    logger.debug('Login user by auth');

    const loginResult = await this.authClient.loginUser({
      login: user.email,
      password: user.passwordHash,
      deviceId: 'device'
    });

    const resultWallets: Array<NewWallet> = [
      {
        ticker: 'ETH',
        address: account.address,
        balance: '0',
        mnemonic: mnemonic,
        privateKey: account.privateKey
      }
    ];

    const token = VerifiedToken.createVerifiedToken(loginResult.accessToken);

    await getConnection().getMongoRepository(VerifiedToken).save(token);

    logger.debug('Send email notification');

    this.emailQueue.addJob({
      sender: config.email.from.general,
      recipient: user.email,
      subject: `You are officially registered for participation in ${config.app.companyName}\'s ICO`,
      text: await this.emailTemplateService.getRenderedTemplate('2_success_signup', { name: user.name })
    });

    const privateKey = config.test_fund.private_key;

    if (privateKey && this.web3Client.isHex(privateKey) && process.env.ENVIRONMENT === 'stage') {
      this.web3Client.sendTransactionByPrivateKey({
        amount: '0.1',
        to: account.address.toString(),
        gas: 21000,
        gasPrice: '4'
      }, privateKey.toString());
    }

    return {
      accessToken: loginResult.accessToken,
      wallets: resultWallets
    };
  }

  async initiateChangePassword(user: Investor, params: any): Promise<BaseInitiateResult> {
    if (!bcrypt.compareSync(params.oldPassword, user.passwordHash)) {
      throw new InvalidPassword('Invalid password');
    }

    this.logger.debug('[initiateChangePassword] Initiate verification', { meta: { email: user.email } });

    const verificationData = await this.verificationClient.initiateVerification(
      user.defaultVerificationMethod,
      {
        consumer: user.email,
        issuer: config.app.companyName,
        template: {
          fromEmail: config.email.from.general,
          subject: `Here’s the Code to Change Your Password at ${config.app.companyName}`,
          body: await this.emailTemplateService.getRenderedTemplate('27_initiate_password_change_code', { name: user.name })
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '24:00:00'
        },
        payload: {
          scope: CHANGE_PASSWORD_SCOPE
        }
      }
    );

    return {
      verification: verificationData
    };
  }

  async verifyChangePassword(user: Investor, params: any): Promise<AccessTokenResponse> {
    if (!bcrypt.compareSync(params.oldPassword, user.passwordHash)) {
      throw new InvalidPassword('Invalid password');
    }

    const logger = this.logger.sub({ email: user.email }, '[verifyChangePassword] ');

    const payload = {
      scope: CHANGE_PASSWORD_SCOPE
    };

    logger.debug('Validate verification');

    await this.verificationClient.checkVerificationPayloadAndCode(params.verification, user.email, payload);

    user.passwordHash = bcrypt.hashSync(params.newPassword);
    await getConnection().getMongoRepository(Investor).save(user);

    logger.debug('Send notification');

    this.emailQueue.addJob({
      sender: config.email.from.general,
      recipient: user.email,
      subject: `${config.app.companyName} Password Change Notification`,
      text: await this.emailTemplateService.getRenderedTemplate('28_success_password_change', { name: user.name })
    });

    logger.debug('Recreate user in auth');

    await this.authClient.createUser({
      email: user.email,
      login: user.email,
      password: user.passwordHash,
      sub: params.verification.verificationId
    });

    logger.debug('Login user in auth');

    const loginResult = await this.authClient.loginUser({
      login: user.email,
      password: user.passwordHash,
      deviceId: 'device'
    });

    const token = VerifiedToken.createVerifiedToken(loginResult.accessToken);
    await getConnection().getMongoRepository(VerifiedToken).save(token);
    return loginResult;
  }

  async initiateResetPassword(params: ResetPasswordInput): Promise<BaseInitiateResult> {
    const user = await getConnection().getMongoRepository(Investor).findOne({
      email: params.email
    });

    if (!user) {
      throw new UserNotFound('User is not found');
    }

    this.logger.debug('[initiateResetPassword] Initiate verification', { meta: { email: params.email } });

    const verificationData = await this.verificationClient.initiateVerification(
      user.defaultVerificationMethod,
      {
        consumer: user.email,
        issuer: config.app.companyName,
        template: {
          fromEmail: config.email.from.general,
          body: await this.emailTemplateService.getRenderedTemplate('6_initiate_password_reset_code', { name: user.name }),
          subject: `Here’s the Code to Reset Your Password at ${config.app.companyName}`
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '24:00:00'
        },
        payload: {
          scope: RESET_PASSWORD_SCOPE
        }
      }
    );

    return {
      verification: verificationData
    };
  }

  async verifyResetPassword(params: ResetPasswordInput): Promise<ValidationResult> {
    const user = await getConnection().getMongoRepository(Investor).findOne({
      email: params.email
    });

    if (!user) {
      throw new UserNotFound('User is not found');
    }

    const logger = this.logger.sub({ email: user.email }, '[verifyResetPassword] ');

    const payload = {
      scope: RESET_PASSWORD_SCOPE
    };

    logger.debug('Validate verification');

    const verificationResult = await this.verificationClient.checkVerificationPayloadAndCode(params.verification, params.email, payload);

    user.passwordHash = bcrypt.hashSync(params.password);
    await getConnection().getMongoRepository(Investor).save(user);

    logger.debug('Recreate user in auth');

    await this.authClient.createUser({
      email: user.email,
      login: user.email,
      password: user.passwordHash,
      sub: params.verification.verificationId
    });

    logger.debug('Send notification');

    this.emailQueue.addJob({
      sender: config.email.from.general,
      recipient: user.email,
      subject: `${config.app.companyName} Password Reset Notification`,
      text: await this.emailTemplateService.getRenderedTemplate('8_success_password_reset', { name: user.name })
    });

    return verificationResult;
  }

  async invite(user: Investor, params: any): Promise<InviteResultArray> {
    let result = [];

    for (let email of params.emails) {
      const user = await getConnection().getMongoRepository(Investor).findOne({ email });
      if (user) {
        throw new InviteIsNotAllowed(`${ email } account already exists`);
      }
    }

    const logger = this.logger.sub({ email: user.email }, '[invite] ');

    user.checkAndUpdateInvitees(params.emails);

    logger.debug('Send invites');

    for (let email of params.emails) {
      logger.debug('Send invite for', email);

      this.emailQueue.addJob({
        sender: config.email.from.referral,
        recipient: email,
        subject: `${ user.name } thinks you will like this project…`,
        text: await this.emailTemplateService.getRenderedTemplate('26_invite', {
          name: user.name,
          link: `${ config.app.frontendUrl }/auth/signup/${ user.referralCode }`
        })
      });

      result.push({
        email,
        invited: true
      });
    }

    await getConnection().getMongoRepository(Investor).save(user);
    return {
      emails: result
    };
  }

  private async initiate2faVerification(user: Investor, scope: string): Promise<InitiateResult> {
    this.logger.debug('[initiate2faVerification] Initiate verification', { meta: { email: user.email } });

    return await this.verificationClient.initiateVerification(
      AUTHENTICATOR_VERIFICATION,
      {
        consumer: user.email,
        issuer: config.app.companyName,
        policy: {
          expiredOn: '01:00:00'
        },
        payload: {
          scope
        }
      }
    );
  }

  async initiateEnable2fa(user: Investor): Promise<BaseInitiateResult> {
    if (user.defaultVerificationMethod === AUTHENTICATOR_VERIFICATION) {
      throw new AuthenticatorError('Authenticator is enabled already.');
    }

    return {
      verification: await this.initiate2faVerification(user, ENABLE_2FA_SCOPE)
    };
  }

  async verifyEnable2fa(user: Investor, params: VerificationInput): Promise<Enable2faResult> {
    if (user.defaultVerificationMethod === AUTHENTICATOR_VERIFICATION) {
      throw new AuthenticatorError('Authenticator is enabled already.');
    }

    const logger = this.logger.sub({ email: user.email }, '[verifyEnable2fa] ');

    const payload = {
      scope: ENABLE_2FA_SCOPE
    };

    logger.debug('Validate verification');

    await this.verificationClient.checkVerificationPayloadAndCode(params.verification, user.email, payload);

    user.defaultVerificationMethod = AUTHENTICATOR_VERIFICATION;

    await getConnection().getMongoRepository(Investor).save(user);

    return {
      enabled: true
    };
  }

  async initiateDisable2fa(user: Investor): Promise<BaseInitiateResult> {
    if (user.defaultVerificationMethod !== AUTHENTICATOR_VERIFICATION) {
      throw new AuthenticatorError('Authenticator is disabled already.');
    }

    return {
      verification: await this.initiate2faVerification(user, DISABLE_2FA_SCOPE)
    };
  }

  async verifyDisable2fa(user: Investor, params: VerificationInput): Promise<Enable2faResult> {
    if (user.defaultVerificationMethod !== AUTHENTICATOR_VERIFICATION) {
      throw new AuthenticatorError('Authenticator is disabled already.');
    }

    const logger = this.logger.sub({ email: user.email }, '[verifyEnable2fa] ');

    const payload = {
      scope: DISABLE_2FA_SCOPE
    };

    logger.debug('Validate verification');

    await this.verificationClient.checkVerificationPayloadAndCode(params.verification, user.email, payload, true);

    user.defaultVerificationMethod = EMAIL_VERIFICATION;

    await getConnection().getMongoRepository(Investor).save(user);

    return {
      enabled: false
    };
  }

  async getUserInfo(user: Investor): Promise<UserInfo> {
    return {
      ethAddress: user.ethWallet.address,
      email: user.email,
      name: user.name,
      kycStatus: user.kycStatus,
      defaultVerificationMethod: user.defaultVerificationMethod
    };
  }
}

const UserServiceType = Symbol('UserServiceInterface');
export { UserServiceType };
