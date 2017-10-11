import { expect } from 'chai';
import { StorageServiceType, StorageService } from '../storage.service';
import { container } from '../../ioc.container';

const storageService = container.get<StorageService>(StorageServiceType);

describe('storageService', () => {
  afterEach(async() => {
    await storageService.flushdb();
  });

  describe('#set', () => {
    it('should return "OK"', async() => {
      const result = await storageService.set('key', 'value');
      expect(result).to.equal('OK');
    });
  });

  describe('#get', () => {
    beforeEach(async() => {
      await storageService.set('key', 'value');
    });

    it('should return value', async() => {
      const value = await storageService.get('key');
      expect(value).to.equal('value');
    });

    it('should return null', async() => {
      const value = await storageService.get('wrongKey');
      expect(value).to.equal(null);
    });
  });

  describe('#expire', () => {
    beforeEach(async() => {
      await storageService.set('key', 'value');
    });

    it('should return 1', async() => {
      const result = await storageService.expire('key', 50);
      expect(result).to.equal(1);
    });

    it('should return 0', async() => {
      const result = await storageService.expire('wrongKey', 50);
      expect(result).to.equal(0);
    });
  });

  describe('#del', () => {
    beforeEach(async() => {
      await storageService.set('key', 'value');
    });

    it('should return 1', async() => {
      const result = await storageService.del('key');
      expect(result).to.equal(1);
    });

    it('should return 0', async() => {
      const result = await storageService.del('wrongKey');
      expect(result).to.equal(0);
    });
  });
});
