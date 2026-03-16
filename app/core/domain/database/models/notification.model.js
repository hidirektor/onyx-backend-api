'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const { getEnumValues } = require('@core/domain/enums');

module.exports = (sequelize) => {
  class Notification extends BaseModel {
    static associate(db) {
      Notification.hasMany(db.UserNotification, { foreignKey: 'notificationID', as: 'userNotifications' });
      Notification.belongsTo(db.User, { foreignKey: 'performedBy', targetKey: 'userID', as: 'performer' });
    }
  }

  Notification.init(
    {
      notificationID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      notificationAction: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'Optional action identifier for the notification',
      },
      notificationContent: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Content of the notification',
      },
      notificationDate: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Timestamp of notification creation',
      },
      notificationTitle: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Title of the notification',
      },
      notificationType: {
        type: DataTypes.ENUM(...getEnumValues('system.notifications.types')),
        allowNull: false,
        comment: 'Type of notification',
      },
      performedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userID',
      },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      timestamps: false,
      indexes: [
        { name: 'idx_notifications_date',      fields: ['notificationDate'] },
        { name: 'idx_notifications_type',      fields: ['notificationType', 'notificationDate'] },
        { name: 'idx_notifications_performed_by', fields: ['performedBy'] },
      ],
    }
  );

  return Notification;
};
