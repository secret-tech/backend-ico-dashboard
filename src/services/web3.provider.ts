import { injectable } from 'inversify';
import config from '../config';
const Web3 = require('web3');
const net = require('net');

export interface Web3ProviderInterface {
  web3: any;
}

@injectable()
export class Web3Provider {
  web3: any;

  constructor() {
    switch (config.rpc.type) {
      case 'ipc':
        this.web3 = new Web3(new Web3.providers.IpcProvider(config.rpc.address, net));
        break;
      case 'ws':
        const webSocketProvider = new Web3.providers.WebsocketProvider(config.rpc.address);

        webSocketProvider.connection.onclose = () => {
          console.log(new Date().toUTCString() + ':Web3 socket connection closed');
          this.onWsClose();
        };

        webSocketProvider.connection.onerror = () => {
          console.log(new Date().toUTCString() + ':Web3 socket connection error');
          this.onWsClose();
        };

        this.web3 = new Web3(webSocketProvider);
        break;
      case 'http':
        this.web3 = new Web3(config.rpc.address);
        break;
      default:
        throw Error('Unknown Web3 RPC type!');
    }
  }

  onWsClose() {
    console.error(new Date().toUTCString() + ': Web3 socket connection closed. Trying to reconnect');
    const webSocketProvider = new Web3.providers.WebsocketProvider(config.rpc.address);
    webSocketProvider.connection.onclose = () => {
      console.log(new Date().toUTCString() + ':Web3 socket connection closed');
      setTimeout(() => {
        this.onWsClose();
      }, config.rpc.reconnectTimeout);
    };

    webSocketProvider.connection.onerror = () => {
      console.log(new Date().toUTCString() + ':Web3 socket connection error');
      setTimeout(() => {
        this.onWsClose();
      }, config.rpc.reconnectTimeout);
    };

    this.web3 = new Web3(webSocketProvider);
  }
}

const Web3ProviderType = Symbol('Web3ProviderInterface');
export { Web3ProviderType };
