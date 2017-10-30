import * as Bull from 'bull';
import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { Web3ClientInterface, Web3ClientType } from '../services/web3.client';

export interface Web3QueueInterface {
  addJob(data: any);
}

@injectable()
export class Web3Queue implements Web3QueueInterface {
  private queueWrapper: any;

  constructor(
    @inject(Web3ClientType) private web3Client: Web3ClientInterface
  ) {
    this.queueWrapper = new Bull('web3_queue', 'redis://redis:6379');
    this.queueWrapper.process((job) => {
      return this.process(job);
    });
  }

  private async process(job: Bull.Job): Promise<boolean> {
    await this.web3Client.addAddressToWhiteList(job.data.address);
    console.log('job done');
    return true;
  }

  addJob(data: any) {
    this.queueWrapper.add(data);
  }
}

const Web3QueueType = Symbol('Web3QueueInterface');
export { Web3QueueType };
