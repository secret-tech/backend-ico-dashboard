import { container } from '../../ioc.container';
import { expect } from 'chai';
import { UserServiceType } from '../user.service';

const userService = container.get<UserServiceInterface>(UserServiceType);

describe('userService', () => {
  return '';
});
