export class ErrorWithFields extends Error {
  fields?: any;
  constructor(message?: string, fields?: any) {
    super(message);
    this.fields = fields;

    Object.setPrototypeOf(this, this.constructor.prototype);
  }
}

export class InvalidPassword extends ErrorWithFields {}
export class UserExists extends ErrorWithFields {}
export class UserNotFound extends ErrorWithFields {}
export class TokenNotFound extends ErrorWithFields {}
export class UserNotActivated extends ErrorWithFields {}
export class ReferralDoesNotExist extends ErrorWithFields {}
export class ReferralIsNotActivated extends ErrorWithFields {}
export class InviteIsNotAllowed extends ErrorWithFields {}
export class AuthenticatorError extends ErrorWithFields {}
export class KycAlreadyVerifiedError extends ErrorWithFields {}
export class KycFailedError extends ErrorWithFields {}
export class KycPendingError extends ErrorWithFields {}
export class NotCorrectVerificationCode extends ErrorWithFields {}
export class VerificationIsNotFound extends ErrorWithFields {}
export class InsufficientEthBalance extends ErrorWithFields {}
export class MaxVerificationsAttemptsReached extends ErrorWithFields {}
export class IncorrectMnemonic extends ErrorWithFields {}
export class UserActivated extends ErrorWithFields {}

export class KycShuftiProInvalidSignature extends ErrorWithFields {}
