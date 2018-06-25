import * as express from 'express';
import { Response, Request, NextFunction, Application } from 'express';
import * as bodyParser from 'body-parser';
import config from './config';
import handle from './middlewares/error.handler';
const morgan = require('morgan');

import { InversifyExpressServer } from 'inversify-express-utils';
import { container } from './ioc.container';

const app: Application = express();

if (config.app.accessLog === 'true') {
  app.use(morgan('combined'));
}

if (process.env.ENVIRONMENT === 'production') {
  app.use((req: any, res: Response, next: NextFunction) => {
    if (!req.client.authorized && req.path !== '/dashboard/public') {
      return res.status(401).send({
        status: 401,
        message: 'Invalid client certificate'
      });
    }
    next();
  });
}

app.disable('x-powered-by');

app.use((req: Request, res: Response, next: NextFunction) => {
  if (config.app.forceHttps === 'enabled') {
    if (!req.secure) {
      return res.redirect('https://' + req.hostname + ':' + config.app.httpsPort + req.originalUrl);
    }

    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'deny');
  res.setHeader('Content-Security-Policy', 'default-src \'none\'');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept');
  return next();
});

app.post('*', (req: Request, res: Response, next: NextFunction) => {
  if (
    !req.header('Content-Type') ||
    (req.header('Content-Type') !== 'application/json' && !req.header('Content-Type').includes('application/x-www-form-urlencoded'))
  ) {
    return res.status(406).json({
      status: 406,
      message: 'Unsupported "Content-Type"'
    });
  }

  return next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let server = new InversifyExpressServer(container, null, null, app);
server.setErrorConfig((app) => {
  // 404 handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).send({
      status: 404,
      message: 'Route is not found'
    });
  });

  // exceptions handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => handle(err, req, res, next));
});

export default server.build();
