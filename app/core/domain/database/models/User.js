'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class User extends BaseModel {
    static get hiddenFields() {
      return ['password', 'deletedAt'];
    }

    static associate(db) {
      User.hasOne(db.UserPreferences,       { foreignKey: 'userId', as: 'preferences' });
      User.hasOne(db.NotificationPreference, { foreignKey: 'userId', as: 'notificationPrefs' });
      User.hasMany(db.UserDevice,            { foreignKey: 'userId', as: 'devices' });
      User.hasMany(db.AuditLog,              { foreignKey: 'performedBy', as: 'auditLogs' });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Name cannot be empty' },
          len: { args: [2, 100], msg: 'Name must be between 2 and 100 characters' },
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
          notEmpty: { msg: 'Email cannot be empty' },
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('admin', 'teacher', 'student'),
        defaultValue: 'student',
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      profilePhotoUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      paranoid: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['role'] },
        { fields: ['isActive'] },
      ],
    }
  );

  return User;
};
