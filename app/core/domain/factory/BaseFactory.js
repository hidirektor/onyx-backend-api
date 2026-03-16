'use strict';

/**
 * BaseFactory - Base class for model factories used in seeding and testing.
 *
 * Subclasses implement defaultAttributes() to define default field values.
 * create() and createMany() merge defaults with any provided overrides.
 *
 * Example:
 *   class UserFactory extends BaseFactory {
 *     defaultAttributes() {
 *       return { name: 'Test User', email: `user_${Date.now()}@test.com`, password: 'hashed' };
 *     }
 *   }
 *   const factory = new UserFactory(User);
 *   const user = await factory.create({ name: 'Alice' });
 */
class BaseFactory {
  /**
   * @param {typeof import('sequelize').Model} model - Sequelize model class
   */
  constructor(model) {
    if (!model) throw new Error('BaseFactory requires a Sequelize model.');
    this.model = model;
  }

  /**
   * @abstract
   * @returns {object} Default attribute values for this model
   */
  defaultAttributes() {
    throw new Error(`${this.constructor.name} must implement defaultAttributes()`);
  }

  /**
   * Create and persist a single record.
   * @param {object} overrides - Attribute overrides
   * @returns {Promise<import('sequelize').Model>}
   */
  async create(overrides = {}) {
    const attrs = { ...this.defaultAttributes(), ...overrides };
    return this.model.create(attrs);
  }

  /**
   * Create and persist multiple records.
   * @param {number} count
   * @param {object} overrides - Applied to every created record
   * @returns {Promise<import('sequelize').Model[]>}
   */
  async createMany(count = 5, overrides = {}) {
    return Promise.all(Array.from({ length: count }, () => this.create(overrides)));
  }

  /**
   * Build an unsaved instance (not persisted to DB).
   * @param {object} overrides
   * @returns {import('sequelize').Model}
   */
  build(overrides = {}) {
    const attrs = { ...this.defaultAttributes(), ...overrides };
    return this.model.build(attrs);
  }
}

module.exports = BaseFactory;
