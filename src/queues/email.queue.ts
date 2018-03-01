import * as Bull from 'bull';
import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { EmailServiceType } from '../types';
import config from '../config';
import { Logger } from '../logger';

export interface EmailQueueInterface {
  addJob(data: any);
}

@injectable()
export class EmailQueue implements EmailQueueInterface {
  private logger = Logger.getInstance('EMAIL_QUEUE');
  private queueWrapper: any;

  constructor(
    @inject(EmailServiceType) private emailService: EmailServiceInterface
  ) {
    this.queueWrapper = new Bull('email_queue', config.redis.url);
    this.queueWrapper.process((job) => {
      return this.process(job);
    });

    this.queueWrapper.on('error', (error) => {
      this.logger.exception(error);
    });
    this.logger.verbose('Email job worker started');
  }

  private async process(job: Bull.Job): Promise<boolean> {
    await this.emailService.send(
      job.data.sender,
      job.data.recipient,
      job.data.subject,
      job.data.text
    );
    return true;
  }

  addJob(data: any) {
    this.queueWrapper.add(data);
  }
}

const EmailQueueType = Symbol('EmailQueueInterface');
export { EmailQueueType };
