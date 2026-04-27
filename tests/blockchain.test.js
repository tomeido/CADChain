import { jest } from '@jest/globals';
import { Blockchain } from '../js/blockchain.js';
import crypto from 'crypto';

// Polyfill crypto for node environment
if (!globalThis.crypto) {
  globalThis.crypto = {
    subtle: crypto.webcrypto.subtle
  };
}

describe('Blockchain', () => {
  beforeAll(() => {
    global.localStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
    };
  });

  describe('isChainValid', () => {
    let blockchain;

    beforeEach(async () => {
      blockchain = new Blockchain(1); // Set low difficulty for fast tests
      await blockchain.createGenesisBlock();
    });

    it('should return valid for a valid chain with one block', async () => {
      const results = await blockchain.isChainValid();
      expect(results.length).toBe(0); // Only genesis block
    });

    it('should return valid for a valid chain with multiple blocks', async () => {
      await blockchain.addBlock({ data: 'Block 1' });
      await blockchain.addBlock({ data: 'Block 2' });

      const results = await blockchain.isChainValid();
      expect(results.length).toBe(2);
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('should return invalid when a block data is modified', async () => {
      await blockchain.addBlock({ data: 'Block 1' });
      await blockchain.addBlock({ data: 'Block 2' });

      // Tamper with data
      blockchain.chain[1].data = { data: 'Tampered Block 1' };

      const results = await blockchain.isChainValid();

      // Block 1 will have invalid hash, and its validity will be false.
      expect(results[0].hashValid).toBe(false);
      expect(results[0].valid).toBe(false);
    });

    it('should return invalid when previousHash link is broken', async () => {
      await blockchain.addBlock({ data: 'Block 1' });
      await blockchain.addBlock({ data: 'Block 2' });

      // Break the link
      blockchain.chain[2].previousHash = 'broken-hash';

      const results = await blockchain.isChainValid();
      expect(results[1].linkValid).toBe(false);
      expect(results[1].valid).toBe(false);
    });
  });
});
