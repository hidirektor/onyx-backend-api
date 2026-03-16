'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');
const { getEnumValues } = require('@core/domain/enums');

module.exports = (sequelize) => {
  class SupportTicket extends BaseModel {
    static associate(db) {
      SupportTicket.belongsTo(db.User, { foreignKey: 'userID',    targetKey: 'userID', as: 'owner' });
      SupportTicket.belongsTo(db.User, { foreignKey: 'studentID', targetKey: 'userID', as: 'student' });
      SupportTicket.hasMany(db.SupportTicketResponse, { foreignKey: 'ticketID', as: 'responses' });
    }
  }

  SupportTicket.init(
    {
      ticketID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userID: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userID (ticket creator)',
      },
      studentID: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'FK → users.userID (student) - only academician can set',
      },
      ticketAttachment: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Attachments related to the ticket',
      },
      ticketCategory: {
        type: DataTypes.ENUM(...getEnumValues('support.ticketCategories')),
        allowNull: false,
        comment: 'Category of the support ticket',
      },
      ticketMessage: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Detailed message of the support ticket',
      },
      ticketStatus: {
        type: DataTypes.ENUM(...getEnumValues('support.ticketStatuses')),
        allowNull: false,
        comment: 'Current status of the ticket',
      },
      ticketTime: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Timestamp of ticket creation',
      },
      ticketTitle: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Title of the support ticket',
      },
    },
    {
      sequelize,
      modelName: 'SupportTicket',
      tableName: 'support_tickets',
      timestamps: false,
      indexes: [
        { name: 'idx_support_tickets_user_status', fields: ['userID', 'ticketStatus'] },
        { name: 'idx_support_tickets_status',      fields: ['ticketStatus'] },
        { name: 'idx_support_tickets_user',        fields: ['userID'] },
        { name: 'idx_support_tickets_student',     fields: ['studentID'] },
      ],
    }
  );

  return SupportTicket;
};
