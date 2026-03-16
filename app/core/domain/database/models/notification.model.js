'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class Notification extends BaseModel {
    static associate(db) {
      Notification.hasMany(db.UserNotification, { foreignKey: 'notificationId', as: 'userNotifications' });
    }
  }

  Notification.init(
    {
      notificationId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('general', 'system', 'announcement', 'support'),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Notification category / channel',
      },
      targetRole: {
        type: DataTypes.ENUM('all', 'admin', 'user'),
        allowNull: false,
        defaultValue: 'all',
        comment: 'Role audience for this notification',
      },
      data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Arbitrary payload for deep-link or action handling',
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the notification was dispatched',
      },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      timestamps: true,
      indexes: [
        { fields: ['type'] },
        { fields: ['targetRole'] },
        { fields: ['createdAt'] },
      ],
    }
  );

  return Notification;
};
