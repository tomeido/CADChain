import { CADProcessor } from '../js/cadProcessor.js';

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
