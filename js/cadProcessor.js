/**
 * CADChain - CAD File Processor
 * CAD 파일 해싱 및 메타데이터 추출
 */

const CAD_EXTENSIONS = {
  // 2D CAD
  '.dxf': { name: 'DXF', category: '2D CAD', icon: '📐' },
  '.dwg': { name: 'DWG', category: '2D CAD', icon: '📐' },
  // 3D CAD
  '.step': { name: 'STEP', category: '3D CAD', icon: '🧊' },
  '.stp': { name: 'STEP', category: '3D CAD', icon: '🧊' },
  '.iges': { name: 'IGES', category: '3D CAD', icon: '🧊' },
  '.igs': { name: 'IGES', category: '3D CAD', icon: '🧊' },
  '.stl': { name: 'STL', category: '3D Print', icon: '🖨️' },
  '.obj': { name: 'OBJ', category: '3D Model', icon: '🧊' },
  '.3ds': { name: '3DS', category: '3D Model', icon: '🧊' },
  '.fbx': { name: 'FBX', category: '3D Model', icon: '🧊' },
  // BIM
  '.ifc': { name: 'IFC', category: 'BIM', icon: '🏗️' },
  '.rvt': { name: 'Revit', category: 'BIM', icon: '🏗️' },
  // Other
  '.pdf': { name: 'PDF', category: 'Document', icon: '📄' },
  '.svg': { name: 'SVG', category: 'Vector', icon: '🎨' },
};

class CADProcessor {
  /**
   * 파일을 ArrayBuffer로 읽기
   * @param {File} file
   * @returns {Promise<ArrayBuffer>}
   */
  static readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 파일의 SHA-256 해시 생성
   * @param {ArrayBuffer} buffer
   * @returns {Promise<string>}
   */
  static async hashBuffer(buffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 파일 확장자 추출
   * @param {string} filename
   * @returns {string}
   */
  static getExtension(filename) {
    const idx = filename.lastIndexOf('.');
    if (idx === -1) return '';
    return filename.substring(idx).toLowerCase();
  }

  /**
   * 파일 크기 포맷팅
   * @param {number} bytes
   * @returns {string}
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 파일 형식 정보 조회
   * @param {string} filename
   * @returns {Object}
   */
  static getFileTypeInfo(filename) {
    const ext = CADProcessor.getExtension(filename);
    return CAD_EXTENSIONS[ext] || { name: ext.toUpperCase().replace('.', ''), category: 'Other', icon: '📁' };
  }

  /**
   * 파일 처리 - 해시 생성 및 메타데이터 추출
   * @param {File} file
   * @returns {Promise<Object>}
   */
  static async processFile(file) {
    const buffer = await CADProcessor.readFile(file);
    const fileHash = await CADProcessor.hashBuffer(buffer);
    const typeInfo = CADProcessor.getFileTypeInfo(file.name);

    return {
      type: 'cad_upload',
      fileName: file.name,
      fileSize: file.size,
      fileSizeFormatted: CADProcessor.formatFileSize(file.size),
      fileType: typeInfo.name,
      fileCategory: typeInfo.category,
      fileIcon: typeInfo.icon,
      fileHash: fileHash,
      uploadedAt: new Date().toISOString(),
      lastModified: new Date(file.lastModified).toISOString()
    };
  }

  /**
   * 파일 검증 - 기존 해시와 비교
   * @param {File} file
   * @param {string} expectedHash
   * @returns {Promise<boolean>}
   */
  static async verifyFile(file, expectedHash) {
    const buffer = await CADProcessor.readFile(file);
    const actualHash = await CADProcessor.hashBuffer(buffer);
    return actualHash === expectedHash;
  }

  /**
   * 지원 형식 목록
   */
  static getSupportedFormats() {
    return Object.entries(CAD_EXTENSIONS).map(([ext, info]) => ({
      extension: ext,
      ...info
    }));
  }

  /**
   * 파일 입력에 사용할 accept 문자열
   */
  static getAcceptString() {
    return Object.keys(CAD_EXTENSIONS).join(',') + ',.*';
  }
}

export { CADProcessor, CAD_EXTENSIONS };
