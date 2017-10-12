import * as express from 'express';
import { Response, Request, NextFunction, Application } from 'express';
import * as bodyParser from 'body-parser';
import config from './config';

import { InversifyExpressServer } from 'inversify-express-utils';
import { container } from './ioc.container';

const app: Application = express();

app.disable('x-powered-by');

app.use((req: Request, res: Response, next: NextFunction) => {
  if (config.app.forceHttps === 'enabled') {
    if (!req.secure) {
      return res.redirect('https://' + req.hostname + ':' + config.app.httpsPort + req.originalUrl);
    }

    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }

  if (req.method !== 'OPTIONS' && req.header('Accept') !== 'application/json') {
    return res.status(406).json({
      error: 'Unsupported "Accept" header'
    });
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'deny');
  res.setHeader('Content-Security-Policy', 'default-src \'none\'');
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  return next();
});

app.post('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.header('Content-Type') !== 'application/json') {
    return res.status(406).json({
      error: 'Unsupported "Content-Type"'
    });
  }

  return next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// for test purpose
let server = new InversifyExpressServer(container, null, null, app);

export default server.build();
