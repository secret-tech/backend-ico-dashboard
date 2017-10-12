import * as Joi from 'joi';
import { Response, Request, NextFunction } from 'express';

const options = {
  allowUnknown: true
};

function unescape(str: string): string {
  return (str + '==='.slice((str.length + 3) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
}

function base64decode(str) {
  return Buffer.from(unescape(str), 'base64').toString('utf8');
}

export function createUser(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    agreeTos: Joi.boolean().only(true).required(),
    referral: Joi.string().email()
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
      method: Joi.string().required(),
    })
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function createTenant(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/)
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function loginTenant(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/)
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function createToken(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    login: Joi.string().required(),
    password: Joi.string().required(),
    deviceId: Joi.string().required()
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}

export function tokenRequired(req: Request, res: Response, next: NextFunction) {
  const schema = Joi.object().keys({
    token: Joi.string().required()
  });

  const result = Joi.validate(req.body, schema, options);

  if (result.error) {
    return res.status(422).json(result);
  } else {
    return next();
  }
}
