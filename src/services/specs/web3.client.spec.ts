import { expect } from 'chai';
import { Web3Client } from '../web3.client';

describe('web3Client', () => {
  before(() => {
    this.client = new Web3Client();
  });

  describe('#sendTransactionByMnemonic', () => {
    it('should send transation by mnemonic', async() => {
      /*await this.client.sendTransactionByMnemonic({
          to: (await this.client.web3.eth.getAccounts())[0],
          amount: '0.01',
          gas: 220000
        },
        'mean garden addict lemon minor drastic clay demise mesh kingdom charge crash',
        '123456'
      );*/
    });
  });
});
