const Web3 = require('web3');
import { injectable } from 'inversify';
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
import 'reflect-metadata';

export interface CreateAccountResult {
  address: string,
}

interface TransactionInput {
  to: string,
  amount: string,
  gas: number
}

export interface Web3ClientInterface {
  web3: any,
  sendTransactionByMnemonic: (input: TransactionInput, mnemonic: string, salt: string) => Promise<any>,
  generateMnemonic: () => string,
  getAccountByMnemonicAndSalt: (mnemonic: string, salt: string) => any,
}

@injectable()
export class Web3Client implements Web3ClientInterface {
  web3: any;

  constructor() {
    this.web3 = new Web3(new Web3.providers.HttpProvider("http://rpc:8545"));
  }

  async sendTransactionByMnemonic(input: TransactionInput, mnemonic: string, salt: string): Promise<any> {
    const account = this.getAccountByMnemonicAndSalt(mnemonic, salt);
    this.web3.eth.accounts.wallet.add(account);

    const params = {
      value: this.web3.utils.toWei(input.amount),
      from: account.address,
      to: input.to,
      gas: 220000
    };

    const transactionResult = await this.web3.eth.sendTransaction(params);

    this.web3.eth.accounts.wallet.remove(account);

    return transactionResult;
  }

  generateMnemonic(): string {
    return bip39.generateMnemonic();
  }

  getAccountByMnemonicAndSalt(mnemonic: string, salt: string): any {
    const privateKey = this.getPrivateKeyByMnemonicAndSalt(mnemonic, salt);
    return this.web3.eth.accounts.privateKeyToAccount(privateKey);
  }

  getPrivateKeyByMnemonicAndSalt(mnemonic: string, salt: string) {
    //get seed
    const hdWallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic, salt));

    //get first of available wallets
    const path = "m/44'/60'/0'/0/0";

    //get wallet
    const wallet = hdWallet.derivePath(path).getWallet();

    //get private key
    return "0x" + wallet.getPrivateKey().toString("hex");
  }
}

const Web3ClientType = Symbol('Web3ClientInterface');
export { Web3ClientType };