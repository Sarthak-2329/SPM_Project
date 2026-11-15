'use strict';

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class QrService {
  /**
   * Generates a QR code PNG file and returns the relative file path.
   * @param {string} content - URL or text to encode
   * @param {string} assetCode - identifier for the file name
   * @returns {Promise<string>} relative URL path e.g. /uploads/qrcodes/qr-AST-001.png
   */
  async generateQrCodeFile(content, assetCode) {
    const qrcodeDir = path.join(__dirname, '..', '..', 'uploads', 'qrcodes');
    if (!fs.existsSync(qrcodeDir)) {
      fs.mkdirSync(qrcodeDir, { recursive: true });
    }

    const safeCode = assetCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `qr-${safeCode}-${Date.now()}.png`;
    const fullPath = path.join(qrcodeDir, filename);

    await QRCode.toFile(fullPath, content, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return `/uploads/qrcodes/${filename}`;
  }

  /**
   * Generates a base64 DataURL representation of a QR code.
   * @param {string} content
   * @returns {Promise<string>}
   */
  async generateQrDataUrl(content) {
    return QRCode.toDataURL(content, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });
  }
}

module.exports = new QrService();
