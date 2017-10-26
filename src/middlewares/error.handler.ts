import { Request, Response, NextFunction } from 'express';
import * as EX from '../exceptions/exceptions';

export default function handle(err: Error, req: Request, res: Response, next: NextFunction): void {
  let status;

  switch (err.constructor) {
    case EX.InvalidPassword:
    case EX.UserNotActivated:
      status = 403;
      break;
    case EX.UserNotFound:
      status = 404;
      break;
    case EX.UserExists:
      status = 422;
      break;
    default:
      status = 500;
      console.error(err.message);
      console.error(err.stack);
  }

  res.status(status).send({
    error: err.message
  });
}
