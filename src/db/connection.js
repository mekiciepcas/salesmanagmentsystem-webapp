const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pricing',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  max: 20, // maksimum bağlantı sayısı
  idleTimeoutMillis: 30000, // boşta kalma süresi
  connectionTimeoutMillis: 2000, // bağlantı timeout
});

// Bağlantı hatalarını yakala
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Test bağlantısı ve tabloları oluştur
pool.connect((err, client, done) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');

    // Quotes tablosunu oluştur
    client.query(
      `
            CREATE TABLE IF NOT EXISTS quotes (
                id SERIAL PRIMARY KEY,
                number VARCHAR(50) UNIQUE NOT NULL,
                date TIMESTAMP NOT NULL,
                details TEXT,
                prepared_by VARCHAR(100),
                total_price DECIMAL(15,2),
                status VARCHAR(20) DEFAULT 'HAZIRLANDI',
                items JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
      (err, result) => {
        if (err) {
          console.error('Error creating quotes table:', err);
          done(); // Return client to pool in case of error
        } else {
          console.log('Quotes table created or already exists');

          // Create actual_costs table
          client.query(
            `
                    CREATE TABLE IF NOT EXISTS actual_costs (
                        id SERIAL PRIMARY KEY,
                        quote_id INTEGER REFERENCES quotes(id),
                        quote_amount NUMERIC,
                        actual_cost NUMERIC NOT NULL,
                        notes TEXT,
                        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                `,
            (err, result) => {
              if (err) {
                console.error('Error creating actual_costs table:', err);
              } else {
                console.log('Actual_costs table created or already exists');

                // Create index on quote_id for faster lookups
                client.query(
                  `
                            CREATE INDEX IF NOT EXISTS actual_costs_quote_id_idx ON actual_costs(quote_id)
                        `,
                  (err, result) => {
                    if (err) {
                      console.error(
                        'Error creating index on actual_costs:',
                        err
                      );
                    } else {
                      console.log(
                        'Index on actual_costs created or already exists'
                      );
                    }
                    done(); // Return client to pool after all operations
                  }
                );
              }
            }
          );
        }
      }
    );
  }
});

module.exports = pool;
