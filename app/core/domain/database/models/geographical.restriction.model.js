'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const { getEnumValues } = require('@core/domain/enums');

module.exports = (sequelize) => {
  class GeographicalRestriction extends BaseModel {
    static associate() {}
  }

  GeographicalRestriction.init(
    {
      restrictionID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      countryCode: {
        type: DataTypes.ENUM(...getEnumValues('geo.countryCodes')),
        allowNull: false,
        comment: 'Country code for geographical restriction',
      },
      restrictionType: {
        type: DataTypes.ENUM(...getEnumValues('geo.restrictionTypes')),
        allowNull: false,
        comment: 'Restriction type: white or black',
      },
      restrictionReason: {
        type: DataTypes.STRING(124),
        allowNull: false,
        comment: 'Country restriction reason',
      },
    },
    {
      sequelize,
      modelName: 'GeographicalRestriction',
      tableName: 'geographicalRestrictions',
      timestamps: false,
    }
  );

  return GeographicalRestriction;
};
