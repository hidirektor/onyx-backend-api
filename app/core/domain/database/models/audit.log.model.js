'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const { getEnumValues, getEnumDefault } = require('@core/domain/enums');

module.exports = (sequelize) => {
  class AuditLog extends BaseModel {
    static associate(db) {
      AuditLog.belongsTo(db.User, { foreignKey: 'performedBy', targetKey: 'userID', as: 'actor' });
    }
  }

  AuditLog.init(
    {
      recordID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      newData: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'New data after the operation',
      },
      operationDescription: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Description of the operation',
      },
      operationSection: {
        type: DataTypes.ENUM(...getEnumValues('audit.operationSections')),
        allowNull: false,
        defaultValue: getEnumDefault('audit.operationSections', 'AUTHENTICATION'),
        comment: 'Section affected by the operation',
      },
      operationTime: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: () => Date.now(),
        comment: 'Timestamp of the operation',
      },
      operationType: {
        type: DataTypes.ENUM(...getEnumValues('audit.operationTypes')),
        allowNull: false,
        defaultValue: getEnumDefault('audit.operationTypes', 'CREATE'),
        comment: 'Type of operation performed',
      },
      performedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userID',
      },
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      timestamps: false,
      indexes: [
        { name: 'idx_audit_logs_user_time', fields: ['performedBy', 'operationTime'] },
        { name: 'idx_audit_logs_section',   fields: ['operationSection', 'operationTime'] },
      ],
    }
  );

  return AuditLog;
};
