import * as Joi from 'joi';
import config from '../config';
import { Response, Request, NextFunction } from 'express';
import { AuthorizedRequest } from '../requests/authorized.request';
import { base64decode } from '../helpers/helpers';

const options = {
  allowUnknown: true
};

const verificationSchema = Joi.object().keys({
  verificationId: Joi.string().required(),
  code: Joi.string().required(),
  method: Joi.string().required()
}).required();

const passwordRegex = /^[a-zA-Z0\d!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{8,}$/;

export function createUser(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    firstName: Joi.string().min(3).required(),
    lastName: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(7).required(),
    country: Joi.string().min(2).required(),
    dob: Joi.string().isoDate().required(),
    password: Joi.string().required().regex(passwordRegex),
    agreeTos: Joi.boolean().only(true).required(),
    referral: Joi.string().email().options({
      language: {
        key: '{{!label}}',
        string: {
          email: 'Not valid referral code'
        }
      }
    }).label(' ') // Joi does not allow empty label but space is working
  });

  if (req.body.referral) {
    req.body.referral = base64decode(req.body.referral);
  }

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function activateUser(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    email: Joi.string().email().required(),
    verificationId: Joi.string().required(),
    code: Joi.string().required()
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function initiateLogin(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function verifyLogin(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    accessToken: Joi.string().required(),
    verification: Joi.object().keys({
      id: Joi.string().required(),
      code: Joi.string().required(),
      method: Joi.string().required()
    })
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function changePassword(req: AuthorizedRequest, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required().regex(passwordRegex)
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function inviteUser(req: AuthorizedRequest, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    emails: Joi.array().required().max(5).min(1).items(Joi.string().email())
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function resetPasswordInitiate(req: AuthorizedRequest, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    email: Joi.string().required().email()
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function resetPasswordVerify(req: AuthorizedRequest, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().regex(passwordRegex),
    verification: verificationSchema
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function verificationRequired(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    verification: verificationSchema
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function invest(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    ethAmount: Joi.number().required().min(0.1),
    mnemonic: Joi.string().required()
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function onlyJumioIp(req: Request, res: Response, next: NextFunction) {
  const jumioIps = [
    '184.106.91.66',
    '184.106.91.67',
    '104.130.61.196',
    '146.20.77.156',
    '34.202.241.227',
    '34.226.103.119',
    '34.226.254.127',
    '52.53.95.123',
    '52.52.51.178',
    '54.67.101.173',
    '162.13.228.132',
    '162.13.228.134',
    '162.13.229.103',
    '162.13.229.104',
    '34.253.41.236',
    '52.209.180.134',
    '52.48.0.25',
    '35.157.27.193',
    '52.57.194.92',
    '52.58.113.86'
  ];

  let ip = req.header(config.app.clientIpHeader as string) || req.ip;

  /*
   Check if IP has ipv6 prefix and remove it.
   See: https://stackoverflow.com/questions/29411551/express-js-req-ip-is-returning-ffff127-0-0-1
   */
  if (ip.substr(0, 7) === '::ffff:') {
    ip = ip.substr(7);
  }

  if (jumioIps.indexOf(ip) === -1) {
    return res.status(403).send();
  } else {
    return next();
  }
}

export function resendVerification(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    email: Joi.string().email().required()
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function onlyAcceptApplicationJson(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'OPTIONS' && req.header('Accept') !== 'application/json' && req.header('Content-Type') === 'application/json') {
    return res.status(406).json({
      error: 'Unsupported "Accept" header'
    });
  } else {
    return next();
  }
}
