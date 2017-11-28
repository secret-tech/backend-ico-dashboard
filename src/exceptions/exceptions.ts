export class InvalidPassword extends Error {}
export class UserExists extends Error {}
export class UserNotFound extends Error {}
export class TokenNotFound extends Error {}
export class UserNotActivated extends Error {}
export class ReferralDoesNotExist extends Error {}
export class ReferralIsNotActivated extends Error {}
export class InviteIsNotAllowed extends Error {}
export class AuthenticatorError extends Error {}
export class KycAlreadyVerifiedError extends Error {}
export class KycFailedError extends Error {}
export class KycPendingError extends Error {}
export class NotCorrectVerificationCode extends Error {}
export class VerificationIsNotFound extends Error {}
export class InsufficientEthBalance extends Error {}
export class MaxVerificationsAttemptsReached extends Error {}
