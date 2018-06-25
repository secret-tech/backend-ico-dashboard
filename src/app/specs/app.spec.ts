import * as chai from 'chai';
import app from '../../app';

chai.use(require('chai-http'));

const { expect, request } = chai;

describe('Application', () => {
  it('should return 404 and not contain X-Powered-By header', (done) => {
    request(app).get('/random').set('Accept', 'application/json').end((err, res) => {
      expect(res).not.have.header('X-Powered-By');
      expect(res).have.header('X-Content-Type-Options', 'nosniff');
      expect(res).have.header('X-Frame-Options', 'deny');
      expect(res).have.header('Content-Security-Policy', 'default-src \'none\'');
      expect(res.status).to.equal(404);
      expect(res.status).to.equal(404);
      done();
    });
  });

  it('should return 406 for unsupported Accept header', (done) => {
    request(app).get('/dashboard/public').set('Content-Type', 'application/json').end((err, res) => {
      expect(res.status).to.equal(406);
      expect(res.body.message).to.equal('Unsupported "Accept" header');
      done();
    });
  });

  it('should return 406 for unsupported Content-Type header', (done) => {
    request(app).post('/random').set('Accept', 'application/json').end((err, res) => {
      expect(res.status).to.equal(406);
      expect(res.body.message).to.equal('Unsupported "Content-Type"');
      done();
    });
  });

});
