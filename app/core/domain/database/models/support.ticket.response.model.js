'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class SupportTicketResponse extends BaseModel {
    static associate(db) {
      SupportTicketResponse.belongsTo(db.SupportTicket, { foreignKey: 'supportTicketId', targetKey: 'supportTicketId', as: 'ticket' });
      SupportTicketResponse.belongsTo(db.User,          { foreignKey: 'respondedBy',     targetKey: 'userId',          as: 'responder' });
    }
  }

  SupportTicketResponse.init(
    {
      supportTicketResponseId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      supportTicketId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → support_tickets.supportTicketId',
      },
      respondedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userId',
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isStaffResponse: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True when the responder is an admin/staff member',
      },
      attachments: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of attachment URLs or metadata',
      },
    },
    {
      sequelize,
      modelName: 'SupportTicketResponse',
      tableName: 'support_ticket_responses',
      timestamps: true,
      indexes: [
        { fields: ['supportTicketId'] },
        { fields: ['respondedBy'] },
      ],
    }
  );

  return SupportTicketResponse;
};
