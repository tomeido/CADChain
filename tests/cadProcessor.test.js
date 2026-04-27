import { jest } from '@jest/globals';
import { CADProcessor } from '../js/cadProcessor.js';

describe('CADProcessor.verifyFile', () => {
  let readFileSpy;
  let hashBufferSpy;

  beforeEach(() => {
    readFileSpy = jest.spyOn(CADProcessor, 'readFile');
    hashBufferSpy = jest.spyOn(CADProcessor, 'hashBuffer');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns true when actual hash matches expected hash', async () => {
    const mockFile = { name: 'test.dxf', size: 1024 };
    const expectedHash = 'abcd1234efgh5678';

    readFileSpy.mockResolvedValue(new ArrayBuffer(8));
    hashBufferSpy.mockResolvedValue(expectedHash);

    const result = await CADProcessor.verifyFile(mockFile, expectedHash);

    expect(result).toBe(true);
    expect(readFileSpy).toHaveBeenCalledWith(mockFile);
    expect(hashBufferSpy).toHaveBeenCalled();
  });

  test('returns false when actual hash does not match expected hash', async () => {
    const mockFile = { name: 'test.dxf', size: 1024 };
    const expectedHash = 'abcd1234efgh5678';
    const actualHash = '1234abcd5678efgh';

    readFileSpy.mockResolvedValue(new ArrayBuffer(8));
    hashBufferSpy.mockResolvedValue(actualHash);

    const result = await CADProcessor.verifyFile(mockFile, expectedHash);

    expect(result).toBe(false);
    expect(readFileSpy).toHaveBeenCalledWith(mockFile);
    expect(hashBufferSpy).toHaveBeenCalled();
  });

  test('propagates errors from readFile', async () => {
    const mockFile = { name: 'error.dxf' };
    const expectedHash = 'abcd';
    const error = new Error('Failed to read file');

    readFileSpy.mockRejectedValue(error);

    await expect(CADProcessor.verifyFile(mockFile, expectedHash)).rejects.toThrow(error);
  });

  test('propagates errors from hashBuffer', async () => {
    const mockFile = { name: 'test.dxf' };
    const expectedHash = 'abcd';
    const error = new Error('Failed to hash');

    readFileSpy.mockResolvedValue(new ArrayBuffer(8));
    hashBufferSpy.mockRejectedValue(error);

    await expect(CADProcessor.verifyFile(mockFile, expectedHash)).rejects.toThrow(error);
  });
});

describe('CADProcessor.getExtension', () => {
  test('returns the extension for a normal filename', () => {
    expect(CADProcessor.getExtension('document.pdf')).toBe('.pdf');
  });

  test('returns the extension in lowercase', () => {
    expect(CADProcessor.getExtension('drawing.DWG')).toBe('.dwg');
  });

  test('returns the last extension for filenames with multiple dots', () => {
    expect(CADProcessor.getExtension('archive.tar.gz')).toBe('.gz');
  });

  test('returns an empty string for filenames without an extension', () => {
    expect(CADProcessor.getExtension('README')).toBe('');
  });

  test('handles hidden files starting with a dot', () => {
    expect(CADProcessor.getExtension('.htaccess')).toBe('.htaccess');
  });

  test('returns an empty string for an empty input', () => {
    expect(CADProcessor.getExtension('')).toBe('');
  });

  test('handles filenames ending with a dot', () => {
    expect(CADProcessor.getExtension('file.')).toBe('.');
  });

  test('handles filenames with space', () => {
    expect(CADProcessor.getExtension('my drawing.dxf')).toBe('.dxf');
  });
});

describe('CADProcessor.formatFileSize', () => {
  test('returns "0 Bytes" for 0 bytes', () => {
    expect(CADProcessor.formatFileSize(0)).toBe('0 Bytes');
  });

  test('formats bytes correctly', () => {
    expect(CADProcessor.formatFileSize(500)).toBe('500 Bytes');
  });

  test('formats KB correctly', () => {
    expect(CADProcessor.formatFileSize(1024)).toBe('1 KB');
    expect(CADProcessor.formatFileSize(1536)).toBe('1.5 KB');
  });

  test('formats MB correctly', () => {
    expect(CADProcessor.formatFileSize(1048576)).toBe('1 MB');
    expect(CADProcessor.formatFileSize(2569011)).toBe('2.45 MB');
  });

  test('formats GB correctly', () => {
    expect(CADProcessor.formatFileSize(1073741824)).toBe('1 GB');
    expect(CADProcessor.formatFileSize(1610612736)).toBe('1.5 GB');
  });
});
