import { Response, Request } from 'express';
import { UserServiceType, UserServiceInterface } from '../services/user.service';
import { inject, injectable } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import 'reflect-metadata';
import { AuthorizedRequest } from "../requests/authorized.request";

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
   */
  @httpPost(
    '/login/initiate',
    'InitiateLoginValidation'
  )
  async initiateLogin(req: Request, res: Response): Promise<void> {
    res.json(await this.userService.initiateLogin(req.body));
  }

  /**
   * Verify user login
   *
   * @param  req  express req object
   * @param  res  express res object
   */
  @httpPost(
    '/login/verify',
    'VerifyLoginValidation'
  )
  async validateLogin(req: Request, res: Response): Promise<void> {
    res.status(200).send(await this.userService.verifyLogin(req.body));
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
  getMe(req: AuthorizedRequest, res: Response): void {
    res.json({
      ethAddress: req.user.wallets[0].address,
      email: req.user.email,
      name: req.user.name,
      kycStatus: req.user.kycStatus || 'Not verified'
    });
  }

  @httpPost(
    '/me/changePassword/initiate',
    'AuthMiddleware',
    'ChangePasswordValidation'
  )
  async initiateChangePassword(req: AuthorizedRequest, res: Response): Promise<void> {
    res.json(await this.userService.initiateChangePassword(req.user, req.body));
  }

  @httpPost(
    '/me/changePassword/verify',
    'AuthMiddleware',
    'ChangePasswordValidation'
  )
  async verifyChangePassword(req: AuthorizedRequest, res: Response): Promise<void> {
    res.json(await this.userService.verifyChangePassword(req.user, req.body));
  }
}
