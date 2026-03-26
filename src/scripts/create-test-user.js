
//Test user için eklendi ancak kullanılmadı.
const bcrypt = require('bcrypt');
const db = require('../db/connection');

async function createUsers() {
  try {
    // Test kullanıcıları için şifreleri hashle
    const password = '1234';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcıları ekle/güncelle
    const users = [
      {
        username: 'test',
        password: hashedPassword,
        full_name: 'Test User',
        email: 'test@example.com',
        department: 'Satis',
      },
      {
        username: 'ahmet',
        password: hashedPassword,
        full_name: 'Ahmet Yilmaz',
        email: 'ahmet@example.com',
        department: 'Satis',
      },
    ];

    for (const user of users) {
      const result = await db.query(
        `
                INSERT INTO users (username, password, full_name, email, department)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (username) 
                DO UPDATE SET 
                    password = EXCLUDED.password,
                    full_name = EXCLUDED.full_name,
                    email = EXCLUDED.email,
                    department = EXCLUDED.department
                RETURNING *
            `,
        [
          user.username,
          user.password,
          user.full_name,
          user.email,
          user.department,
        ]
      );

      console.log(`User ${user.username} created/updated:`, result.rows[0]);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
}

createUsers();
