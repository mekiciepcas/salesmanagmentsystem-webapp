const db = require('./connection');

async function createTables() {
  try {
    console.log('Creating database tables...');

    // Users table
    await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(200) NOT NULL,
                email VARCHAR(200) NOT NULL UNIQUE,
                department VARCHAR(100),
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        `);
    await db.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'
        `);
    console.log('Users table created or already exists');

    await db.query(`
            CREATE TABLE IF NOT EXISTS quote_projects (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                quote_number VARCHAR(100) NOT NULL,
                customer_id INTEGER REFERENCES customers(id),
                currency VARCHAR(10) DEFAULT 'USD',
                lines_json JSONB DEFAULT '[]',
                status VARCHAR(50) DEFAULT 'TASLAK',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        `);
    console.log('quote_projects table ready');

    await db.query(`
            CREATE TABLE IF NOT EXISTS quote_documents (
                id SERIAL PRIMARY KEY,
                quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
                doc_type VARCHAR(50) NOT NULL,
                file_path TEXT NOT NULL,
                meta JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log('quote_documents table ready');

    // Customers table
    await db.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                company_name VARCHAR(200) NOT NULL,
                name VARCHAR(200),
                consultant_email VARCHAR(200),
                consultant_phone VARCHAR(50),
                address TEXT,
                country VARCHAR(100) DEFAULT 'Türkiye',
                city VARCHAR(100),
                category VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Aktif',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        `);
    console.log('Customers table created or already exists');

    // Quotes table
    await db.query(`
            CREATE TABLE IF NOT EXISTS quotes (
                id SERIAL PRIMARY KEY,
                number VARCHAR(100) NOT NULL,
                date DATE,
                customer_id INTEGER REFERENCES customers(id),
                prepared_by INTEGER REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'HAZIRLANDI',
                total_price NUMERIC(15, 2),
                details TEXT,
                items JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        `);
    console.log('Quotes table created or already exists');

    // Quote Revisions table
    await db.query(`
            CREATE TABLE IF NOT EXISTS quote_revisions (
                id SERIAL PRIMARY KEY,
                quote_id INTEGER REFERENCES quotes(id) NOT NULL,
                user_id INTEGER REFERENCES users(id) NOT NULL,
                old_price NUMERIC(15, 2),
                new_price NUMERIC(15, 2),
                reason VARCHAR(200),
                note TEXT,
                date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log('Quote Revisions table created or already exists');

    // Customer Meetings table
    await db.query(`
            CREATE TABLE IF NOT EXISTS customer_meetings (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id) NOT NULL,
                meeting_date TIMESTAMP NOT NULL,
                meeting_type VARCHAR(100),
                meeting_location VARCHAR(200),
                meeting_outcome VARCHAR(50) DEFAULT 'Beklemede',
                meeting_notes TEXT,
                created_by INTEGER REFERENCES users(id) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log('Customer Meetings table created or already exists');

    // Customer Notes table
    await db.query(`
            CREATE TABLE IF NOT EXISTS customer_notes (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id) NOT NULL,
                note_text TEXT NOT NULL,
                user_id INTEGER REFERENCES users(id) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log('Customer Notes table created or already exists');

    // Transactions table
    await db.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                action VARCHAR(100) NOT NULL,
                user_id INTEGER REFERENCES users(id) NOT NULL,
                quote_id INTEGER REFERENCES quotes(id),
                customer_id INTEGER REFERENCES customers(id),
                details JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log('Transactions table created or already exists');

    // Create a default admin user if none exists
    const userExists = await db.query(
      'SELECT COUNT(*) FROM users WHERE username = $1',
      ['admin']
    );

    if (parseInt(userExists.rows[0].count) === 0) {
      // Default password: admin123
      const hashedPassword =
        '$2b$10$3w8r9K8X5wZF.YRlOzV1OOgRiUNVFTJM0Ixq4HEmdKe3Z7tLbI2li'; // bcrypt hash for 'admin123'

      await db.query(
        `
                INSERT INTO users (
                    username, 
                    password, 
                    full_name, 
                    email, 
                    department
                ) VALUES ($1, $2, $3, $4, $5)
            `,
        [
          'admin',
          hashedPassword,
          'Sistem Yöneticisi',
          'admin@example.com',
          'Yonetim',
        ]
      );

      console.log('Default admin user created');
    }

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

// Run migrations
async function runMigrations() {
  try {
    await createTables();
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

module.exports = {
  runMigrations,
};
