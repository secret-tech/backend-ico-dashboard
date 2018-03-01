import { injectable } from 'inversify';
import 'reflect-metadata';
import config from '../config';
import { Logger } from '../logger';

@injectable()
export class MailjetService implements EmailServiceInterface {
  private logger = Logger.getInstance('EMAIL_MAILJET_SERVICE');
  private api: any;

  /**
   * Initiate concrete provider instance
   */
  constructor() {
    this.api = require('node-mailjet').connect(config.email.mailjet.apiKey, config.email.mailjet.apiSecret);
  }

  /**
   * @inheritdoc
   */
  public send(sender: string, recipient: string, subject: string, text: string): Promise<any> {
    const sendEmail = this.api.post('send');

    const emailData = {
      'FromEmail': sender,
      'Subject': subject,
      'Html-part': text,
      'Recipients': [{'Email': recipient}]
    };

    return sendEmail.request(emailData).catch(error => {
      this.logger.exception(error);
      return Promise.reject(error);
    });
  }
}
