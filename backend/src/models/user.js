const db = require('../config/db');

const VALID_ROLES = ['OWNER', 'WORKER', 'ADMIN'];

const UserModel = {
  async findOrCreate({ name, email, paypal_email, role = 'OWNER' }) {
    const normalizedRole = role.toUpperCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      throw new Error(`Invalid role "${role}". Allowed roles: OWNER, WORKER`);
    }

    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const result = await db.query(
      `INSERT INTO users (name, email, paypal_email, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name || 'Demo User', email, paypal_email || email, normalizedRole]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findByRole(role) {
    const result = await db.query(
      'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC',
      [role.toUpperCase()]
    );
    return result.rows;
  },

  // Helper methods to check a user object's role
  isOwner(user) {
    return Boolean(user && user.role === 'OWNER');
  },

  isWorker(user) {
    return Boolean(user && user.role === 'WORKER');
  },
};

module.exports = UserModel;