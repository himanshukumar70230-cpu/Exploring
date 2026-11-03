const db = require('../config/db');

const TransactionModel = {
  async create(data) {
    const {
      user_id = null,
      paypal_order_id = null,
      source_amount,
      source_currency,
      target_amount,
      target_currency,
      exchange_rate,
      compliance_status = 'PENDING',
      risk_score = 0,
      agent_logs = {},
      status = 'INITIATED',
    } = data;

    const result = await db.query(
      `INSERT INTO transactions (
        user_id, paypal_order_id, source_amount, source_currency,
        target_amount, target_currency, exchange_rate,
        compliance_status, risk_score, agent_logs, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        user_id,
        paypal_order_id,
        source_amount,
        source_currency,
        target_amount,
        target_currency,
        exchange_rate,
        compliance_status,
        risk_score,
        JSON.stringify(agent_logs),
        status,
      ]
    );
    return result.rows[0];
  },

  async updateByOrderId(paypalOrderId, updates) {
    const { status, agent_logs } = updates;
    const result = await db.query(
      `UPDATE transactions
       SET status = COALESCE($1, status),
           agent_logs = COALESCE($2, agent_logs),
           updated_at = CURRENT_TIMESTAMP
       WHERE paypal_order_id = $3
       RETURNING *`,
      [status, agent_logs ? JSON.stringify(agent_logs) : null, paypalOrderId]
    );
    return result.rows[0];
  },

  async findAll(limit = 50) {
    const result = await db.query(
      `SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
    return result.rows[0];
  },
};

module.exports = TransactionModel;