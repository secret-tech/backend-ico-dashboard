import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { Verification, EMAIL_VERIFICATION } from './verification';
import { Wallet } from './wallet';
import 'reflect-metadata';

const KYC_STATUS_NOT_VERIFIED = 'Not verified';
const KYC_STATUS_VERIFIED = 'Verified';

@Entity()
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
    return user;
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
