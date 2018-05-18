import { expect } from 'chai';
import { TransactionService, TransactionServiceInterface, TransactionServiceType } from '../transaction.service';
import {
  ETHEREUM_TRANSFER, TOKEN_TRANSFER, TRANSACTION_STATUS_CONFIRMED,
  TRANSACTION_STATUS_FAILED
} from '../../entities/transaction';
import { container } from '../../ioc.container';
import config from '../../config';
require('../../../test/load.fixtures');

const transactionService = container.get<TransactionServiceInterface>(TransactionServiceType);

describe('TransactionService', () => {
  it('should return proper from/to/tokenAmount for token transfer transaction', () => {
    const input = {
      blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      blockNumber: null,
      from: '0xBd0cb067A75C23EFB290B4e223059Af8E4AF4fd8',
      gas: 90000,
      gasPrice: '4000000000',
      hash: '0xcdf4a9dc086bcb3308475ced42b772879fd052822693aee509f81493412d460f',
      input: '0xa9059cbb000000000000000000000000446cd17ee68bd5a567d43b696543615a94b017600000000000000000000000000000000000000000000000000de0b6b3a7640000',
      nonce: 170,
      to: '0x1A164bd1a4Bd6F26726DBa43972a91b20e7D93be',
      transactionIndex: 0,
      value: '0',
      v: '0x29',
      r: '0xb351e609ffc4b4c2a7ee47d8b38b0baef5426837903d7e8b0ecebc3b98111ce',
      s: '0x49f77089865ef4d84d49f2eee2e7524a711d882496e44105edefe3e824a26811'
    };

    const result = transactionService.getFromToTokenAmountByTxDataAndType(input, TOKEN_TRANSFER);

    expect(result).to.deep.eq({
      from: '0xBd0cb067A75C23EFB290B4e223059Af8E4AF4fd8',
      to: '0x446cd17EE68bD5A567d43b696543615a94b01760',
      tokenAmount: '1'
    });
  });

  it('should return proper from/to for eth transfer transaction', () => {
    const input = {
      blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      blockNumber: null,
      from: '0xBd0cb067A75C23EFB290B4e223059Af8E4AF4fd8',
      gas: 90000,
      gasPrice: '10000000000',
      hash: '0xe5d5ed39bf9eb64d3e56bf4a9d89b7f2bb026fc02c0d149027757936a1e7b6c7',
      input: '0x',
      nonce: 172,
      to: '0x446cd17EE68bD5A567d43b696543615a94b01760',
      transactionIndex: 0,
      value: '2000000000000000000',
      v: '0x29',
      r: '0xc4de0f4d07e00a50264f0d235fbf0f82e8609249693d40d426e647fd7a3fa6a6',
      s: '0x571953ac37a0a337036709bd0cca86413e035050d2d2210b50eb56cab891824'
    };

    const result = transactionService.getFromToTokenAmountByTxDataAndType(input, ETHEREUM_TRANSFER);

    expect(result).to.deep.eq({
      from: '0xBd0cb067A75C23EFB290B4e223059Af8E4AF4fd8',
      to: '0x446cd17EE68bD5A567d43b696543615a94b01760',
      tokenAmount: null
    });
  });

  it('should return correct status by receipt', () => {
    expect(transactionService.getTxStatusByReceipt({
      status: true
    })).to.eq(TRANSACTION_STATUS_CONFIRMED);

    expect(transactionService.getTxStatusByReceipt({
      status: '0x0'
    })).to.eq(TRANSACTION_STATUS_FAILED);
  });

  it('should return correct type by data', () => {
    expect(transactionService.getTxTypeByData({
      to: '0x446cd17EE68bD5A567d43b696543615a94b01760'
    })).to.eq(ETHEREUM_TRANSFER);

    expect(transactionService.getTxTypeByData({
      to: config.contracts.token.address
    })).to.eq(TOKEN_TRANSFER);
  });

  it('should return correct count by from/to', (done) => {
    transactionService.getUserCountByTxData({
      from: '0x99eb89a5D15A6D487da3f3C1fC4fc2378eE227aF',
      to: null
    }).then(result => {
      expect(result).to.eq(1);
      done();
    });
  });

  it('should return correct count by from/to', (done) => {
    transactionService.getUserCountByTxData({
      from: '0x54c0B824d575c60F3B80ba1ea3A0cCb5EE3F56eA',
      to: '0x99eb89a5D15A6D487da3f3C1fC4fc2378eE227aF'
    }).then(result => {
      expect(result).to.eq(2);
      done();
    });
  });
});
