'use strict';

/**
 * Auth module i18n strings.
 *
 * Usage:
 *   const i18n = require('../i18n');
 *   const t = i18n[req.locale] || i18n.en;
 */
module.exports = {
  en: {
    REGISTER_SUCCESS: 'Registration successful',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logged out successfully',
    PROFILE_FETCHED: 'Profile retrieved successfully',
    PROFILE_UPDATED: 'Profile updated successfully',

    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'An account with this email already exists',
    USER_NOT_FOUND: 'User not found',
    ACCOUNT_DISABLED: 'Your account has been disabled. Contact support.',

    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'You do not have permission to perform this action',
    TOKEN_EXPIRED: 'Session expired. Please login again.',
    TOKEN_INVALID: 'Invalid authentication token',

    VALIDATION_FAILED: 'Validation failed',
    INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
  },
  tr: {
    REGISTER_SUCCESS: 'Kayıt başarılı',
    LOGIN_SUCCESS: 'Giriş başarılı',
    LOGOUT_SUCCESS: 'Çıkış yapıldı',
    PROFILE_FETCHED: 'Profil başarıyla alındı',
    PROFILE_UPDATED: 'Profil başarıyla güncellendi',

    INVALID_CREDENTIALS: 'Geçersiz e-posta veya şifre',
    EMAIL_EXISTS: 'Bu e-posta ile kayıtlı bir hesap zaten var',
    USER_NOT_FOUND: 'Kullanıcı bulunamadı',
    ACCOUNT_DISABLED: 'Hesabınız devre dışı bırakıldı. Destek ile iletişime geçin.',

    UNAUTHORIZED: 'Kimlik doğrulaması gerekli',
    FORBIDDEN: 'Bu işlemi gerçekleştirme izniniz yok',
    TOKEN_EXPIRED: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
    TOKEN_INVALID: 'Geçersiz kimlik doğrulama jetonu',

    VALIDATION_FAILED: 'Doğrulama başarısız',
    INTERNAL_ERROR: 'Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.',
  },
};
