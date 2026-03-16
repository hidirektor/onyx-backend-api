'use strict';

const { DataTypes } = require('sequelize');
const BaseModel = require('@core/domain/models/BaseModel');

module.exports = (sequelize) => {
  class SupportTicket extends BaseModel {
    static associate(db) {
      SupportTicket.belongsTo(db.User,                { foreignKey: 'userId',         targetKey: 'userId', as: 'owner' });
      SupportTicket.hasMany(db.SupportTicketResponse, { foreignKey: 'supportTicketId', as: 'responses' });
    }
  }

  SupportTicket.init(
    {
      supportTicketId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'FK → users.userId (ticket creator)',
      },
      subject: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('open', 'in_progress', 'waiting_reply', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Optional ticket category / department tag',
      },
      closedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when ticket was closed or auto-closed',
      },
    },
    {
      sequelize,
      modelName: 'SupportTicket',
      tableName: 'support_tickets',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { fields: ['status'] },
        { fields: ['priority'] },
        { fields: ['createdAt'] },
      ],
    }
  );

  return SupportTicket;
};
