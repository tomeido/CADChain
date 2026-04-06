/**
 * CADChain - Simple Blockchain Engine
 * SHA-256 기반 블록체인 코어 엔진
 */

class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = '';
  }

  /**
   * 블록 데이터를 SHA-256으로 해싱
   */
  async calculateHash() {
    const content = this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Proof-of-Work 마이닝
   * @param {number} difficulty - 해시 앞자리 0의 개수
   */
  async mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');
    while (true) {
      this.hash = await this.calculateHash();
      if (this.hash.substring(0, difficulty) === target) {
        break;
      }
      this.nonce++;
    }
    return this.hash;
  }

  /**
   * 직렬화를 위한 JSON 변환
   */
  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      nonce: this.nonce,
      hash: this.hash
    };
  }

  /**
   * JSON에서 Block 복원
   */
  static fromJSON(json) {
    const block = new Block(json.index, json.timestamp, json.data, json.previousHash);
    block.nonce = json.nonce;
    block.hash = json.hash;
    return block;
  }
}

class Blockchain {
  constructor(difficulty = 2) {
    this.chain = [];
    this.difficulty = difficulty;
    this.pendingData = [];
  }

  /**
   * 제네시스 블록 생성 (첫 번째 블록)
   */
  async createGenesisBlock() {
    const genesisBlock = new Block(0, Date.now(), {
      type: 'genesis',
      message: 'CADChain Genesis Block',
      createdAt: new Date().toISOString()
    }, '0');
    await genesisBlock.mineBlock(this.difficulty);
    this.chain.push(genesisBlock);
    return genesisBlock;
  }

  /**
   * 최신 블록 조회
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * 새 블록 추가
   * @param {Object} data - 블록에 저장할 데이터
   */
  async addBlock(data) {
    const previousBlock = this.getLatestBlock();
    const newBlock = new Block(
      previousBlock.index + 1,
      Date.now(),
      data,
      previousBlock.hash
    );
    await newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    this.save();
    return newBlock;
  }

  /**
   * 체인 유효성 검증
   * 각 블록의 해시와 이전 블록 해시 연결을 확인
   */
  async isChainValid() {
    const results = [];

    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // 현재 블록의 해시 재계산
      const recalculatedHash = await currentBlock.calculateHash();
      const hashValid = currentBlock.hash === recalculatedHash;

      // 이전 블록 해시 연결 확인
      const linkValid = currentBlock.previousHash === previousBlock.hash;

      results.push({
        blockIndex: i,
        hashValid,
        linkValid,
        valid: hashValid && linkValid
      });
    }

    return results;
  }

  /**
   * 파일 해시로 블록 검색
   */
  findBlockByFileHash(fileHash) {
    return this.chain.filter(block =>
      block.data && block.data.fileHash === fileHash
    );
  }

  /**
   * 체인 블록 수
   */
  get length() {
    return this.chain.length;
  }

  /**
   * LocalStorage에 체인 저장
   */
  save() {
    const data = {
      difficulty: this.difficulty,
      chain: this.chain.map(block => block.toJSON())
    };
    localStorage.setItem('cadchain', JSON.stringify(data));
  }

  /**
   * LocalStorage에서 체인 로드
   */
  static load() {
    const data = localStorage.getItem('cadchain');
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      const blockchain = new Blockchain(parsed.difficulty);
      blockchain.chain = parsed.chain.map(blockData => Block.fromJSON(blockData));
      return blockchain;
    } catch (e) {
      console.error('Failed to load blockchain:', e);
      return null;
    }
  }

  /**
   * 체인 초기화
   */
  static clear() {
    localStorage.removeItem('cadchain');
  }
}

export { Block, Blockchain };
