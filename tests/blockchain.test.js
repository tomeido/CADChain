import { Block, Blockchain } from '../js/blockchain.js';
import crypto from 'crypto';

// Polyfill crypto for node if needed
if (!globalThis.crypto) {
    globalThis.crypto = crypto;
}

test('calculateHash is correct', async () => {
    const block = new Block(1, 123456789, { test: 'data' }, 'prevhash');
    const hash = await block.calculateHash();
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
});
