'use strict';

module.exports = {
  endPoint:      process.env.MINIO_ENDPOINT || '127.0.0.1',
  port:          parseInt(process.env.MINIO_PORT, 10) || 9000,
  useSSL:        process.env.MINIO_USE_SSL === 'true',
  // Support both credential formats: MINIO_USERNAME/MINIO_PASSWORD (new) and MINIO_ACCESS_KEY/MINIO_SECRET_KEY (legacy)
  accessKey:     process.env.MINIO_USERNAME || process.env.MINIO_ACCESS_KEY,
  secretKey:     process.env.MINIO_PASSWORD || process.env.MINIO_SECRET_KEY,
  region:        process.env.MINIO_REGION || 'us-east-1',
  defaultBucket: process.env.MINIO_BUCKET_NAME,
};
