import { Response, NextFunction } from 'express';
import { AuthorizedRequest } from '../requests/authorized.request';
import { getConnection } from 'typeorm';
import { Investor } from '../entities/investor';
import { VerifiedToken } from '../entities/verified.token';

export class Auth {
  /**
   * constructor
   */
  constructor(
    private authClient: AuthClientInterface
  ) { }

  async authenticate(req: AuthorizedRequest, res: Response, next: NextFunction) {
    if (!req.headers.authorization) {
      return this.notAuthorized(res);
    }

    const parts = req.headers.authorization.split(' ');

    if (parts[0] !== 'Bearer') {
      return this.notAuthorized(res);
    }

    const token = parts[1];

    const tokenVerification = await getConnection().getMongoRepository(VerifiedToken).findOne({
      token: token
    });

    if (!tokenVerification || !tokenVerification.verified) {
      return this.notAuthorized(res);
    }

    try {
      const verifyResult = await this.authClient.verifyUserToken(token);
      req.user = await getConnection().getMongoRepository(Investor).findOne({
        email: verifyResult.login
      });

      if (!req.user) {
        return res.status(404).json({
          message: 'User is not found'
        });
      }

      return next();
    } catch (e) {
      return this.notAuthorized(res);
    }
  }

  notAuthorized(res: Response) {
    return res.status(401).json({
      status: 401,
      message: 'Not Authorized'
    });
  }
}
