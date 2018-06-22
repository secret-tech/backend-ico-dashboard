import * as chai from 'chai';
const { expect } = chai;
import { Investor } from '../../entities/investor';
import * as faker from 'faker';
import { Invitee } from '../../entities/invitee';
import { InviteIsNotAllowed } from '../../exceptions/exceptions';

describe('Investor Entity', () => {
  beforeEach(() => {
    const userData = {
      email: 'invitor@test.com',
      firstName: 'ICO',
      lastName: 'investor',
      phone: '+45550000000',
      country: 'ru',
      dob: '1970-01-01',
      agreeTos: true
    };

    const verification = {
      verificationId: '123'
    };

    this.investor = Investor.createInvestor(userData, verification);
  });

  describe('checkAndUpdateInvitees', () => {
    it('should add invitee', () => {
      this.investor.checkAndUpdateInvitees(['test1@test.com', 'test2@test.com']);

      expect(this.investor.invitees[0].email).to.eq('test1@test.com');
      expect(this.investor.invitees[0].attempts).to.eq(1);

      expect(this.investor.invitees[1].email).to.eq('test2@test.com');
      expect(this.investor.invitees[1].attempts).to.eq(1);

      this.investor.checkAndUpdateInvitees(['test3@test.com']);

      expect(this.investor.invitees[0].email).to.eq('test1@test.com');
      expect(this.investor.invitees[0].attempts).to.eq(1);

      expect(this.investor.invitees[1].email).to.eq('test2@test.com');
      expect(this.investor.invitees[1].attempts).to.eq(1);

      expect(this.investor.invitees[2].email).to.eq('test3@test.com');
      expect(this.investor.invitees[2].attempts).to.eq(1);

      expect(
        () => this.investor.checkAndUpdateInvitees(['test1@test.com'])
      ).to.throw(InviteIsNotAllowed, 'You have already invited {{email}} during last 24 hours');

      expect(
        () => this.investor.checkAndUpdateInvitees(['test2@test.com'])
      ).to.throw(InviteIsNotAllowed, 'You have already invited {{email}} during last 24 hours');

      expect(
        () => this.investor.checkAndUpdateInvitees(['test3@test.com'])
      ).to.throw(InviteIsNotAllowed, 'You have already invited {{email}} during last 24 hours');
    });

    it('should not allow to invite more than 50 emails during 24 hours', () => {
      for (let i = 0; i < 50; i++) {
        this.investor.checkAndUpdateInvitees([
          faker.internet.email('', '', 'icodashboard.space')
        ]);
      }

      expect(
        () => this.investor.checkAndUpdateInvitees(['test2@test.com'])
      ).to.throw('You have already sent 50 invites during last 24 hours');
    });

    it('should not allow to invite more than 5 emails at once', () => {
      const emails = [];

      for (let i = 0; i < 6; i++) {
        emails.push(faker.internet.email());
      }

      expect(
        () => this.investor.checkAndUpdateInvitees(emails)
      ).to.throw('It is not possible to invite more than 5 emails at once');
    });

    it('should not allow to invite myself', () => {
      expect(
        () => this.investor.checkAndUpdateInvitees(['invitor@test.com'])
      ).to.throw('You are not able to invite yourself');
    });

    it('should increase attempts count and lastSentAt', () => {
      const currentTime = Math.round(+new Date() / 1000);

      const invitee = new Invitee();
      invitee.email = 'test@test.com';
      invitee.attempts = 1;
      invitee.lastSentAt = currentTime - 3600 * 24 - 1;

      this.investor.invitees = [invitee];

      this.investor.checkAndUpdateInvitees(['test@test.com']);
      expect(this.investor.invitees[0].attempts).to.eq(2);
      expect(this.investor.invitees[0].lastSentAt).to.gte(currentTime);
    });

    it('should not allow to invite 1 email more than 5 times', () => {
      const currentTime = Math.round(+new Date() / 1000);

      const invitee = new Invitee();
      invitee.email = 'test@test.com';
      invitee.attempts = 5;
      invitee.lastSentAt = currentTime - 3600 * 24 - 1;

      this.investor.invitees = [invitee];

      expect(
        () => this.investor.checkAndUpdateInvitees(['test@test.com'])
      ).to.throw(InviteIsNotAllowed, 'You have already invited {{email}} at least 5 times');
    });
  });
});
