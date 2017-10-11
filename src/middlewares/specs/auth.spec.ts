import * as express from 'express';
import { Response, Request, NextFunction, Application } from 'express';
import * as chai from 'chai';
import { Auth } from '../auth';
import { KeyServiceType, KeyServiceInterface } from '../../services/key.service';
import { StorageServiceType, StorageService } from '../../services/storage.service';
import { container } from '../../ioc.container';

chai.use(require('chai-http'));
const {expect, request} = chai;

const storageService = container.get<StorageService>(StorageServiceType);
const keyService = container.get<KeyServiceInterface>(KeyServiceType);
const auth: Auth = new Auth(keyService);

const app: Application = express();
app.use((req: Request, res: Response, next: NextFunction) => auth.authenticate(req, res, next));

describe('Auth Middleware', () => {
  afterEach(async() => {
    await storageService.flushdb();
  });

  describe('Test Auth', () => {
    it('should require Authorization header', (done) => {
      request(app).get('/smth').end((err, res) => {
        expect(res.status).to.equal(401);
        done();
      });
    });

    it('should require Bearer', (done) => {
      request(app).get('/smth').set('Authorization', 'Something').end((err, res) => {
        expect(res.status).to.equal(401);
        done();
      });
    });

    it('should not auth incorrect token', (done) => {
      request(app).get('/smth').set('Authorization', 'Bearer token').end((err, res) => {
        expect(res.status).to.equal(401);
        done();
      });
    });

    it('should not authorize non-tenant user', (done) => {
      const user = {
        id: 'a50e5d6b-1037-4e99-9fa3-f555f1df0bd6',
        login: 'test:test',
        password: '$2a$10$V5o4Ezdqcbip1uzFRlxgFu77dwJGYhwlGwM2W66JqSN3AUFwPpKRO',
        email: 'test',
        company: 'test',
        sub: '123'
      };

      keyService.set(user, 'test').then((token) => {
        request(app).get('/smth').set('Authorization', 'Bearer ' + token).end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
      });
    });

    it('should authorize tenant', (done) => {
      const tenant = {
        id: 'a50e5d6b-1037-4e99-9fa3-f555f1df0bd6',
        login: 'test:test',
        password: '$2a$10$V5o4Ezdqcbip1uzFRlxgFu77dwJGYhwlGwM2W66JqSN3AUFwPpKRO',
        email: 'test',
        company: 'test',
        sub: '123'
      };

      keyService.setTenantToken(tenant).then((token) => {
        request(app).get('/smth').set('Authorization', 'Bearer ' + token).end((err, res) => {
          expect(res.status).to.equal(404); // 404 because authorization is success but route is not found
          done();
        });
      });
    });
  });
});
