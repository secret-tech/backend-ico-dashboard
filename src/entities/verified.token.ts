import { Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { Verification } from './verification';
import 'reflect-metadata';

@Entity()
export class VerifiedToken {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  token: string;

  @Column()
  verified: boolean;

  @Column(type => Verification)
  verification: Verification;

  static createNotVerifiedToken(token: string, verification: any) {
    const verifiedToken = new VerifiedToken();
    verifiedToken.token = token;
    verifiedToken.verified = false;
    verifiedToken.verification = Verification.createVerification(verification);
    return verifiedToken;
  }

  static createVerifiedToken(token: string) {
    const verifiedToken = new VerifiedToken();
    verifiedToken.token = token;
    verifiedToken.verified = true;
    return verifiedToken;
  }

  makeVerified() {
    if (this.verified) {
      throw Error('Token is verified already');
    }

    this.verified = true;
  }
}
