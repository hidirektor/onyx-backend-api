'use strict';

const logger = require('@shared/utils/logger');

const VALID_LANGS = ['en', 'tr', 'auto'];
const LANGUAGE_MAP = { ENGLISH: 'en', TURKISH: 'tr' };

/**
 * X-Accept-Language middleware. Optional, defaults to 'en'.
 * Sets req.locale = 'en' | 'tr'
 * 'auto' resolves from UserPreferences.defaultLanguage (requires auth).
 */
module.exports = async (req, res, next) => {
  const raw = (req.headers['x-accept-language'] || 'en').toLowerCase().trim();

  if (!VALID_LANGS.includes(raw)) {
    return res.status(400).json({
      request: {
        requestCode:   '400',
        resultMessage: `Invalid X-Accept-Language: "${raw}". Allowed: ${VALID_LANGS.join(', ')}`,
        requestResult: false,
      },
      payload: null,
    });
  }

  if (raw !== 'auto') {
    req.locale = raw;
    return next();
  }

  // auto: resolve from authenticated user's preferences
  if (!req.user) {
    req.locale = 'en';
    return next();
  }

  try {
    const { UserPreferences } = require('@database/models');
    const userId = req.user.id || req.user.userId;
    const prefs  = await UserPreferences.findOne({ where: { userId }, attributes: ['defaultLanguage'] });
    req.locale   = prefs?.defaultLanguage ? (LANGUAGE_MAP[prefs.defaultLanguage] || 'en') : 'en';
  } catch (err) {
    logger.warn('[language.middleware] Failed to resolve user language preference, defaulting to en', {
      userId: req.user?.id || req.user?.userId,
      error:  err.message,
    });
    req.locale = 'en';
  }

  return next();
};
