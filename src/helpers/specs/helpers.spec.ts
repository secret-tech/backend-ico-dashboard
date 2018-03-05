import * as chai from 'chai';
const util = require('util');

import { chunkArray, processAsyncIteratorByChunks, CacheMethodResult } from '../helpers';

const { expect } = chai;

describe('Helpers', () => {
  const setTimeoutPromise = util.promisify(setTimeout);

  describe('Chunks', () => {
    it('should chunk an array', () => {
      expect(chunkArray([1, 2, 3, 4, 5], 3)).is.deep.eq([[1, 2, 3], [4, 5]]);
      expect(chunkArray([1, 2, 3, 4, 5], 5)).is.deep.eq([[1, 2, 3, 4, 5]]);
    });
  });

  describe('Promise chunk', () => {
    it('should process an array by chunks as async', async () => {
      const result = await processAsyncIteratorByChunks([1, 2, 3, 4, 5], 2, (i) => setTimeoutPromise(0, i));
      expect(result.length).is.eq(5);
    });
  });

  describe('CacheMethodResult', () => {
    it('should cache result of promisified method', async () => {
      let cnt = 0;
      const c = new CacheMethodResult(1, 1000);
      const res = await c.run('k1', () => Promise.resolve(cnt++));
      expect(await c.run('k1', () => Promise.resolve(cnt++))).is.equal(0);
    });
  });
});
