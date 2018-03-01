import * as winston from 'winston';
import config from './config';

winston.configure({
  level: config.logging.level,
  transports: [newConsoleTransport()]
});

/**
 *
 * @param name
 */
export function newConsoleTransport(name?: string) {
  return new (winston.transports.Console)({
    label: name || '',
    timestamp: true,
    json: config.logging.format === 'json',
    colorize: config.logging.colorize,
    prettyPrint: config.logging.format === 'text',
    showLevel: true
  });
}

const EXCEPTION_CAPTION = 'Throwed exception: ';

/**
 * Simple logger with tags.
 */
declare interface SubLogger {
  addPrefix(text): SubLogger;
  addMeta(meta: { [k: string]: any; }): SubLogger;
  debug(msg: string, ...meta: any[]);
  verbose(msg: string, ...meta: any[]);
  info(msg: string, ...meta: any[]);
  warn(msg: string, ...meta: any[]);
  error(msg: string, ...meta: any[]);
  exception(...meta: any[]);
}

/**
 * Logger
 */
export class Logger extends winston.Logger {
  private static loggers: any = {};

  private constructor(private name: string) {
    super({
      level: config.logging.level,
      transports: [newConsoleTransport(name)]
    });
  }

  /**
   * Get logger with name prefixed
   * @param name
   */
  static getInstance(name: string): Logger {
    name = name || '';
    if (this.loggers[name]) {
      return this.loggers[name];
    }

    return this.loggers[name] = new Logger(name);
  }

  /**
   * Assign some tags for tagged scope logger.
   * const logger = this.logger.assignMeta({userEmail: user.email});
   * logger.verbose(`Create user`);
   *
   * @param initialMeta
   */
  sub(initialMeta: { [k: string]: any; }, initialPrefix?: string): SubLogger {
    let meta: { meta?: any } = initialMeta ? { meta: { ...initialMeta } } : {};
    let prefix = initialPrefix || '';
    return {
      addPrefix: (text): SubLogger => {
        return this.sub(meta.meta, prefix + text);
      },
      addMeta: (assignMeta: { [k: string]: any; }): SubLogger => {
        return this.sub({ ...assignMeta, ...meta.meta }, prefix);
      },
      debug: (msg: string, ...customMeta: any[]) => {
        return this.debug(prefix + msg, ...customMeta, meta);
      },
      verbose: (msg: string, ...customMeta: any[]) => {
        return this.verbose(prefix + msg, ...customMeta, meta);
      },
      info: (msg: string, ...customMeta: any[]) => {
        return this.info(prefix + msg, ...customMeta, meta);
      },
      warn: (msg: string, ...customMeta: any[]) => {
        return this.warn(prefix + msg, ...customMeta, meta);
      },
      error: (msg: string, ...customMeta: any[]) => {
        return this.error(prefix + msg, ...customMeta, meta);
      },
      exception: (...customMeta: any[]) => {
        return this.error(prefix + EXCEPTION_CAPTION, ...customMeta, meta);
      }
    }
  }

  exception(msg: string, ...meta: any[]): any {
    return this.error(EXCEPTION_CAPTION + msg, ...meta);
  }
}
