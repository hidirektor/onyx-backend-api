'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class UserProfile extends BaseModel {
    static associate(db) {
      UserProfile.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'userId', as: 'user' });
    }
  }

  UserProfile.init(
    {
      userProfileId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: 'FK → users.userId',
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      dialCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'E.164 dial code prefix (e.g. +90)',
      },
      birthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
        allowNull: true,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      avatarUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Current approved profile photo URL',
      },
      pendingAvatarUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Uploaded photo awaiting admin approval',
      },
      avatarApprovalStatus: {
        type: DataTypes.ENUM('none', 'pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'none',
        comment: 'Approval state for profile photo (used when profilePhotoApprovalEnabled)',
      },
    },
    {
      sequelize,
      modelName: 'UserProfile',
      tableName: 'user_profiles',
      timestamps: true,
      indexes: [{ unique: true, fields: ['userId'] }],
    }
  );

  return UserProfile;
};
