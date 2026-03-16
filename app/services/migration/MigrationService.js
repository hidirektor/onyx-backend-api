'use strict';

const logger = require('@shared/utils/logger');

/**
 * MigrationService - Schema synchronization with conflict detection.
 *
 * Compares live database schema against Sequelize model definitions and
 * classifies all differences before applying any changes:
 *
 *   SAFE   - New tables or new nullable columns (no data loss risk)
 *   WARN   - Column type changes (potential data truncation)
 *   DANGER - Column drops or renames detected in DB but not in model
 *
 * By default, DANGER-level conflicts abort the migration.
 * Pass { force: true } to override (use only in development).
 *
 * Usage:
 *   const migrator = new MigrationService({ alter: true });
 *   const result = await migrator.run();
 */
class MigrationService {
  /**
   * @param {object} options
   * @param {boolean} [options.force=false] - Drop and recreate all tables (DEV ONLY)
   * @param {boolean} [options.alter=true] - Alter tables to match models
   * @param {boolean} [options.dryRun=false] - Report conflicts without applying changes
   */
  constructor(options = {}) {
    this.force = options.force || false;
    this.alter = options.alter !== false;
    this.dryRun = options.dryRun || false;
  }

  /**
   * Run migration analysis and optionally apply changes.
   * @returns {Promise<{ applied: boolean, conflicts: object }>}
   */
  async run() {
    // Lazy-load to ensure all models are registered before migration
    const { sequelize } = require('@database/models');
    this._sequelize = sequelize;

    logger.info('[MigrationService] Starting schema analysis...');

    const conflicts = await this.detectConflicts();
    this._reportConflicts(conflicts);

    if (conflicts.danger.length > 0 && !this.force) {
      logger.error(
        '[MigrationService] Migration aborted: DANGER-level conflicts detected. ' +
        'Review the conflicts above and use { force: true } to override (DATA LOSS RISK).'
      );
      return { applied: false, conflicts };
    }

    if (this.dryRun) {
      logger.info('[MigrationService] Dry run complete. No changes applied.');
      return { applied: false, conflicts };
    }

    logger.info('[MigrationService] Applying schema changes...');

    if (this.force) {
      logger.warn('[MigrationService] FORCE mode: dropping and recreating all tables');
    }

    await this._sequelize.sync({ alter: this.alter, force: this.force });
    logger.info('[MigrationService] Schema synchronization complete.');

    return { applied: true, conflicts };
  }

  /**
   * Inspect live DB schema vs model definitions and classify all differences.
   * @returns {Promise<{ safe: object[], warn: object[], danger: object[] }>}
   */
  async detectConflicts() {
    const qi = this._sequelize.getQueryInterface();
    const models = Object.values(this._sequelize.models);
    const conflicts = { safe: [], warn: [], danger: [] };

    for (const model of models) {
      const tableName = typeof model.getTableName === 'function'
        ? model.getTableName()
        : model.tableName;

      let liveColumns;
      try {
        liveColumns = await qi.describeTable(tableName);
      } catch {
        // Table doesn't exist yet - will be created
        conflicts.safe.push({
          table: tableName,
          description: `Table "${tableName}" does not exist and will be created`,
        });
        continue;
      }

      const modelAttrs = model.rawAttributes || {};

      // Check for DB columns not present in model (possible unintended drops)
      const systemColumns = new Set(['createdAt', 'updatedAt', 'deletedAt']);
      for (const col of Object.keys(liveColumns)) {
        if (!modelAttrs[col] && !systemColumns.has(col)) {
          conflicts.danger.push({
            table: tableName,
            column: col,
            description: `Column "${col}" exists in DB but NOT in model — will be DROPPED by alter sync`,
          });
        }
      }

      // Check for new model columns not in DB (safe adds) and type mismatches (warn)
      for (const [attrName, attrDef] of Object.entries(modelAttrs)) {
        if (systemColumns.has(attrName)) continue;

        if (!liveColumns[attrName]) {
          const level = attrDef.allowNull === false && attrDef.defaultValue === undefined
            ? 'warn'
            : 'safe';
          conflicts[level].push({
            table: tableName,
            column: attrName,
            description: level === 'warn'
              ? `Column "${attrName}" will be added as NOT NULL with no default — existing rows will fail`
              : `Column "${attrName}" will be added to "${tableName}"`,
          });
        } else {
          // Type mismatch detection
          // Use type.key to avoid calling toSql() on unbound ENUM types (dialect not yet attached)
          const liveType = liveColumns[attrName].type?.toUpperCase?.() || '';
          const modelType = (attrDef.type?.key || attrDef.type?.toString?.() || '').toUpperCase();
          const liveBase = liveType.split('(')[0];
          const modelBase = modelType.split('(')[0];

          if (liveBase && modelBase && liveBase !== modelBase) {
            conflicts.warn.push({
              table: tableName,
              column: attrName,
              description: `Column "${attrName}" type mismatch: DB="${liveType}" vs Model="${modelType}"`,
            });
          }
        }
      }
    }

    return conflicts;
  }

  _reportConflicts({ safe, warn, danger }) {
    if (safe.length) {
      logger.info(`[MigrationService] SAFE changes (${safe.length}):`);
      safe.forEach((c) => logger.info(`  ✓ [${c.table}] ${c.description}`));
    }
    if (warn.length) {
      logger.warn(`[MigrationService] WARNING changes (${warn.length}):`);
      warn.forEach((c) => logger.warn(`  ⚠ [${c.table}] ${c.description}`));
    }
    if (danger.length) {
      logger.error(`[MigrationService] DANGER changes (${danger.length}):`);
      danger.forEach((c) => logger.error(`  ✗ [${c.table}] ${c.description}`));
    }
    if (!safe.length && !warn.length && !danger.length) {
      logger.info('[MigrationService] Schema is already in sync. No changes needed.');
    }
  }
}

module.exports = MigrationService;
