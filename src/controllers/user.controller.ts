import { Response, Request, NextFunction } from 'express';
import { UserServiceType, UserServiceInterface } from '../services/user.service';
import { inject, injectable } from 'inversify';
import { controller, httpPost } from 'inversify-express-utils';
import InvalidPassword from '../exceptions/invalid.password';
import 'reflect-metadata';
import UserNotFound from "../exceptions/user.not.found";

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
      switch (e.constructor) {
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
        default:
          res.status(500).send({
            error: 'Unknown error occurred'
          });
      }
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
