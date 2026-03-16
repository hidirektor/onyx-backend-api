'use strict';

const geoip     = require('geoip-lite');
const geoConfig = require('@infrastructure/setup/configs/geo-protection.config');
const logger    = require('@shared/utils/logger');

function deny(res, message) {
  return res.status(403).json({
    request: {
      requestCode:   '403',
      resultMessage: message,
      requestResult: false,
    },
    payload: null,
  });
}

function extractClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || null;
}

function detectProxyVpn(req) {
  const risks = [];

  const xff = req.headers['x-forwarded-for'];
  if (xff && xff.split(',').length > 2) {
    risks.push(`Deep X-Forwarded-For chain (${xff.split(',').length} hops)`);
  }

  const proxyHeaders = [
    'via', 'proxy-connection', 'forwarded',
    'x-forwarded-host', 'x-anonymizing-proxy',
    'x-bluecoat-via', 'x-proxy-id', 'x-tinyproxy',
  ];
  for (const h of proxyHeaders) {
    if (req.headers[h]) { risks.push(`Proxy header: ${h}`); break; }
  }

  return risks;
}

/**
 * GeoProtection middleware.
 * Enforces country whitelist/blacklist and blocks VPN/proxy traffic.
 * Sets req.geoInfo = { ip, country, city, trusted }
 */
module.exports = (req, res, next) => {
  if (!geoConfig.enabled) return next();

  const clientIp = extractClientIp(req);

  if (clientIp && geoConfig.trustedIps.includes(clientIp)) {
    req.geoInfo = { ip: clientIp, country: null, trusted: true };
    return next();
  }

  if (geoConfig.blockVpn || geoConfig.blockProxy) {
    const risks = detectProxyVpn(req);
    if (risks.length > 0) {
      logger.warn(`[GeoProtection] Proxy/VPN blocked ${clientIp}: ${risks.join('; ')}`);
      return deny(res, 'Access denied: VPN or proxy usage is not permitted.');
    }
  }

  const geo     = clientIp ? geoip.lookup(clientIp) : null;
  const country = geo?.country || null;

  req.geoInfo = { ip: clientIp, country, city: geo?.city || null, trusted: false };

  if (geoConfig.mode === 'off' || !country) return next();

  if (geoConfig.mode === 'whitelist' && !geoConfig.countries.whitelist.includes(country)) {
    logger.warn(`[GeoProtection] Blocked country "${country}" (whitelist) from ${clientIp}`);
    return deny(res, 'Access denied: your region is not permitted.');
  }

  if (geoConfig.mode === 'blacklist' && geoConfig.countries.blacklist.includes(country)) {
    logger.warn(`[GeoProtection] Blocked country "${country}" (blacklist) from ${clientIp}`);
    return deny(res, 'Access denied: your region is not permitted.');
  }

  return next();
};
