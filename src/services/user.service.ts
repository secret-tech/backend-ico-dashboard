import { AuthClientType } from './auth.client';
import { VerificationClientType } from './verify.client';
import { Web3ClientType, Web3ClientInterface } from './web3.client';
import { EmailQueueType, EmailQueueInterface } from '../queues/email.queue';
import { Web3QueueType, Web3QueueInterface } from '../queues/web3.queue';
import { injectable, inject } from 'inversify';
import 'reflect-metadata';
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
   * @param  web3Queue web3 queue
   * @param  emailQueue email queue
   */
  constructor(
    @inject(AuthClientType) private authClient: AuthClientInterface,
    @inject(VerificationClientType) private verificationClient: VerificationClientInterface,
    @inject(Web3ClientType) private web3Client: Web3ClientInterface,
    @inject(Web3QueueType) private web3Queue: Web3QueueInterface,
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
        throw new ReferralDoesNotExist('Referral code does not exist');
      }

      if (!referral.isVerified) {
        throw new ReferralIsNotActivated('Referral is not activated');
      }
    }

    const verification = await this.verificationClient.initiateVerification(EMAIL_VERIFICATION, {
      consumer: email,
      issuer: 'Jincor',
      template: {
        body: 'Your code: {{{CODE}}}'
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
   * @return promise
   */
  async initiateLogin(loginData: InitiateLoginInput): Promise<InitiateLoginResult> {
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
          body: 'Your login code is {{{CODE}}}'
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

    token.makeVerified();
    await getConnection().getMongoRepository(VerifiedToken).save(token);

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
      this.web3Client.addAddressToWhiteListReferral(account.address, referral.ethWallet.address);
    } else {
      await this.web3Queue.addJob({
        address: account.address
      });
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
          body: 'Enter this code to confirm password change: {{{CODE}}}'
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '01:00:00'
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
          body: 'Enter this code to confirm password reset: {{{CODE}}}'
        },
        generateCode: {
          length: 6,
          symbolSet: ['DIGITS']
        },
        policy: {
          expiredOn: '01:00:00'
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
        sender: 'invitations@jincor.com',
        recipient: email,
        subject: 'Invitation to join Jincor ICO',
        text: config.email.inviteTemplate.replace('%name%', user.name).replace('%link%', `http://45.33.52.185/auth/signup/${ user.referralCode }`)
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
