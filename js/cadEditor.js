/**
 * CADChain - Canvas CAD Editor
 * 브라우저 내 간단한 2D CAD 드로잉 엔진
 */

class CADEditor {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // 상태
    this.shapes = [];
    this.currentShape = null;
    this.selectedShapeIndex = -1;
    this.tool = 'line'; // line, rect, circle, freehand, text, select
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;

    // 설정
    this.strokeColor = '#06d6a0';
    this.fillColor = 'transparent';
    this.lineWidth = 2;
    this.gridSize = 20;
    this.showGrid = true;
    this.snapToGrid = true;

    // 뷰 (줌 & 팬)
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    // Undo/Redo
    this.undoStack = [];
    this.redoStack = [];

    // 프리핸드 임시 점들
    this.freehandPoints = [];

    // 렌더링 최적화
    this.renderRequested = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.setupCanvas();
    this.bindEvents();
    this.render();
  }

  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.requestRender();
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    // 키보드
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  /**
   * 마우스 좌표 → 월드 좌표
   */
  screenToWorld(sx, sy) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (sx - rect.left - this.offsetX) / this.scale,
      y: (sy - rect.top - this.offsetY) / this.scale
    };
  }

  /**
   * 그리드 스냅
   */
  snap(val) {
    if (!this.snapToGrid) return val;
    return Math.round(val / this.gridSize) * this.gridSize;
  }

  // ─── Mouse Events ───────────────────────────

  onMouseDown(e) {
    // 휠 클릭 또는 Space+클릭 → 팬
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.panStartX = e.clientX - this.offsetX;
      this.panStartY = e.clientY - this.offsetY;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    const pos = this.screenToWorld(e.clientX, e.clientY);
    const x = this.snap(pos.x);
    const y = this.snap(pos.y);

    if (this.tool === 'select') {
      this.selectedShapeIndex = this.hitTest(pos.x, pos.y);
      this.render();
      return;
    }

    this.isDrawing = true;
    this.startX = x;
    this.startY = y;

    if (this.tool === 'freehand') {
      this.freehandPoints = [{ x, y }];
    }
  }

  onMouseMove(e) {
    if (this.isPanning) {
      this.offsetX = e.clientX - this.panStartX;
      this.offsetY = e.clientY - this.panStartY;
      this.requestRender();
      return;
    }

    if (!this.isDrawing) {
      // 호버 커서
      if (this.tool === 'select') {
        const pos = this.screenToWorld(e.clientX, e.clientY);
        const hit = this.hitTest(pos.x, pos.y);
        this.canvas.style.cursor = hit >= 0 ? 'pointer' : 'default';
      }
      return;
    }

    const pos = this.screenToWorld(e.clientX, e.clientY);
    const x = this.snap(pos.x);
    const y = this.snap(pos.y);

    if (this.tool === 'freehand') {
      this.freehandPoints.push({ x, y });
    }

    // 미리보기 렌더 요청
    this.lastMouseX = x;
    this.lastMouseY = y;
    this.requestRender();
  }

  onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.tool === 'select' ? 'default' : 'crosshair';
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    const pos = this.screenToWorld(e.clientX, e.clientY);
    const x = this.snap(pos.x);
    const y = this.snap(pos.y);

    let shape = null;

    switch (this.tool) {
      case 'line':
        if (this.startX !== x || this.startY !== y) {
          shape = { type: 'line', x1: this.startX, y1: this.startY, x2: x, y2: y, stroke: this.strokeColor, lineWidth: this.lineWidth };
        }
        break;
      case 'rect':
        const rw = x - this.startX;
        const rh = y - this.startY;
        if (rw !== 0 && rh !== 0) {
          shape = { type: 'rect', x: Math.min(this.startX, x), y: Math.min(this.startY, y), w: Math.abs(rw), h: Math.abs(rh), stroke: this.strokeColor, fill: this.fillColor, lineWidth: this.lineWidth };
        }
        break;
      case 'circle':
        const dx = x - this.startX;
        const dy = y - this.startY;
        const radius = Math.sqrt(dx * dx + dy * dy);
        if (radius > 2) {
          shape = { type: 'circle', cx: this.startX, cy: this.startY, r: radius, stroke: this.strokeColor, fill: this.fillColor, lineWidth: this.lineWidth };
        }
        break;
      case 'freehand':
        if (this.freehandPoints.length > 2) {
          shape = { type: 'freehand', points: [...this.freehandPoints], stroke: this.strokeColor, lineWidth: this.lineWidth };
        }
        this.freehandPoints = [];
        break;
    }

    if (shape) {
      this.pushUndo();
      this.shapes.push(shape);
      this.onShapesChanged();
    }

    this.render();
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    this.offsetX = mx - (mx - this.offsetX) * zoomFactor;
    this.offsetY = my - (my - this.offsetY) * zoomFactor;
    this.scale *= zoomFactor;
    this.scale = Math.max(0.1, Math.min(5, this.scale));

    this.requestRender();
  }

  onDoubleClick(e) {
    if (this.tool !== 'text') return;
    const pos = this.screenToWorld(e.clientX, e.clientY);
    const x = this.snap(pos.x);
    const y = this.snap(pos.y);

    const text = prompt('텍스트 입력:');
    if (text && text.trim()) {
      this.pushUndo();
      this.shapes.push({
        type: 'text', x, y, text: text.trim(),
        stroke: this.strokeColor, fontSize: 14, lineWidth: this.lineWidth
      });
      this.onShapesChanged();
      this.render();
    }
  }

  onKeyDown(e) {
    // Ctrl+Z → Undo
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      this.undo();
    }
    // Ctrl+Y → Redo
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      this.redo();
    }
    // Delete → 선택된 도형 삭제
    if (e.key === 'Delete' && this.selectedShapeIndex >= 0) {
      this.pushUndo();
      this.shapes.splice(this.selectedShapeIndex, 1);
      this.selectedShapeIndex = -1;
      this.onShapesChanged();
      this.render();
    }
  }

  // ─── Drawing ────────────────────────────────

  requestRender() {
    if (this.renderRequested) return;
    this.renderRequested = true;
    requestAnimationFrame(() => {
      this.render();
      if (this.isDrawing) {
        this.drawPreview(this.lastMouseX, this.lastMouseY);
      }
      this.renderRequested = false;
    });
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    // 배경
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // 그리드
    if (this.showGrid) this.drawGrid(w, h);

    // 도형 렌더
    this.shapes.forEach((shape, idx) => {
      this.drawShape(shape, idx === this.selectedShapeIndex);
    });

    ctx.restore();

    // 좌표 표시
    this.drawHUD(w, h);
  }

  drawGrid(w, h) {
    const ctx = this.ctx;
    const gs = this.gridSize;

    const startX = Math.floor(-this.offsetX / this.scale / gs) * gs - gs;
    const startY = Math.floor(-this.offsetY / this.scale / gs) * gs - gs;
    const endX = startX + w / this.scale + gs * 2;
    const endY = startY + h / this.scale + gs * 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gs) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gs) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // 원점 십자선
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(0, endY);
    ctx.moveTo(startX, 0);
    ctx.lineTo(endX, 0);
    ctx.stroke();
  }

  drawShape(shape, selected = false) {
    const ctx = this.ctx;
    ctx.strokeStyle = shape.stroke || '#06d6a0';
    ctx.lineWidth = shape.lineWidth || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (selected) {
      ctx.shadowColor = '#06d6a0';
      ctx.shadowBlur = 12;
    }

    switch (shape.type) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
        break;
      case 'rect':
        if (shape.fill && shape.fill !== 'transparent') {
          ctx.fillStyle = shape.fill;
          ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
        }
        ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        if (shape.fill && shape.fill !== 'transparent') {
          ctx.fillStyle = shape.fill;
          ctx.fill();
        }
        ctx.stroke();
        break;
      case 'freehand':
        if (shape.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
        break;
      case 'text':
        ctx.font = `${shape.fontSize || 14}px 'Inter', sans-serif`;
        ctx.fillStyle = shape.stroke;
        ctx.fillText(shape.text, shape.x, shape.y);
        break;
    }

    if (selected) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }

  drawPreview(mx, my) {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.7;

    switch (this.tool) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(mx, my);
        ctx.stroke();
        break;
      case 'rect':
        ctx.strokeRect(
          Math.min(this.startX, mx), Math.min(this.startY, my),
          Math.abs(mx - this.startX), Math.abs(my - this.startY)
        );
        break;
      case 'circle':
        const dx = mx - this.startX;
        const dy = my - this.startY;
        const r = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.arc(this.startX, this.startY, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'freehand':
        if (this.freehandPoints.length > 1) {
          ctx.beginPath();
          ctx.moveTo(this.freehandPoints[0].x, this.freehandPoints[0].y);
          for (let i = 1; i < this.freehandPoints.length; i++) {
            ctx.lineTo(this.freehandPoints[i].x, this.freehandPoints[i].y);
          }
          ctx.stroke();
        }
        break;
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawHUD(w, h) {
    const ctx = this.ctx;

    // 줌 레벨
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.textAlign = 'right';
    ctx.fillText(`Zoom: ${Math.round(this.scale * 100)}%`, w - 12, h - 12);
    ctx.fillText(`Shapes: ${this.shapes.length}`, w - 12, h - 28);
    ctx.textAlign = 'left';
  }

  // ─── Hit Testing ────────────────────────────

  hitTest(wx, wy) {
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      if (this.isPointInShape(wx, wy, this.shapes[i])) return i;
    }
    return -1;
  }

  isPointInShape(px, py, shape) {
    const margin = 8 / this.scale;
    switch (shape.type) {
      case 'line':
        return this.pointToLineDistance(px, py, shape.x1, shape.y1, shape.x2, shape.y2) < margin;
      case 'rect':
        return px >= shape.x - margin && px <= shape.x + shape.w + margin &&
               py >= shape.y - margin && py <= shape.y + shape.h + margin;
      case 'circle':
        const d = Math.sqrt((px - shape.cx) ** 2 + (py - shape.cy) ** 2);
        return Math.abs(d - shape.r) < margin || d < shape.r;
      case 'text':
        return px >= shape.x - margin && px <= shape.x + 100 + margin &&
               py >= shape.y - 16 - margin && py <= shape.y + margin;
      case 'freehand':
        for (let i = 1; i < shape.points.length; i++) {
          if (this.pointToLineDistance(px, py, shape.points[i-1].x, shape.points[i-1].y, shape.points[i].x, shape.points[i].y) < margin) return true;
        }
        return false;
    }
    return false;
  }

  pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let t = lenSq !== 0 ? dot / lenSq : -1;
    t = Math.max(0, Math.min(1, t));
    const nearX = x1 + t * C, nearY = y1 + t * D;
    return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
  }

  // ─── Undo / Redo ────────────────────────────

  pushUndo() {
    this.undoStack.push(JSON.parse(JSON.stringify(this.shapes)));
    this.redoStack = [];
    if (this.undoStack.length > 50) this.undoStack.shift();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(JSON.parse(JSON.stringify(this.shapes)));
    this.shapes = this.undoStack.pop();
    this.selectedShapeIndex = -1;
    this.onShapesChanged();
    this.render();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(JSON.parse(JSON.stringify(this.shapes)));
    this.shapes = this.redoStack.pop();
    this.selectedShapeIndex = -1;
    this.onShapesChanged();
    this.render();
  }

  // ─── Tool / Settings ────────────────────────

  setTool(toolName) {
    this.tool = toolName;
    this.selectedShapeIndex = -1;
    this.canvas.style.cursor = toolName === 'select' ? 'default' : 'crosshair';
    this.render();
  }

  setStrokeColor(color) {
    this.strokeColor = color;
  }

  setFillColor(color) {
    this.fillColor = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.render();
    return this.showGrid;
  }

  toggleSnap() {
    this.snapToGrid = !this.snapToGrid;
    return this.snapToGrid;
  }

  clearAll() {
    if (this.shapes.length === 0) return;
    this.pushUndo();
    this.shapes = [];
    this.selectedShapeIndex = -1;
    this.onShapesChanged();
    this.render();
  }

  resetView() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.render();
  }

  // ─── Serialization ──────────────────────────

  /**
   * 현재 도면을 JSON으로 직렬화
   */
  serialize() {
    return {
      version: 1,
      shapes: JSON.parse(JSON.stringify(this.shapes)),
      metadata: {
        shapeCount: this.shapes.length,
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * JSON에서 도면을 복원
   */
  deserialize(data) {
    if (!data || !data.shapes) return;
    this.pushUndo();
    this.shapes = data.shapes;
    this.selectedShapeIndex = -1;
    this.onShapesChanged();
    this.render();
  }

  /**
   * 직렬화된 데이터의 SHA-256 해시 생성
   */
  async getDrawingHash() {
    const json = JSON.stringify(this.serialize());
    const encoder = new TextEncoder();
    const buffer = encoder.encode(json);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 캔버스를 PNG 데이터 URL로 내보내기
   */
  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  /**
   * 도형 변경 콜백 (외부에서 오버라이드)
   */
  onShapesChanged() {
    // Override this in app.js
  }
}

export { CADEditor };
