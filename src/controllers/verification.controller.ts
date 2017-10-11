import { Response, Request, NextFunction } from 'express';
import { VerificationClientType, VerificationClientInterface } from '../services/verify.client';
import { inject, injectable } from 'inversify';
import { controller, httpPost } from 'inversify-express-utils';
import 'reflect-metadata';

/**
 * UserController
 */
@injectable()
@controller(
  '/verification',
)
export class VerificationController {
  constructor(@inject(VerificationClientType) private verificationClient: VerificationClientInterface) { }

  /**
   * Create user
   *
   * @param  req  express req object
   * @param  res  express res object
   */
  @httpPost(
    '/',
    'CreateUserValidation'
  )
  async create(req: Request, res: Response): Promise<void> {

    res.json({});
  }

  /**
   * Login user and respond with token
   *
   * @param  req  express req object
   * @param  res  express res object
   * @param  next express next middleware function
   */
  @httpPost(
    '/login',
  )
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { login, password } = req.body;
    } catch (e) {
      next(e);
    }
  }

}
