import { container } from '../../ioc.container';
import { expect } from 'chai';
import { StorageServiceType, StorageService } from '../storage.service';
import { UserServiceType, UserServiceInterface } from '../user.service';

const storageService = container.get<StorageService>(StorageServiceType);
const userService = container.get<UserServiceInterface>(UserServiceType);

describe('userService', () => {
  afterEach(async() => {
    await storageService.flushdb();
  });

  describe('#create', () => {
    it('should create new user', async() => {
      const user = { email: 'test', login: 'test', tenant: 'test', password: 'test', sub: '123' };
      const result = await userService.create(user);

      expect(result).to.be.a('object');
    });
  });

  describe('#get', () => {
    before(async() => {
      const userData = { email: 'test', login: 'test', tenant: 'test', password: 'test', sub: '123' };
      await userService.create(userData);
    });

    it('should return user', async() => {
      const userStr = await userService.get('test:test');
      const user = JSON.parse(userStr);

      expect(user.login).to.equal('test');
    });
  });
});
