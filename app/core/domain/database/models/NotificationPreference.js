'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

const DEFAULT_PREFS = { sms: true, inApp: true, email: true, push: true };

function jsonGetter(field) {
  return function () {
    const val = this.getDataValue(field);
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return { ...DEFAULT_PREFS }; }
    }
    return val || { ...DEFAULT_PREFS };
  };
}

function jsonSetter(field) {
  return function (val) {
    this.setDataValue(field, typeof val === 'object' && val !== null ? val : { ...DEFAULT_PREFS });
  };
}

module.exports = (sequelize) => {
  class NotificationPreference extends BaseModel {
    static associate(db) {
      NotificationPreference.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id' });
    }
  }

  NotificationPreference.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
        comment: 'FK → users.id',
      },
      generalNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: '{ sms, inApp, email, push }',
        get: jsonGetter('generalNotifications'),
        set: jsonSetter('generalNotifications'),
      },
      rollCallNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: 'Roll-call notification preferences',
        get: jsonGetter('rollCallNotifications'),
        set: jsonSetter('rollCallNotifications'),
      },
      announcementNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: 'Announcement (duyuru) notification preferences',
        get: jsonGetter('announcementNotifications'),
        set: jsonSetter('announcementNotifications'),
      },
      newsNotifications: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: DEFAULT_PREFS,
        comment: 'News (haberler) notification preferences',
        get: jsonGetter('newsNotifications'),
        set: jsonSetter('newsNotifications'),
      },
    },
    {
      sequelize,
      modelName: 'NotificationPreference',
      tableName: 'notification_preferences',
      timestamps: false,
      indexes: [{ unique: true, fields: ['userId'] }],
    }
  );

  return NotificationPreference;
};
