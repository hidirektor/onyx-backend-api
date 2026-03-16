'use strict';

/**
 * Environment variable validator.
 * Must be called ONCE at the very start of bootstrap, before any config is imported.
 *
 * If any required variable is missing, prints a clear error report and exits the process.
 * No fallback values anywhere — the server must not start with an incomplete configuration.
 */

const REQUIRED_VARS = [
  // Application
  'NODE_ENV',
  'PORT',
  'CORS_ORIGIN',

  // Database
  'MYSQL_DB_HOST',
  'MYSQL_DB_PORT',
  'MYSQL_DB_NAME',
  'MYSQL_DB_USERNAME',
  'MYSQL_DB_PASSWORD',

  // Redis
  'REDIS_HOST',
  'REDIS_PORT',

  // RabbitMQ
  'RABBITMQ_HOST',
  'RABBITMQ_PORT',
  'RABBITMQ_USERNAME',
  'RABBITMQ_PASSWORD',

  // MinIO
  'MINIO_ENDPOINT',
  'MINIO_PORT',
  'MINIO_BUCKET_NAME',

  // Mail
  'RESEND_SMTP_HOST',
  'RESEND_SMTP_PORT',
  'RESEND_SMTP_PASS',
  'RESEND_SMTP_FROM',

  // JWT
  'JWT_SECRET_KEY',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => {
    const val = process.env[key];
    return val === undefined || val === null || val.trim() === '';
  });

  // MinIO credentials: accept either new (MINIO_USERNAME/MINIO_PASSWORD) or legacy (MINIO_ACCESS_KEY/MINIO_SECRET_KEY) format
  const hasNewMinIOCreds    = process.env.MINIO_USERNAME?.trim()   && process.env.MINIO_PASSWORD?.trim();
  const hasLegacyMinIOCreds = process.env.MINIO_ACCESS_KEY?.trim() && process.env.MINIO_SECRET_KEY?.trim();
  if (!hasNewMinIOCreds && !hasLegacyMinIOCreds) {
    missing.push('MINIO_USERNAME + MINIO_PASSWORD (or MINIO_ACCESS_KEY + MINIO_SECRET_KEY)');
  }

  if (missing.length === 0) return;

  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('  FATAL: Missing required environment variables');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  missing.forEach((key) => console.error(`  ✗  ${key}`));
  console.error('\n  Copy .env.example to .env and fill in all required values.');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(1);
}

module.exports = validateEnv;
