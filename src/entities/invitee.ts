import { Column } from 'typeorm';
import 'reflect-metadata';

export class Invitee {
  @Column()
  email: string;

  @Column()
  lastSentAt: number;

  @Column()
  attempts: number;

  static firstTimeInvitee(email: string) {
    const invitee = new Invitee();
    invitee.email = email;
    invitee.lastSentAt = Math.round(+new Date() / 1000);
    invitee.attempts = 1;
    return invitee;
  }

  invitedAgain() {
    this.attempts += 1;
    this.lastSentAt = Math.round(+new Date() / 1000);
  }

  invitedDuringLast24Hours() {
    return Math.round(+new Date() / 1000) - this.lastSentAt < 3600 * 24;
  }

  reachedMaxAttemptsCount() {
    return this.attempts >= 5;
  }
}
