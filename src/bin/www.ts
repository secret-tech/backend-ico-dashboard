import app from '../app';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import config from '../config';
import 'reflect-metadata';
import { createConnection, ConnectionOptions } from 'typeorm';

/**
 * Create HTTP server.
 */
const httpServer = http.createServer(app);
const ormOptions: ConnectionOptions = config.typeOrm as ConnectionOptions;

createConnection(ormOptions).then(async connection => {
  /**
   * Listen on provided port, on all network interfaces.
   */
  if (config.app.httpServer === 'enabled') {
    httpServer.listen(config.app.port);
  }

  if (config.app.httpsServer === 'enabled') {
    const httpsOptions = {
      key: fs.readFileSync(__dirname + '/../certs/ico-key.pem'),
      cert: fs.readFileSync(__dirname + '/../certs/ico-crt.pem'),
      ca: fs.readFileSync(__dirname + '/../certs/cloudflare.ca'),
      requestCert: true,
      rejectUnauthorized: false
    };
    const httpsServer = https.createServer(httpsOptions, app);
    httpsServer.listen(config.app.httpsPort);
  }
}).catch(error => console.log('TypeORM connection error: ', error));
