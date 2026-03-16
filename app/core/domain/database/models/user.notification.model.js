'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class UserNotification extends BaseModel {
    static associate(db) {
      UserNotification.belongsTo(db.User,         { foreignKey: 'userId',         targetKey: 'userId',       as: 'user' });
      UserNotification.belongsTo(db.Notification, { foreignKey: 'notificationId', targetKey: 'notificationId', as: 'notification' });
    }
  }

  UserNotification.init(
    {
      userNotificationId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userId',
      },
      notificationId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → notifications.notificationId',
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the user read the notification',
      },
    },
    {
      sequelize,
      modelName: 'UserNotification',
      tableName: 'user_notifications',
      timestamps: true,
      indexes: [
        { name: 'idx_user_notif_unique',  unique: true, fields: ['userId', 'notificationId'] },
        { name: 'idx_user_notif_unread',  fields: ['userId', 'isRead'] },
      ],
    }
  );

  return UserNotification;
};
