import { Response } from 'express';
import { INTERNAL_SERVER_ERROR, OK } from 'http-status';

/**
 * Format default json response
 * @param res
 * @param status
 * @param responseJson
 */
export function responseWith(res: Response, responseJson: Object, status: number = OK) {
  return res.status(status).json({ ...responseJson, status });
}

/**
 * Format default error response by custom object
 * @param res
 * @param err
 * @param status
 */
export function responseErrorWithObject(res: Response, err: any, status: number = INTERNAL_SERVER_ERROR) {
  return responseWith(res, {
    ...err,
    status
  }, status);
}
