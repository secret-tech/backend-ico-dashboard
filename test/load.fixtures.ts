const restore = require('mongodb-restore');
import { container } from '../src/ioc.container';

beforeEach(function(done) {
  container.snapshot();

  restore({
    uri: 'mongodb://mongo:27017/ico-dashboard-test',
    root: __dirname + '/dump/ico-dashboard-test',
    drop: true,
    callback: function() {
      done();
    }
  });
});

afterEach(function() {
  container.restore();
});
