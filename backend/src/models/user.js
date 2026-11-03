const db = require('../config/db');

const UserModel = {
  async findOrCreate({ name, email, paypal_email }) {
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
    const result = await db.query(
      `INSERT INTO users (name, email, paypal_email)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name || 'Demo User', email, paypal_email || email]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },
};

module.exports = UserModel;