import { Block } from '../js/blockchain.js';

describe('Block', () => {
  describe('calculateHash', () => {
    test('returns expected sha256 hash for specific data', async () => {
      // Create a block with deterministic data
      const block = new Block(1, 1620000000000, { data: 'test' }, 'prevHash');
      block.nonce = 0;

      const hash = await block.calculateHash();

      // Expected string to hash: "1prevHash1620000000000{\"data\":\"test\"}0"
      // The SHA-256 hash of this string is d62b5f24f8459a4f1c8e5e431d1a2bbffaa7c539a6c773498d7cb0041e5d3a5e
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
