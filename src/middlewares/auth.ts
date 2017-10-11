import { Response, NextFunction } from 'express';
import { AuthorizedRequest } from '../requests/authorized.request';
import { AuthClientType, AuthClientInterface } from '../services/auth.client';
import { StorageServiceType, StorageService } from '../services/storage.service';
import { injectable, inject } from 'inversify';

@injectable()
export class Auth {
  /**
   * constructor
   */
  constructor(
    @inject(AuthClientType) private authClient: AuthClientInterface,
    @inject(StorageServiceType) private storageService: StorageService
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

    const tokenVerificationData = JSON.parse(await this.storageService.get(`token:${ token }`));

    if (!tokenVerificationData.isVerified) {
      return res.status(401).json({
        error: 'Not Authorized'
      });
    }

    try {
      req.user = await this.authClient.verifyUserToken(token);
      return next();
    } catch (e) {
      return res.status(401).json({
        error: 'Not Authorized'
      });
    }
  }
}
