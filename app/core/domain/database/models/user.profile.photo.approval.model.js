'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const { getEnumValues } = require('@core/domain/enums');

module.exports = (sequelize) => {
  class UserProfilePhotoApproval extends BaseModel {
    static associate(db) {
      UserProfilePhotoApproval.belongsTo(db.User, { foreignKey: 'userID',     targetKey: 'userID', as: 'user' });
      UserProfilePhotoApproval.belongsTo(db.User, { foreignKey: 'reviewedBy', targetKey: 'userID', as: 'reviewer' });
    }
  }

  UserProfilePhotoApproval.init(
    {
      approvalID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userID: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'User ID of the student who uploaded the photo',
      },
      fileMimeType: {
        type: DataTypes.STRING(128),
        allowNull: true,
        comment: 'Uploaded photo MIME type',
      },
      filePath: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Uploaded photo file path or signed URL',
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Uploaded photo size in bytes',
      },
      requestedAt: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Unix timestamp (seconds) when approval was requested',
      },
      reviewNote: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional review note',
      },
      reviewedAt: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Unix timestamp (seconds) when approval was reviewed',
      },
      reviewedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User ID of reviewer (e.g., student affairs/sysop)',
      },
      status: {
        type: DataTypes.ENUM(...getEnumValues('user.profilePhotoApprovalStatuses')),
        allowNull: false,
        comment: 'Approval status for the uploaded profile photo',
      },
    },
    {
      sequelize,
      modelName: 'UserProfilePhotoApproval',
      tableName: 'user_profile_photo_approvals',
      timestamps: false,
      indexes: [
        { name: 'idx_profile_photo_approvals_user',     fields: ['userID'] },
        { name: 'idx_profile_photo_approvals_status',   fields: ['status'] },
        { name: 'idx_profile_photo_approvals_reviewer', fields: ['reviewedBy'] },
      ],
    }
  );

  return UserProfilePhotoApproval;
};
