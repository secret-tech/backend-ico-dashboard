import { RedisClient } from 'redis';
import UserNotFound from '../exceptions/user.not.found';
import * as redis from 'redis';
import { injectable } from 'inversify';
import 'reflect-metadata';

import config from '../config';

const {redis: {port, host, prefix}} = config;

export interface StorageService {
  client: RedisClient;
  flushdb: () => Promise<{}>;
  set: (key: string, value: string) => Promise<string>;
  get: (key: string) => Promise<string>;
  getUser: (email: string) => Promise<any>;
  getToken: (token: string) => Promise<any>;
  expire: (key: string, time: number) => Promise<any>;
  del: (key: string) => Promise<any>;
}

@injectable()
export class RedisService implements StorageService {
  client: RedisClient;

  constructor() {
    this.client = redis.createClient(port, host);
  }

  flushdb(): Promise<{}> {
    return new Promise((resolve, reject) => {
      this.client.flushdb((err, result) => err ? reject(err) : resolve());
    });
  }

  set(key: string, value: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.set(this.getKey(key), value, (err, result) => err ? reject(err) : resolve(result));
    });
  }

  get(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.get(this.getKey(key), (err, result) => err ? reject(err) : resolve(result));
    });
  }

  expire(key: string, time: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.client.expire(this.getKey(key), time, (err, result) => err ? reject(err) : resolve(result));
    });
  }

  del(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.del(this.getKey(key), (err, result) => err ? reject(err) : resolve(result));
    });
  }

  getKey(key: string): string {
    return prefix + key;
  }

  /**
   * Return user's data
   *
   * @param  email
   * @return promise
   */
  async getUser(email: string): Promise<any> {
    const userStr = await this.get(`user:${ email }`);

    if (!userStr) {
      throw new UserNotFound('User is not found');
    }

    return JSON.parse(userStr);
  }

  /**
   * Return user's data
   *
   * @param  token
   * @return promise
   */
  async getToken(token: string): Promise<any> {
    const tokenStr = await this.get(`token:${ token }`);

    if (!tokenStr) {
      throw new Error('Token is not found');
    }

    return JSON.parse(tokenStr);
  }
}

const StorageServiceType = Symbol('StorageService');
export { StorageServiceType };
