import { Response, Request, NextFunction } from 'express';
import { UserServiceType, UserServiceInterface } from '../services/user.service';
import { inject, injectable } from 'inversify';
import { controller, httpPost } from 'inversify-express-utils';
import 'reflect-metadata';

/**
 * UserController
 */
@injectable()
@controller(
  '/user',
)
export class UserController {
  constructor(
    @inject(UserServiceType) private userService: UserServiceInterface
  )
  { }

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
    res.json(await this.userService.create(req.body));
  }

  /**
   * Activate user
   *
   * @param  req  express req object
   * @param  res  express res object
   */
  @httpPost(
    '/activate',
    'ActivateUserValidation'
  )
  async activate(req: Request, res: Response): Promise<void> {
    res.json(await this.userService.activate(req.body));
  }

  /**
   * Initiate user login
   *
   * @param  req  express req object
   * @param  res  express res object
   * @param  next express next middleware function
   */
  @httpPost(
    '/login/initiate',
    'InitiateLoginValidation'
  )
  async initiateLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).send(await this.userService.initiateLogin(req.body));
    } catch (e) {
      next(e);
    }
  }

  /**
   * Verify user login
   *
   * @param  req  express req object
   * @param  res  express res object
   * @param  next express next middleware function
   */
  @httpPost(
    '/login/verify',
    'VerifyLoginValidation'
  )
  async validateLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).send(await this.userService.verifyLogin(req.body));
    } catch (e) {
      next(e);
    }
  }
}
