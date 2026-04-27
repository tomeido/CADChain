import { jest } from '@jest/globals';
import { CADEditor } from '../js/cadEditor.js';

describe('CADEditor Serialization', () => {
  let mockCanvas;
  let mockContext;

  beforeEach(() => {
    mockContext = {
      setTransform: jest.fn(),
      clearRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      fillRect: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      setLineDash: jest.fn(),
      strokeRect: jest.fn(),
      arc: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 10 }),
    };
    mockCanvas = {
      getContext: jest.fn().mockReturnValue(mockContext),
      parentElement: {
        getBoundingClientRect: jest.fn().mockReturnValue({ width: 800, height: 600 }),
      },
      style: {},
      addEventListener: jest.fn(),
      width: 800,
      height: 600,
    };
    global.document = {
      getElementById: jest.fn().mockReturnValue(mockCanvas),
      addEventListener: jest.fn(),
    };
    global.window = {
      addEventListener: jest.fn(),
      devicePixelRatio: 1,
    };
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
  });

  describe('serialize()', () => {
    test('serializes empty editor correctly', () => {
      const editor = new CADEditor('test-canvas');

      const serialized = editor.serialize();
      expect(serialized.version).toBe(1);
      expect(serialized.shapes).toEqual([]);
      expect(serialized.metadata.shapeCount).toBe(0);
      expect(typeof serialized.metadata.createdAt).toBe('string');
    });

    test('serializes editor with multiple shapes correctly', () => {
      const editor = new CADEditor('test-canvas');
      const shapes = [
        { type: 'line', x1: 0, y1: 0, x2: 10, y2: 10, color: '#06d6a0', lineWidth: 2 },
        { type: 'rect', x: 20, y: 20, w: 50, h: 50, color: '#06d6a0', lineWidth: 2 }
      ];
      editor.shapes = [...shapes];

      const serialized = editor.serialize();
      expect(serialized.version).toBe(1);
      expect(serialized.shapes).toEqual(shapes);
      expect(serialized.metadata.shapeCount).toBe(2);
      expect(typeof serialized.metadata.createdAt).toBe('string');
    });
  });

  describe('deserialize()', () => {
    test('deserializes valid data correctly', () => {
      const editor = new CADEditor('test-canvas');

      const mockRender = jest.fn();
      editor.render = mockRender;
      const mockOnShapesChanged = jest.fn();
      editor.onShapesChanged = mockOnShapesChanged;
      const mockPushUndo = jest.fn();
      editor.pushUndo = mockPushUndo;

      const data = {
        version: 1,
        shapes: [
          { type: 'line', x1: 0, y1: 0, x2: 10, y2: 10, color: '#06d6a0', lineWidth: 2 }
        ],
        metadata: { shapeCount: 1, createdAt: new Date().toISOString() }
      };

      editor.deserialize(data);

      expect(editor.shapes).toEqual(data.shapes);
      expect(editor.selectedShapeIndex).toBe(-1);
      expect(mockPushUndo).toHaveBeenCalled();
      expect(mockOnShapesChanged).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
    });

    test('handles missing data gracefully', () => {
      const editor = new CADEditor('test-canvas');
      editor.shapes = [{ type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }];

      const mockRender = jest.fn();
      editor.render = mockRender;

      editor.deserialize(undefined);

      // Shapes should remain unchanged
      expect(editor.shapes.length).toBe(1);
      expect(mockRender).not.toHaveBeenCalled();
    });

    test('handles data without shapes gracefully', () => {
      const editor = new CADEditor('test-canvas');
      editor.shapes = [{ type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }];

      const mockRender = jest.fn();
      editor.render = mockRender;

      editor.deserialize({ version: 1, metadata: {} });

      // Shapes should remain unchanged
      expect(editor.shapes.length).toBe(1);
      expect(mockRender).not.toHaveBeenCalled();
    });
  });
});
