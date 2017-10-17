import { Response, Request, NextFunction } from 'express';
import { UserServiceType, UserServiceInterface } from '../services/user.service';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import InvalidPassword from '../exceptions/invalid.password';
import 'reflect-metadata';
import UserNotFound from "../exceptions/user.not.found";
import UserExists from "../exceptions/user.exists";
import {AuthorizedRequest} from "../requests/authorized.request";

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
    try {
      res.json(await this.userService.create(req.body));
    } catch (e) {
      switch (e.constructor) {
        case UserExists:
          res.status(422).send({
            error: 'User already exists'
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
    try {
      res.json(await this.userService.activate(req.body));
    } catch (e) {
      switch (e.constructor) {
        default:
          res.status(500).send({
            error: 'Unknown error occurred'
          });
      }
    }
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
      res.json(await this.userService.initiateLogin(req.body));
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
      res.status(500).send({
        error: e.message
      })
    }
  }

  /**
   * Get user info
   *
   * @param  req  express req object
   * @param  res  express res object
   */
  @httpGet(
    '/me',
    'AuthMiddleware'
  )
  me(req: AuthorizedRequest, res: Response): void {
    res.json({
      ethAddress: req.user.wallets[0].address,
      kycStatus: req.user.kycStatus || 'Not verified'
    });
  }
}
