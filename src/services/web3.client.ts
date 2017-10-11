const Web3 = require('web3');
import { injectable } from 'inversify';

export interface CreateAccountResult {
  address: string,
}

interface TransactionInput {
  from: string,
  to: string,
  amount: string,
  gas: number
}

export interface Web3ClientInterface {
  web3: any,
  createAccount: () => CreateAccountResult,
  sendTransaction: (input: TransactionInput) => any,
}

@injectable()
export class Web3Client implements Web3ClientInterface {
  web3: any;

  constructor() {
    this.web3 = new Web3(new Web3.providers.HttpProvider("http://rpc:8545"));
  }

  createAccount() : CreateAccountResult {
    const wallet = this.web3.eth.accounts.create();
    return {
      address: wallet.address
    }
  }

  sendTransaction(input: TransactionInput) : any {
    return this.web3.eth.sendTransaction({
      value: this.web3.utils.toWei(input.amount),
      from: input.from,
      to: input.to,
      gas: input.gas
    });
  }
}

const Web3ClientType = Symbol('Web3ClientInterface');
export { Web3ClientType };