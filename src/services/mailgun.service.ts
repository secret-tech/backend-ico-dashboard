import * as Mailgun from 'mailgun-js';
import * as MailComposer from 'mailcomposer';
import { injectable } from 'inversify';
import 'reflect-metadata';
import config from '../config';
import { Logger } from '../logger';

@injectable()
export class MailgunService implements EmailServiceInterface {
  private logger = Logger.getInstance('EMAIL_MAILGUN_SERVICE');
  private api: any;

  /**
   * Initiate concrete provider instance
   */
  constructor() {
    this.api = new Mailgun({
      apiKey: config.email.mailgun.secret,
      domain: config.email.domain
    });
  }

  /**
   * @inheritdoc
   */
  public send(sender: string, recipient: string, subject: string, text: string): Promise<any> {
    /* istanbul ignore next */
    return new Promise((resolve, reject) => {
      let mail = MailComposer({
        from: sender,
        to: recipient,
        subject,
        html: text
      });

      mail.build((mailBuildError, message) => {
        let dataToSend = {
          to: recipient,
          message: message.toString('ascii')
        };

        this.api.messages().sendMime(dataToSend, (err, body) => {
          if (err) {
            this.logger.exception(err);
            reject(new Error(err));
          }
          resolve(body);
        });
      });
    });
  }
}
