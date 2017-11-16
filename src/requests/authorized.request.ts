import { Request } from 'express';
import { Investor } from '../entities/investor';

export interface AuthorizedRequest extends Request {
  user?: Investor;
}
