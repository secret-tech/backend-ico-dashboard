import { Response, NextFunction } from 'express';
import { AuthorizedRequest } from '../requests/authorized.request';
import { AuthClientInterface } from '../services/auth.client';
import { StorageService } from '../services/storage.service';

export class Auth {
  /**
   * constructor
   */
  constructor(
    private authClient: AuthClientInterface,
    private storageService: StorageService
  ) { }

  async authenticate(req: AuthorizedRequest, res: Response, next: NextFunction) {
    if (!req.headers.authorization) {
      return res.status(401).json({
        error: 'Not Authorized'
      });
    }

    const parts = req.headers.authorization.split(' ');

    if (parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Not Authorized'
      });
    }

    const token = parts[1];

    const tokenVerificationData = await this.storageService.getToken(token);

    if (!tokenVerificationData.isVerified) {
      return res.status(401).json({
        error: 'Not Authorized'
      });
    }

    try {
      const verifyResult = await this.authClient.verifyUserToken(token);
      req.user = await this.storageService.getUser(verifyResult.login);

      if (!req.user) {
        return res.status(404).json({
          error: 'User is not found'
        });
      }

      return next();
    } catch (e) {
      return res.status(401).json({
        error: 'Not Authorized'
      });
    }
  }
}
