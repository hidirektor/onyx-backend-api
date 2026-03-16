'use strict';

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const dbConfig = require('@infrastructure/setup/configs/database.config');

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    timezone: dbConfig.timezone,
    pool: dbConfig.pool,
    define: dbConfig.define,
  }
);

const db = { sequelize, Sequelize };

// Auto-load all model files in this directory (excluding index.js)
const modelDir = __dirname;
fs.readdirSync(modelDir)
  .filter((file) => file !== 'index.js' && file.endsWith('.js') && !file.startsWith('_'))
  .forEach((file) => {
    const model = require(path.join(modelDir, file))(sequelize);
    db[model.name] = model;
  });

// Run associations after all models are loaded
Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});

module.exports = db;
