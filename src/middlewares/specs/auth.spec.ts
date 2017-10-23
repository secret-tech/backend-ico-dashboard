import * as express from 'express';
import { Response, Request, NextFunction, Application } from 'express';
import * as chai from 'chai';
import { Auth } from '../auth';
import { StorageServiceType, StorageService } from '../../services/storage.service';
import { container } from '../../ioc.container';

chai.use(require('chai-http'));
const {expect, request} = chai;

describe('Auth Middleware', () => {
  return '';
});
