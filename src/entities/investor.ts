import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { Verification, EMAIL_VERIFICATION } from './verification';
import { Wallet } from './wallet';
import 'reflect-metadata';
import { Invitee } from './invitee';
import { InviteIsNotAllowed } from '../exceptions/exceptions';
import { Index } from 'typeorm/decorator/Index';

export const KYC_STATUS_NOT_VERIFIED = 'not_verified';
export const KYC_STATUS_VERIFIED = 'verified';
export const KYC_STATUS_FAILED = 'failed';

@Entity()
@Index('email', () => ({ email: 1 }), { unique: true })
export class Investor {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column()
  passwordHash: string;

  @Column()
  agreeTos: boolean;

  @Column()
  isVerified: boolean;

  @Column()
  defaultVerificationMethod: string;

  @Column()
  referralCode: string;

  @Column()
  referral: string;

  @Column()
  kycStatus: string;

  @Column(type => Verification)
  verification: Verification;

  @Column(type => Wallet)
  ethWallet: Wallet;

  @Column(type => Invitee)
  invitees: Invitee[];

  @Column()
  kycInitResult: KycInitResult;

  static createInvestor(data: UserData, verification) {
    const user = new Investor();
    user.email = data.email;
    user.name = data.name;
    user.agreeTos = data.agreeTos;
    user.passwordHash = data.passwordHash;
    user.isVerified = false;
    user.kycStatus = KYC_STATUS_NOT_VERIFIED;
    user.referralCode = user.base64encode(user.email);
    user.referral = data.referral;
    user.defaultVerificationMethod = EMAIL_VERIFICATION;
    user.verification = Verification.createVerification({
      verificationId: verification.verificationId,
      method: EMAIL_VERIFICATION
    });
    user.invitees = [];
    return user;
  }

  checkAndUpdateInvitees(emails: string[]) {
    if (emails.indexOf(this.email) !== -1) {
      throw new InviteIsNotAllowed('You are not able to invite yourself.');
    }

    if (emails.length > 5) {
      throw new InviteIsNotAllowed('It is not possible to invite more than 5 emails at once');
    }

    const newInvitees = [];
    let totalInvitesDuringLast24Hours: number = 0;

    for (let invitee of this.invitees) {
      const invitedDuring24 = invitee.invitedDuringLast24Hours();
      if (invitedDuring24) {
        totalInvitesDuringLast24Hours += 1;
        if (totalInvitesDuringLast24Hours >= 50) {
          throw new InviteIsNotAllowed(`You have already sent 50 invites during last 24 hours.`);
        }
      }

      const index = emails.indexOf(invitee.email);
      if (index !== -1) {
        // remove found email from array as we will add not found emails later
        emails.splice(index, 1);

        if (invitedDuring24) {
          throw new InviteIsNotAllowed(`You have already invited ${ invitee.email } during last 24 hours`);
        }

        if (invitee.reachedMaxAttemptsCount()) {
          throw new InviteIsNotAllowed(`You have already invited ${ invitee.email } at least 5 times.`);
        }

        invitee.invitedAgain();
      }

      newInvitees.push(invitee);
    }

    for (let email of emails) {
      newInvitees.push(Invitee.firstTimeInvitee(email));
    }

    this.invitees = newInvitees;
  }

  addEthWallet(data: any) {
    this.ethWallet = Wallet.createWallet(data);
  }

  escape(str: string): string {
    return str.replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  base64encode(email: string): string {
    return this.escape(Buffer.from(email, 'utf8').toString('base64'));
  }
}
