'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const { getEnumValues, getEnumDefault } = require('@core/domain/enums');

module.exports = (sequelize) => {
  class AuditLog extends BaseModel {
    static associate(db) {
      AuditLog.belongsTo(db.User, { foreignKey: 'performedBy', targetKey: 'userId', as: 'actor' });
    }
  }

  AuditLog.init(
    {
      auditLogId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      operationType: {
        type: DataTypes.ENUM(...getEnumValues('audit.operationTypes')),
        allowNull: false,
        defaultValue: getEnumDefault('audit.operationTypes', 'CREATE'),
        comment: 'Type of operation performed',
      },
      operationSection: {
        type: DataTypes.ENUM(...getEnumValues('audit.operationSections')),
        allowNull: false,
        defaultValue: getEnumDefault('audit.operationSections', 'AUTHENTICATION'),
        comment: 'System section affected by the operation',
      },
      performedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userId (actor)',
      },
      targetResourceId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID of the resource affected (optional)',
      },
      newData: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON snapshot of new state after operation',
      },
      operationDescription: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Human-readable description of the operation',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP address of the request',
      },
      deviceType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Device type from X-Device-Type header',
      },
      operationTime: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: () => Date.now(),
        comment: 'Unix timestamp (ms) of the operation',
      },
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      timestamps: false,
      indexes: [
        { name: 'idx_audit_logs_actor_time',  fields: ['performedBy', 'operationTime'] },
        { name: 'idx_audit_logs_section',     fields: ['operationSection', 'operationTime'] },
        { name: 'idx_audit_logs_type',        fields: ['operationType', 'operationTime'] },
      ],
    }
  );

  return AuditLog;
};
