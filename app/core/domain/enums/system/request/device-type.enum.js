'use strict';

/**
 * X-Device-Type header enum.
 * Required on every request.
 * 'web'    → Browser-based client
 * 'mobile' → Native mobile app (iOS/Android)
 * 'agent'  → Automated agent / server-to-server / CLI
 */
module.exports = {
  'request.deviceTypes': ['web', 'mobile', 'agent'],
};
