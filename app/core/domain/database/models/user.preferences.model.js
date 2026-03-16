'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const { getEnumValues, getEnumDefault } = require('@core/domain/enums');
const timezones = require('@core/domain/enums/user/timezones.enum');

module.exports = (sequelize) => {
  class UserPreferences extends BaseModel {
    static get hiddenFields() {
      return ['afkProtectionPinCode'];
    }

    static associate(db) {
      UserPreferences.belongsTo(db.User, { foreignKey: 'userID', targetKey: 'userID', as: 'user' });
    }
  }

  UserPreferences.init(
    {
      userID: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        comment: 'FK → users.userID',
      },
      defaultLanguage: {
        type: DataTypes.ENUM(...getEnumValues('user.preferences.languages')),
        allowNull: false,
        defaultValue: getEnumDefault('user.preferences.languages', 'ENGLISH'),
        comment: 'Preferred language for user interface',
      },
      defaultTheme: {
        type: DataTypes.ENUM(...getEnumValues('user.preferences.themes')),
        allowNull: false,
        defaultValue: getEnumDefault('user.preferences.themes', 'DARK'),
        comment: 'Preferred UI theme',
      },
      firstLoginIntroduction: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indicates if first login introduction is shown',
      },
      mailAuthenticator: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Unix timestamp when mail authenticator was enabled',
      },
      afkProtectionPinCode: {
        type: DataTypes.STRING(6),
        allowNull: true,
        defaultValue: null,
        comment: '6-digit PIN code for AFK popup authentication (numbers only)',
      },
      timeZone: {
        type: DataTypes.ENUM(...Object.values(timezones)),
        allowNull: false,
        comment: 'User time zone (IANA format)',
      },
    },
    {
      sequelize,
      modelName: 'UserPreferences',
      tableName: 'user_preferences',
      timestamps: false,
      indexes: [{ unique: true, fields: ['userID'] }],
    }
  );

  return UserPreferences;
};