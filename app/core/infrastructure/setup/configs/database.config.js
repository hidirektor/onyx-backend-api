'use strict';

module.exports = {
  host: process.env.MYSQL_DB_HOST,
  port: parseInt(process.env.MYSQL_DB_PORT, 10),
  database: process.env.MYSQL_DB_NAME,
  username: process.env.MYSQL_DB_USERNAME,
  password: process.env.MYSQL_DB_PASSWORD,
  dialect: 'mysql',
  logging: process.env.MYSQL_DB_LOGGING === 'true' ? console.log : false,
  timezone: '+00:00',
  pool: {
    max: parseInt(process.env.MYSQL_DB_POOL_MAX, 10) || 10,
    min: parseInt(process.env.MYSQL_DB_POOL_MIN, 10) || 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    underscored: false,
    freezeTableName: false,
    timestamps: true,
  },
};
