'use strict';

const Minio = require('minio');
const minioConfig = require('@infrastructure/setup/configs/minio.config');

let instance = null;
let currentConfig = null;

/**
 * MinioClient - Singleton MinIO S3-compatible object storage client.
 *
 * Includes connection testing with SSL fallback on initialization.
 *
 * Usage:
 *   await MinioClient.initialize();              // call once during bootstrap
 *   await MinioClient.ensureBucket('uploads');
 *   const url = await MinioClient.getPresignedUrl('uploads', 'file.png');
 *   await MinioClient.upload('uploads', 'path/file.png', buffer, buffer.length, 'image/png');
 */
class MinioClient {
  /**
   * Initialize the MinIO client and verify connection.
   * Automatically retries without SSL if initial connection fails with an SSL error.
   * Safe to call multiple times - returns existing client if already initialized.
   * @returns {Promise<import('minio').Client>}
   */
  static async initialize() {
    if (instance) return instance;

    if (!minioConfig.accessKey || !minioConfig.secretKey) {
      throw new Error('[MinIO] Credentials are required (MINIO_USERNAME/MINIO_PASSWORD or MINIO_ACCESS_KEY/MINIO_SECRET_KEY)');
    }

    currentConfig = { ...minioConfig };
    instance = new Minio.Client(currentConfig);

    try {
      await MinioClient._testConnection();
      console.info('[MinIO] Client initialized');
    } catch (err) {
      // SSL fallback: if connection fails due to SSL/TLS, retry without SSL
      if (err.message && (err.message.includes('SSL') || err.message.includes('EPROTO'))) {
        console.warn('[MinIO] SSL connection failed - retrying without SSL');
        currentConfig = { ...currentConfig, useSSL: false };
        instance = new Minio.Client(currentConfig);
        try {
          await MinioClient._testConnection();
          console.info('[MinIO] Client initialized (no SSL)');
        } catch (retryErr) {
          instance = null;
          currentConfig = null;
          throw new Error(`[MinIO] Connection failed even without SSL: ${retryErr.message}`);
        }
      } else {
        instance = null;
        currentConfig = null;
        throw new Error(`[MinIO] Connection failed: ${err.message}`);
      }
    }

    return instance;
  }

  /**
   * Internal connection test via listBuckets.
   */
  static async _testConnection() {
    await instance.listBuckets();
  }

  /**
   * @returns {import('minio').Client}
   */
  static getInstance() {
    if (!instance) {
      // Fallback lazy initialization (no connection test)
      instance = new Minio.Client(minioConfig);
      console.info('[MinIO] Client initialized (lazy)');
    }
    return instance;
  }

  /**
   * Ensure a bucket exists, creating it if necessary.
   * @param {string} bucketName
   * @param {string} [region]
   */
  static async ensureBucket(bucketName, region = minioConfig.region || 'us-east-1') {
    const client = MinioClient.getInstance();
    const exists = await client.bucketExists(bucketName);
    if (!exists) {
      await client.makeBucket(bucketName, region);
      console.info(`[MinIO] Created bucket: ${bucketName}`);
    } else {
      console.info(`[MinIO] Bucket exists: ${bucketName}`);
    }
  }

  /**
   * Upload an object from a Buffer or Stream.
   * @param {string} bucketName
   * @param {string} objectName - Full path within bucket
   * @param {Buffer|import('stream').Readable} data
   * @param {number} size
   * @param {string} contentType
   * @returns {Promise<import('minio').UploadedObjectInfo>}
   */
  static async upload(bucketName, objectName, data, size, contentType = 'application/octet-stream') {
    return MinioClient.getInstance().putObject(bucketName, objectName, data, size, {
      'Content-Type': contentType,
    });
  }

  /**
   * Upload from local file path.
   * @param {string} bucketName
   * @param {string} objectName
   * @param {string} filePath
   * @param {object} [metadata]
   */
  static async uploadFile(bucketName, objectName, filePath, metadata = {}) {
    return MinioClient.getInstance().fPutObject(bucketName, objectName, filePath, metadata);
  }

  /**
   * Generate a presigned download URL.
   * @param {string} bucketName
   * @param {string} objectName
   * @param {number} expirySeconds - Default: 1 hour
   * @returns {Promise<string>}
   */
  static async getPresignedUrl(bucketName, objectName, expirySeconds = 3600) {
    return MinioClient.getInstance().presignedGetObject(bucketName, objectName, expirySeconds);
  }

  /**
   * Generate a presigned upload URL.
   * @param {string} bucketName
   * @param {string} objectName
   * @param {number} expirySeconds
   * @returns {Promise<string>}
   */
  static async getPresignedUploadUrl(bucketName, objectName, expirySeconds = 3600) {
    return MinioClient.getInstance().presignedPutObject(bucketName, objectName, expirySeconds);
  }

  /**
   * Delete an object.
   * @param {string} bucketName
   * @param {string} objectName
   */
  static async remove(bucketName, objectName) {
    return MinioClient.getInstance().removeObject(bucketName, objectName);
  }

  /**
   * Check if an object exists.
   * @param {string} bucketName
   * @param {string} objectName
   * @returns {Promise<boolean>}
   */
  static async exists(bucketName, objectName) {
    try {
      await MinioClient.getInstance().statObject(bucketName, objectName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Health check - lists buckets to verify connectivity.
   * @returns {Promise<{status: string, service: string, buckets?: number, error?: string}>}
   */
  static async healthCheck() {
    try {
      const buckets = await MinioClient.getInstance().listBuckets();
      return { status: 'healthy', service: 'minio', buckets: buckets.length };
    } catch (err) {
      return { status: 'unhealthy', service: 'minio', error: err.message };
    }
  }
}

module.exports = MinioClient;
