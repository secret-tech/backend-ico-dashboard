import { expect } from 'chai';
import { Web3Client } from '../web3.client';

describe('web3Client', () => {
  before(() => {
    this.client = new Web3Client();
  });

  describe('#createAccount', () => {
    it('should create new account', () => {
      const result = this.client.createAccount();
      console.log(result);
    });
  });

  describe('#sendTransaction', () => {
    it('should send transaction', async () => {
      const to = this.client.createAccount().address;

      const result = await this.client.sendTransaction(
        (await this.client.web3.eth.getAccounts())[0],
        to,
        1
      );
      console.log(result);
    });
  });
});
