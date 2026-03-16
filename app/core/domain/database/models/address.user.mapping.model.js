'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class AddressUserMapping extends BaseModel {
    static associate(db) {
      AddressUserMapping.belongsTo(db.User,    { foreignKey: 'userID',    targetKey: 'userID',    as: 'user' });
      AddressUserMapping.belongsTo(db.Address, { foreignKey: 'addressID', targetKey: 'addressID', as: 'address' });
    }
  }

  AddressUserMapping.init(
    {
      mappingID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for address user mapping',
      },
      addressID: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → addresses.addressID',
      },
      userID: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userID',
      },
    },
    {
      sequelize,
      modelName: 'AddressUserMapping',
      tableName: 'address_user_mappings',
      timestamps: false,
    }
  );

  return AddressUserMapping;
};
