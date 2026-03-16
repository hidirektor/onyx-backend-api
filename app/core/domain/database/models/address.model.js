'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class Address extends BaseModel {
    static associate(db) {
      Address.hasMany(db.AddressUserMapping, { foreignKey: 'addressId', as: 'userMappings' });
    }
  }

  Address.init(
    {
      addressId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'User-defined label (e.g. Home, Office)',
      },
      addressLine1: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      addressLine2: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'State or province',
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      postalCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Address',
      tableName: 'addresses',
      timestamps: true,
      indexes: [
        { fields: ['city'] },
        { fields: ['country'] },
      ],
    }
  );

  return Address;
};
