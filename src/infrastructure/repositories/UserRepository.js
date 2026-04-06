const db = require('../../db/connection');

class UserRepository {
  async findByUsername(username) {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [
      username,
    ]);
    return result.rows[0] || null;
  }

  async findByUsernameOrEmail(username, email) {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    return result.rows;
  }

  async create({ username, email, passwordHash, fullName, department }) {
    const result = await db.query(
      `INSERT INTO users (username, email, password, full_name, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, full_name, department`,
      [username, email, passwordHash, fullName, department]
    );
    return result.rows[0];
  }
}

module.exports = new UserRepository();
