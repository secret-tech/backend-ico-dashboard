import { Request, Response, NextFunction } from 'express';
import * as Err from '../exceptions/exceptions';

export default function handle(err: Error, req: Request, res: Response, next: NextFunction): void {
  let status;

  switch (err.constructor) {
    case Err.KycFailedError:
      // no break
    case Err.KycAlreadyVerifiedError:
      // no break
    case Err.KycPendingError:
      // no break
    case Err.InsufficientEthBalance:
      // no break
    case Err.AuthenticatorError:
      status = 400;
      break;
    case Err.InvalidPassword:
      // no break
    case Err.UserNotActivated:
      //no break
    case Err.UserActivated:
      status = 403;
      break;
    case Err.VerificationIsNotFound:
      // no break
    case Err.UserNotFound:
      status = 404;
      break;
    case Err.UserExists:
      // no break
    case Err.NotCorrectVerificationCode:
      // no break
    case Err.ReferralDoesNotExist:
      // no break
    case Err.InviteIsNotAllowed:
      // no break
    case Err.MaxVerificationsAttemptsReached:
      // no break
    case Err.IncorrectMnemonic:
      // no break
    case Err.ReferralIsNotActivated:
      status = 422;
      break;
    default:
      status = 500;
      console.error(err.message);
      console.error(err.stack);
  }

  res.status(status).send({
    statusCode: status,
    error: err.message
  });
}
