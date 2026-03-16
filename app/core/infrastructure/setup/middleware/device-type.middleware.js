'use strict';

const { getEnumValues } = require('@core/domain/enums');

const VALID_DEVICE_TYPES = getEnumValues('request.deviceTypes'); // ['web', 'mobile', 'agent']

function deny(res, statusCode, message) {
  return res.status(statusCode).json({
    request: {
      requestCode:   String(statusCode),
      resultMessage: message,
      requestResult: false,
    },
    payload: null,
  });
}

/**
 * X-Device-Type middleware. REQUIRED on every request.
 * Sets req.deviceType = 'web' | 'mobile' | 'agent'
 */
module.exports = (req, res, next) => {
  const deviceType = req.headers['x-device-type'];

  if (!deviceType) {
    return deny(res, 400, `X-Device-Type header is required. Allowed: ${VALID_DEVICE_TYPES.join(', ')}`);
  }

  const normalized = deviceType.toLowerCase().trim();

  if (!VALID_DEVICE_TYPES.includes(normalized)) {
    return deny(res, 400, `Invalid X-Device-Type: "${deviceType}". Allowed: ${VALID_DEVICE_TYPES.join(', ')}`);
  }

  req.deviceType = normalized;
  return next();
};
