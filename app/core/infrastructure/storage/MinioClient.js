'use strict';

const Minio = require('minio');
const minioConfig = require('@infrastructure/setup/configs/minio.config');

let instance = null;

/**
 * MinioClient - Singleton MinIO S3-compatible object storage client.
 *
 * Usage:
 *   await MinioClient.ensureBucket('uploads');
 *   const url = await MinioClient.getPresignedUrl('uploads', 'file.png');
 *   await MinioClient.upload('uploads', 'path/file.png', buffer, buffer.length, 'image/png');
 */
class MinioClient {
  /**
   * @returns {import('minio').Client}
   */
  static getInstance() {
    if (!instance) {
      instance = new Minio.Client(minioConfig);
      console.info('[MinIO] Client initialized');
    }
    return instance;
  }

  /**
   * Ensure a bucket exists, creating it if necessary.
   * @param {string} bucketName
   * @param {string} region
   */
  static async ensureBucket(bucketName, region = 'us-east-1') {
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
}

module.exports = MinioClient;
