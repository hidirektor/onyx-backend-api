'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class UserNotification extends BaseModel {
    static associate(db) {
      UserNotification.belongsTo(db.User,         { foreignKey: 'userID',         targetKey: 'userID',         as: 'user' });
      UserNotification.belongsTo(db.Notification, { foreignKey: 'notificationID', targetKey: 'notificationID', as: 'notification' });
    }
  }

  UserNotification.init(
    {
      userNotificationID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userID: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userID',
      },
      notificationID: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → notifications.notificationID',
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indicates if notification was read',
      },
      readTime: {
        type: DataTypes.BIGINT,
        allowNull: true,
        defaultValue: null,
        comment: 'Timestamp when notification was read',
      },
      sentDate: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Timestamp when notification was sent',
      },
    },
    {
      sequelize,
      modelName: 'UserNotification',
      tableName: 'user_notifications',
      timestamps: false,
      indexes: [
        { name: 'idx_user_notifications_user_read', fields: ['userID', 'isRead'] },
        { name: 'idx_user_notifications_user',      fields: ['userID'] },
        { name: 'idx_user_notifications_notification', fields: ['notificationID'] },
      ],
    }
  );

  return UserNotification;
};
