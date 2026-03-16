'use strict';

/**
 * Geo-IP Protection Configuration
 *
 * Countries use ISO 3166-1 alpha-2 codes (e.g. 'TR', 'US', 'DE').
 *
 * mode:
 *   'whitelist' → only allow listed countries, block everything else
 *   'blacklist'  → block listed countries, allow everything else
 *   'off'        → disable geo restriction (allow all)
 *
 * blockVpn / blockProxy:
 *   Detected via header heuristics (X-Forwarded-For chains, Via, Proxy-Connection).
 *   No external API required.
 */

module.exports = {
  enabled: process.env.GEO_PROTECTION_ENABLED !== 'false',

  mode: process.env.GEO_PROTECTION_MODE || 'whitelist',

  countries: {
    whitelist: (process.env.GEO_WHITELIST || 'TR').split(',').map((c) => c.trim().toUpperCase()),
    blacklist: (process.env.GEO_BLACKLIST || '').split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
  },

  blockVpn: process.env.GEO_BLOCK_VPN !== 'false',

  blockProxy: process.env.GEO_BLOCK_PROXY !== 'false',

  // IPs/CIDR ranges that are always trusted (e.g. your own servers)
  trustedIps: (process.env.GEO_TRUSTED_IPS || '127.0.0.1,::1').split(',').map((ip) => ip.trim()),
};
