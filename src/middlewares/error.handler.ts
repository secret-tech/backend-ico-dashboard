import { Request, Response, NextFunction } from 'express';
import * as Err from '../exceptions/exceptions';
import { ErrorWithFields } from '../exceptions/exceptions';
import * as fs from 'fs';
import * as i18next from 'i18next';
import { responseErrorWithObject } from '../helpers/responses';

export default function handle(err: ErrorWithFields, req: Request, res: Response, next: NextFunction): void {
  let status;
  const lang = req.acceptsLanguages() || 'en';
  const langPath = __dirname + `/../resources/locales/${lang}/errors.json`;
  const translations = fs.existsSync(langPath) ? require(langPath) : null;

  i18next.init({
    lng: lang.toString(),
    resources: translations
  });

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
      // no break
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

  responseErrorWithObject(res, {
    'message': i18next.t(err.message, err.fields)
  }, status);
}
