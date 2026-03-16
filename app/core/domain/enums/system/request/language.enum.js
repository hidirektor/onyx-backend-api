'use strict';

/**
 * X-Accept-Language header enum.
 * 'en'   → English responses
 * 'tr'   → Turkish responses
 * 'auto' → Resolve from user's UserPreferences.defaultLanguage (requires auth)
 */
module.exports = {
  'request.languages': ['en', 'tr', 'auto'],
};
