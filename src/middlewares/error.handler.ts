import { Request, Response, NextFunction } from 'express';
import UserNotFound from '../exceptions/user.not.found';
import UserExists from '../exceptions/user.exists';
import InvalidPassword from '../exceptions/invalid.password';

export default function handle(err: Error, req: Request, res: Response, next: NextFunction): void {
  switch (err.constructor) {
    case InvalidPassword:
      res.status(403).send({
        error: 'Invalid password'
      });
      break;
    case UserNotFound:
      res.status(404).send({
        error: 'User is not found'
      });
      break;
    case UserExists:
      res.status(422).send({
        error: 'User already exists'
      });
      break;
    default:
      console.error(err.message);
      console.error(err.stack);
      res.status(500).send({
        error: 'Unknown error occurred'
      });
  }
}
