import { Column } from 'typeorm';
import 'reflect-metadata';

export const AUTHENTICATOR_VERIFICATION = 'google_auth';
export const EMAIL_VERIFICATION = 'email';

export class Verification {
  @Column()
  id: string;

  @Column()
  method: string;

  @Column()
  attempts: number;

  @Column()
  expiredOn: number;

  static createVerification(data: any) {
    const verification = new Verification();
    verification.id = data.verificationId;
    verification.method = data.method;
    verification.attempts = data.attempts;
    verification.expiredOn = data.expiredOn;
    return verification;
  }
}
