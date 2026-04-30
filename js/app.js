/**
 * CADChain - Main Application
 * CAD 에디터 + 블록체인 연결
 */

import { Blockchain } from './blockchain.js';
import { CADEditor } from './cadEditor.js';

class CADChainApp {
  constructor() {
    this.blockchain = null;
    this.editor = null;
    this.isProcessing = false;
    this.init();
  }

  async init() {
    // 블록체인 로드 또는 생성
    this.blockchain = Blockchain.load();
    if (!this.blockchain) {
      this.blockchain = new Blockchain(2);
      await this.blockchain.createGenesisBlock();
      this.blockchain.save();
    }

    // CAD 에디터 초기화
    this.editor = new CADEditor('cadCanvas');
    this.editor.onShapesChanged = () => this.updateShapeCount();

    this.bindEvents();
    this.renderBlockchain();
    this.updateStats();
    this.updateShapeCount();
    this.showNotification('CADChain 준비 완료', 'success');
  }

  bindEvents() {
    // 도구 버튼
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.editor.setTool(btn.dataset.tool);
      });
    });

    // 색상 프리셋
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.editor.setStrokeColor(swatch.dataset.color);
      });
    });

    // 선 두께
    document.getElementById('lineWidthRange').addEventListener('input', (e) => {
      this.editor.setLineWidth(parseFloat(e.target.value));
      document.getElementById('lineWidthValue').textContent = e.target.value + 'px';
    });

    // 그리드 토글
    document.getElementById('toggleGrid').addEventListener('click', (e) => {
      const on = this.editor.toggleGrid();
      e.currentTarget.classList.toggle('active', on);
    });

    // 스냅 토글
    document.getElementById('toggleSnap').addEventListener('click', (e) => {
      const on = this.editor.toggleSnap();
      e.currentTarget.classList.toggle('active', on);
    });

    // Undo / Redo
    document.getElementById('undoBtn').addEventListener('click', () => this.editor.undo());
    document.getElementById('redoBtn').addEventListener('click', () => this.editor.redo());

    // 캔버스 클리어
    document.getElementById('clearCanvasBtn').addEventListener('click', () => this.editor.clearAll());

    // 뷰 리셋
    document.getElementById('resetViewBtn').addEventListener('click', () => this.editor.resetView());

    // 블록체인에 저장
    document.getElementById('saveToChainBtn').addEventListener('click', () => this.saveToBlockchain());

    // 체인 검증
    document.getElementById('validateChainBtn').addEventListener('click', () => this.validateChain());

    // 체인 초기화
    document.getElementById('resetChainBtn').addEventListener('click', () => this.resetChain());

    // 우측 패널 탭
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
        document.getElementById(tab.dataset.panel).classList.add('active');
      });
    });
  }

  updateShapeCount() {
    const count = this.editor.shapes.length;
    document.getElementById('shapeCount').textContent = count;
    document.getElementById('saveToChainBtn').disabled = count === 0;
  }

  /**
   * 현재 도면을 블록체인에 저장
   */
  async saveToBlockchain() {
    if (this.isProcessing || this.editor.shapes.length === 0) return;
    this.isProcessing = true;

    const btn = document.getElementById('saveToChainBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-small"></span> 마이닝 중...';
    btn.disabled = true;

    try {
      const drawingData = this.editor.serialize();
      const drawingHash = await this.editor.getDrawingHash();

      // 도면 이름 (사용자 입력)
      const drawingName = prompt('도면 이름을 입력하세요:', `CAD Drawing #${this.blockchain.length}`) || `CAD Drawing #${this.blockchain.length}`;

      // 썸네일 생성
      const thumbnail = this.editor.toDataURL();

      const blockData = {
        type: 'cad_drawing',
        name: drawingName,
        drawingHash: drawingHash,
        shapeCount: drawingData.shapes.length,
        shapes: drawingData.shapes,
        thumbnail: thumbnail,
        createdAt: new Date().toISOString()
      };

      const newBlock = await this.blockchain.addBlock(blockData);

      this.renderBlockchain();
      this.updateStats();
      this.showNotification(`"${drawingName}" → Block #${newBlock.index} 저장 완료!`, 'success');

    } catch (error) {
      console.error('Save error:', error);
      this.showNotification('저장 실패: ' + error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = this.editor.shapes.length === 0;
      this.isProcessing = false;
    }
  }

  /**
   * 블록에서 도면 불러오기
   */
  loadFromBlock(blockIndex) {
    const block = this.blockchain.chain[blockIndex];
    if (!block || !block.data.shapes) return;

    if (this.editor.shapes.length > 0) {
      if (!confirm('현재 도면을 덮어쓰시겠습니까?')) return;
    }

    this.editor.deserialize({ shapes: block.data.shapes });
    this.showNotification(`Block #${blockIndex} 도면을 불러왔습니다`, 'info');
  }

  /**
   * 체인 유효성 검증
   */
  async validateChain() {
    const resultEl = document.getElementById('validationResult');
    resultEl.innerHTML = '<div class="validating"><div class="spinner-small"></div> 검증 중...</div>';

    const results = await this.blockchain.isChainValid();
    const allValid = results.every(r => r.valid);

    let html = `
      <div class="validation-result ${allValid ? 'valid' : 'invalid'}">
        <div class="validation-icon">${allValid ? '🔒' : '⚠️'}</div>
        <div class="validation-text">${allValid ? '전체 체인 유효' : '무결성 문제 발견'}</div>
        <div class="validation-detail">${results.length}개 블록 검증 완료</div>
      </div>
      <div class="validation-blocks">
    `;

    html += `<div class="v-block valid"><span>#0</span><span>✅ Genesis</span></div>`;
    results.forEach(r => {
      html += `<div class="v-block ${r.valid ? 'valid' : 'invalid'}"><span>#${r.blockIndex}</span><span>${r.valid ? '✅' : '❌'}</span></div>`;
    });

    html += '</div>';
    resultEl.innerHTML = html;
  }

  /**
   * 체인 초기화
   */
  async resetChain() {
    if (!confirm('블록체인을 초기화하시겠습니까?\n모든 블록 데이터가 삭제됩니다.')) return;

    Blockchain.clear();
    this.blockchain = new Blockchain(2);
    await this.blockchain.createGenesisBlock();
    this.blockchain.save();

    this.renderBlockchain();
    this.updateStats();
    document.getElementById('validationResult').innerHTML = '';
    this.showNotification('블록체인이 초기화되었습니다', 'warning');
  }

  /**
   * 블록체인 시각화
   */
  renderBlockchain() {
    const container = document.getElementById('blockchainView');
    const blocks = [...this.blockchain.chain].reverse();

    container.innerHTML = blocks.map((block, idx) => {
      const isGenesis = block.data.type === 'genesis';
      const data = block.data;

      return `
        <div class="block-card ${isGenesis ? 'genesis' : 'cad'}" style="animation-delay: ${idx * 0.06}s">
          <div class="block-top">
            <span class="block-num">#${block.index}</span>
            ${isGenesis ? '<span class="block-badge genesis-badge">Genesis</span>' : `<span class="block-badge cad-badge">CAD</span>`}
            <span class="block-time">${this.formatTime(block.timestamp)}</span>
          </div>

          ${!isGenesis ? `
            <div class="block-name">${data.name || 'Untitled'}</div>
            ${data.thumbnail ? `<div class="block-thumb"><img src="${data.thumbnail}" alt="Preview"></div>` : ''}
            <div class="block-meta">
              <span>📐 ${data.shapeCount || 0}개 도형</span>
            </div>
            <button class="load-btn" onclick="window.app.loadFromBlock(${block.index})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              불러오기
            </button>
          ` : `<div class="block-genesis-text">CADChain 시작</div>`}

          <div class="block-hashes">
            <div class="hash-line">
              <span>블록</span>
              <code>${block.hash.substring(0, 12)}…${block.hash.substring(56)}</code>
            </div>
            ${!isGenesis && data.drawingHash ? `
              <div class="hash-line">
                <span>도면</span>
                <code>${data.drawingHash.substring(0, 12)}…${data.drawingHash.substring(56)}</code>
              </div>
            ` : ''}
            <div class="hash-line">
              <span>이전</span>
              <code>${block.previousHash === '0' ? '0 (Genesis)' : block.previousHash.substring(0, 12) + '…' + block.previousHash.substring(56)}</code>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  updateStats() {
    const chain = this.blockchain.chain;
    const cadBlocks = chain.filter(b => b.data.type === 'cad_drawing');
    document.getElementById('statBlocks').textContent = chain.length;
    document.getElementById('statDrawings').textContent = cadBlocks.length;
    const totalShapes = cadBlocks.reduce((s, b) => s + (b.data.shapeCount || 0), 0);
    document.getElementById('statShapes').textContent = totalShapes;
  }

  formatTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return new Date(ts).toLocaleDateString('ko-KR');
  }

  showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    const iconSpan = document.createElement('span');
    iconSpan.textContent = icons[type];

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    el.appendChild(iconSpan);
    el.appendChild(messageSpan);

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new CADChainApp();
});
