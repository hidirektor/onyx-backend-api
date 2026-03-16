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
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASS',

  // Redis
  'REDIS_HOST',
  'REDIS_PORT',

  // MinIO
  'MINIO_ENDPOINT',
  'MINIO_PORT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',

  // RabbitMQ
  'RABBITMQ_URL',

  // Mail
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_FROM',

  // JWT
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => {
    const val = process.env[key];
    return val === undefined || val === null || val.trim() === '';
  });

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
