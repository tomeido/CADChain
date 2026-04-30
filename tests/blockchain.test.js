import { jest } from '@jest/globals';
import { Block, Blockchain } from '../js/blockchain.js';
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

test('calculateHash is correct', async () => {
  const block = new Block(1, 123456789, { test: 'data' }, 'prevhash');
  const hash = await block.calculateHash();
  expect(hash).toBeDefined();
  expect(typeof hash).toBe('string');
});

describe('Block', () => {
  describe('calculateHash', () => {
    test('returns expected sha256 hash for specific data', async () => {
      const block = new Block(1, 1620000000000, { data: 'test' }, 'prevHash');
      block.nonce = 0;

      const hash = await block.calculateHash();

      // Expected string to hash: "1prevHash1620000000000{\"data\":\"test\"}0"
      expect(hash).toBe('d62b5f24f8459a4f1c8e5e431d1a2bbffaa7c539a6c773498d7cb0041e5d3a5e');
    });

    test('returns a string of 64 characters (hex length for SHA-256)', async () => {
      const block = new Block(2, Date.now(), { data: 'another test' }, 'someHash');
      const hash = await block.calculateHash();

      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    test('produces different hashes for different data', async () => {
      const block1 = new Block(1, 1620000000000, { data: 'test1' }, 'prevHash');
      const block2 = new Block(1, 1620000000000, { data: 'test2' }, 'prevHash');

      const hash1 = await block1.calculateHash();
      const hash2 = await block2.calculateHash();

      expect(hash1).not.toBe(hash2);
    });

    test('is deterministic (multiple calls return same result)', async () => {
      const block = new Block(1, 1620000000000, { data: 'test' }, 'prevHash');

      const hash1 = await block.calculateHash();
      const hash2 = await block.calculateHash();

      expect(hash1).toBe(hash2);
    });
  });
});
