const restore = require('mongodb-restore');

beforeEach(function(done) {
  restore({
    uri: 'mongodb://mongo:27017/ico-dashboard-test',
    root: __dirname + '/dump/ico-dashboard-test',
    drop: true,
    callback: function() {
      done()
    }
  });
});
