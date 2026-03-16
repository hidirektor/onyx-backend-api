'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class Address extends BaseModel {
    static associate(db) {
      Address.hasMany(db.AddressUserMapping, { foreignKey: 'addressID', as: 'userMappings' });
    }
  }

  Address.init(
    {
      addressID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      addressDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional address details',
      },
      addressName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Name or title of the address',
      },
      cityName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'City of the address',
      },
      countryName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Country of the address',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitude coordinate of the address',
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitude coordinate of the address',
      },
      multiPolygon: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Geographical polygon coordinates',
      },
      stateName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'State or region of the address',
      },
      streetName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Street name of the address',
      },
      zipCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Postal code of the address',
      },
    },
    {
      sequelize,
      modelName: 'Address',
      tableName: 'addresses',
      timestamps: false,
    }
  );

  return Address;
};
