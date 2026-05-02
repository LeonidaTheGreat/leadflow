'use strict';

const crypto = require('crypto');

class ApiKeyAuthService {
  static isAuthorized({ expected, provided }) {
    const expectedKey = String(expected || '').trim();
    const providedKey = String(provided || '').trim();

    if (!expectedKey || !providedKey) return false;

    const providedBuf = Buffer.from(providedKey);
    const expectedBuf = Buffer.from(expectedKey);

    return providedBuf.length === expectedBuf.length
      && crypto.timingSafeEqual(providedBuf, expectedBuf);
  }
}

module.exports = { ApiKeyAuthService };
