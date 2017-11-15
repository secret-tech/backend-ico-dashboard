import { AuthClientType } from './auth.client';
import { VerificationClientType } from './verify.client';
import { Web3ClientType, Web3ClientInterface } from './web3.client';
import { EmailQueueType, EmailQueueInterface } from '../queues/email.queue';
import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import initiateSignUpTemplate from '../emails/1_initiate_signup';
import successSignUpTemplate from '../emails/2_success_signup';
import initiateSignInCodeTemplate from '../emails/3_initiate_signin_code';
import successSignInTemplate from '../emails/5_success_signin';
import initiatePasswordResetTemplate from '../emails/6_initiate_password_reset_code';
import successPasswordResetTemplate from '../emails/8_success_password_reset';
import inviteTemplate from '../emails/26_invite';
import initiatePasswordChangeTemplate from '../emails/27_initiate_password_change_code';
import successPasswordChangeTemplate from '../emails/28_success_password_change';

import {
  UserExists,
  UserNotFound,
  InvalidPassword,
  UserNotActivated,
  TokenNotFound, ReferralDoesNotExist, ReferralIsNotActivated, AuthenticatorError, InviteIsNotAllowed
} from '../exceptions/exceptions';
import config from '../config';
import { Investor } from '../entities/investor';
import { VerifiedToken } from '../entities/verified.token';
import { AUTHENTICATOR_VERIFICATION, EMAIL_VERIFICATION } from '../entities/verification';
import * as transformers from '../transformers/transformers';
import { getConnection } from 'typeorm';
import * as bcrypt from 'bcrypt-nodejs';

/**
 * UserService
 */
@injectable()
export class UserService implements UserServiceInterface {

  /**
   * constructor
   *
   * @param  authClient  auth service client
   * @param  verificationClient  verification service client
   * @param  web3Client web3 service client
   * @param  emailQueue email queue
   */
  constructor(
    @inject(AuthClientType) private authClient: AuthClientInterface,
    @inject(VerificationClientType) private verificationClient: VerificationClientInterface,
    @inject(Web3ClientType) private web3Client: Web3ClientInterface,
    @inject(EmailQueueType) private emailQueue: EmailQueueInterface
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

    if (userData.referral) {
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

    const verification = await this.verificationClient.initiateVerification(EMAIL_VERIFICATION, {
      consumer: email,
      issuer: 'Jincor',
      template: {
        fromEmail: config.email.from.general,
        subject: 'Verify your email at Jincor.com',
        body: initiateSignUpTemplate(userData.name),
      },
      generateCode: {
        length: 6,
        symbolSet: [
          'DIGITS'
        ]
      },
      policy: {
        expiredOn: '24:00:00'
      }
    });

    userData.passwordHash = bcrypt.hashSync(userData.password);
    const investor = Investor.createInvestor(userData, {
      verificationId: verification.verificationId
    });

    await getConnection().mongoManager.save(investor);
    await this.authClient.createUser(transformers.transformInvestorForAuth(investor));

    return transformers.transformCreatedInvestor(investor);
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

    const tokenData = await this.authClient.loginUser({
      login: user.email,
      password: user.passwordHash,
      deviceId: 'device'
    });

    const verificationData = await this.verificationClient.initiateVerification(
      user.defaultVerificationMethod,
      {
        consumer: user.email,
        issuer: 'Jincor',
        template: {
          fromEmail: config.email.from.general,
          subject: 'Jincor.com Login Verification Code',
          body: initiateSignInCodeTemplate(user.name, new Date().toUTCString(), ip)
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '00:05:00'
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

    await this.verificationClient.validateVerification(
      inputData.verification.method,
      inputData.verification.id,
      {
        code: inputData.verification.code
      }
    );

    const verifyAuthResult = await this.authClient.verifyUserToken(inputData.accessToken);
    const user = await getConnection().getMongoRepository(Investor).findOne({
      email: verifyAuthResult.login
    });

    token.makeVerified();
    await getConnection().getMongoRepository(VerifiedToken).save(token);
    this.emailQueue.addJob({
      sender: config.email.from.general,
      subject: 'Jincor.com Successful Login Notification',
      recipient: user.email,
      text: successSignInTemplate(user.name, new Date().toUTCString())
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

    if (activationData.verificationId !== user.verification.id) {
      throw Error('Incorrect verification id');
    }

    await this.verificationClient.validateVerification(
      user.verification.method,
      activationData.verificationId,
      {
        code: activationData.code
      }
    );

    const mnemonic = this.web3Client.generateMnemonic();
    const salt = '';
    const account = this.web3Client.getAccountByMnemonicAndSalt(mnemonic, salt);

    user.addEthWallet({
      ticker: 'ETH',
      address: account.address,
      balance: '0',
      salt,
      mnemonic
    });

    if (user.referral) {
      const referral = await getConnection().getMongoRepository(Investor).findOne({
        email: user.referral
      });
      await this.web3Client.addReferralOf(account.address, referral.ethWallet.address);
    }

    user.isVerified = true;
    await getConnection().getMongoRepository(Investor).save(user);

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

    this.emailQueue.addJob({
      sender: config.email.from.general,
      recipient: user.email,
      subject: "You are officially registered for participation in Jincor's ICO",
      text: successSignUpTemplate(user.name)
    });

    return {
      accessToken: loginResult.accessToken,
      wallets: resultWallets
    };
  }

  async initiateChangePassword(user: Investor, params: any): Promise<BaseInitiateResult> {
    if (!bcrypt.compareSync(params.oldPassword, user.passwordHash)) {
      throw new InvalidPassword('Invalid password');
    }

    const verificationData = await this.verificationClient.initiateVerification(
      user.defaultVerificationMethod,
      {
        consumer: user.email,
        issuer: 'Jincor',
        template: {
          fromEmail: config.email.from.general,
          subject: 'Here’s the Code to Change Your Password at Jincor.com',
          body: initiatePasswordChangeTemplate(user.name)
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '24:00:00'
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

    await this.verificationClient.validateVerification(
      params.verification.method,
      params.verification.verificationId,
      {
        code: params.verification.code
      }
    );

    user.passwordHash = bcrypt.hashSync(params.newPassword);
    await getConnection().getMongoRepository(Investor).save(user);
    this.emailQueue.addJob({
      sender: config.email.from.general,
      recipient: user.email,
      subject: 'Jincor.com Password Change Notification',
      text: successPasswordChangeTemplate(user.name)
    });

    await this.authClient.createUser({
      email: user.email,
      login: user.email,
      password: user.passwordHash,
      sub: params.verification.verificationId
    });

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

    const verificationData = await this.verificationClient.initiateVerification(
      user.defaultVerificationMethod,
      {
        consumer: user.email,
        issuer: 'Jincor',
        template: {
          fromEmail: config.email.from.general,
          body: initiatePasswordResetTemplate(user.name),
          subject: 'Here’s the Code to Reset Your Password at Jincor.com'
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '24:00:00'
        }
      }
    );

    return {
      verification: verificationData
    };
  }

  async verifyResetPassword(params: ResetPasswordInput): Promise<AccessTokenResponse> {
    const user = await getConnection().getMongoRepository(Investor).findOne({
      email: params.email
    });

    if (!user) {
      throw new UserNotFound('User is not found');
    }

    const verificationResult = await this.verificationClient.validateVerification(
      params.verification.method,
      params.verification.verificationId,
      {
        code: params.verification.code
      }
    );

    if (verificationResult.data.consumer !== user.email) {
      throw new Error('Invalid verification user');
    }

    user.passwordHash = bcrypt.hashSync(params.password);
    await getConnection().getMongoRepository(Investor).save(user);

    await this.authClient.createUser({
      email: user.email,
      login: user.email,
      password: user.passwordHash,
      sub: params.verification.verificationId
    });

    const loginResult = await this.authClient.loginUser({
      login: user.email,
      password: user.passwordHash,
      deviceId: 'device'
    });

    const token = VerifiedToken.createVerifiedToken(loginResult.accessToken);

    await getConnection().getMongoRepository(VerifiedToken).save(token);
    this.emailQueue.addJob({
      sender: config.email.from.general,
      recipient: user.email,
      subject: 'Jincor.com Password Reset Notification',
      text: successPasswordResetTemplate(user.name)
    });

    return loginResult;
  }

  async invite(user: Investor, params: any): Promise<InviteResultArray> {
    let result = [];

    for (let email of params.emails) {
      const user = await getConnection().getMongoRepository(Investor).findOne({ email });
      if (user) {
        throw new InviteIsNotAllowed(`${ email } account already exists`);
      }
    }

    user.checkAndUpdateInvitees(params.emails);

    for (let email of params.emails) {
      this.emailQueue.addJob({
        sender: config.email.from.referral,
        recipient: email,
        subject: `${ user.name } thinks you will like this project…`,
        text: inviteTemplate(user.name, `${ config.app.frontendUrl }/auth/signup/${ user.referralCode }`)
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

  private async initiate2faVerification(user: Investor): Promise<InitiateResult> {
    return await this.verificationClient.initiateVerification(
      AUTHENTICATOR_VERIFICATION,
      {
        consumer: user.email,
        issuer: 'Jincor',
        policy: {
          expiredOn: '01:00:00'
        }
      }
    );
  }

  async initiateEnable2fa(user: Investor): Promise<BaseInitiateResult> {
    if (user.defaultVerificationMethod === AUTHENTICATOR_VERIFICATION) {
      throw new AuthenticatorError('Authenticator is enabled already.');
    }

    return {
      verification: await this.initiate2faVerification(user)
    };
  }

  async verifyEnable2fa(user: Investor, params: VerificationInput): Promise<Enable2faResult> {
    if (user.defaultVerificationMethod === AUTHENTICATOR_VERIFICATION) {
      throw new AuthenticatorError('Authenticator is enabled already.');
    }

    const verificationResult = await this.verificationClient.validateVerification(
      params.verification.method,
      params.verification.verificationId,
      {
        code: params.verification.code
      }
    );

    if (verificationResult.data.consumer !== user.email) {
      throw new Error('Invalid verification user');
    }

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
      verification: await this.initiate2faVerification(user)
    };
  }

  async verifyDisable2fa(user: Investor, params: VerificationInput): Promise<Enable2faResult> {
    if (user.defaultVerificationMethod !== AUTHENTICATOR_VERIFICATION) {
      throw new AuthenticatorError('Authenticator is disabled already.');
    }

    // TODO: VERY IMPORTANT - this code allows to disable 2FA even if verification was created for another purpose.
    // TODO: ALSO IMPORTANT - by the way this is true for another requests
    const verificationResult = await this.verificationClient.validateVerification(
      params.verification.method,
      params.verification.verificationId,
      {
        code: params.verification.code,
        removeSecret: true
      }
    );

    if (verificationResult.data.consumer !== user.email) {
      throw new Error('Invalid verification user');
    }

    user.defaultVerificationMethod = EMAIL_VERIFICATION;

    await getConnection().getMongoRepository(Investor).save(user);

    return {
      enabled: false
    };
  }
}

const UserServiceType = Symbol('UserServiceInterface');
export { UserServiceType };
