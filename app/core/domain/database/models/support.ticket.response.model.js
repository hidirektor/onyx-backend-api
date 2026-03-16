'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class SupportTicketResponse extends BaseModel {
    static associate(db) {
      SupportTicketResponse.belongsTo(db.SupportTicket, { foreignKey: 'ticketID', targetKey: 'ticketID', as: 'ticket' });
      SupportTicketResponse.belongsTo(db.User,          { foreignKey: 'userID',   targetKey: 'userID',   as: 'responder' });
    }
  }

  SupportTicketResponse.init(
    {
      responseID: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      ticketID: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → support_tickets.ticketID',
      },
      userID: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userID',
      },
      responseAttachment: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Attachments related to the response',
      },
      responseMessage: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Response message content',
      },
      responseTime: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Timestamp of the response',
      },
    },
    {
      sequelize,
      modelName: 'SupportTicketResponse',
      tableName: 'support_ticket_responses',
      timestamps: false,
    }
  );

  return SupportTicketResponse;
};
