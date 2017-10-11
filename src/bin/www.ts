import app from '../app';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import config from '../config';

/**
 * Create HTTP server.
 */
const httpServer = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
httpServer.listen(config.app.port);

if (config.app.httpsServer === 'enabled') {
  const httpsOptions = {
    key  : fs.readFileSync(__dirname + '/server.key'),
    cert : fs.readFileSync(__dirname + '/auth.crt')
  };
  const httpsServer = https.createServer(httpsOptions, app);
  httpsServer.listen(config.app.httpsPort);
}
