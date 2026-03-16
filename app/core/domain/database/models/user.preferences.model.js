'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const { getEnumValues, getEnumDefault } = require('@core/domain/enums');

module.exports = (sequelize) => {
  class UserPreferences extends BaseModel {
    static get hiddenFields() {
      return ['pinCode'];
    }

    static associate(db) {
      UserPreferences.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'userId', as: 'user' });
    }
  }

  UserPreferences.init(
    {
      userPreferencesId: {
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
      defaultLanguage: {
        type: DataTypes.ENUM(...getEnumValues('user.preferences.languages')),
        allowNull: false,
        defaultValue: getEnumDefault('user.preferences.languages', 'ENGLISH'),
        comment: 'Preferred interface language',
      },
      defaultTheme: {
        type: DataTypes.ENUM(...getEnumValues('user.preferences.themes')),
        allowNull: false,
        defaultValue: getEnumDefault('user.preferences.themes', 'DARK'),
        comment: 'Preferred UI theme',
      },
      timeZone: {
        type: DataTypes.STRING(60),
        allowNull: false,
        defaultValue: 'Europe/Istanbul',
        comment: 'IANA timezone string',
      },
      mailAuthenticator: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Unix timestamp when mail 2FA was enabled',
      },
      thirdPartyAuthenticator: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Unix timestamp when third-party 2FA was enabled',
      },
      firstLoginIntroduction: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether first-login intro has been shown',
      },
      pinCode: {
        type: DataTypes.STRING(6),
        allowNull: true,
        defaultValue: null,
        comment: '6-digit AFK re-auth PIN (numbers only)',
      },
    },
    {
      sequelize,
      modelName: 'UserPreferences',
      tableName: 'user_preferences',
      timestamps: false,
      indexes: [{ unique: true, fields: ['userId'] }],
    }
  );

  return UserPreferences;
};
