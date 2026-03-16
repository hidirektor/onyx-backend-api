'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class AddressUserMapping extends BaseModel {
    static associate(db) {
      AddressUserMapping.belongsTo(db.User,    { foreignKey: 'userId',    targetKey: 'userId',    as: 'user' });
      AddressUserMapping.belongsTo(db.Address, { foreignKey: 'addressId', targetKey: 'addressId', as: 'address' });
    }
  }

  AddressUserMapping.init(
    {
      addressUserMappingId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userId',
      },
      addressId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → addresses.addressId',
      },
      addressType: {
        type: DataTypes.ENUM('home', 'work', 'billing', 'shipping', 'other'),
        allowNull: false,
        defaultValue: 'home',
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the user\'s default address',
      },
    },
    {
      sequelize,
      modelName: 'AddressUserMapping',
      tableName: 'address_user_mappings',
      timestamps: true,
      indexes: [
        { name: 'idx_addr_user_unique',   unique: true, fields: ['userId', 'addressId'] },
        { name: 'idx_addr_user_default',  fields: ['userId', 'isDefault'] },
      ],
    }
  );

  return AddressUserMapping;
};
