require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

(async () => {
  const full_name = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];
  const role = process.argv[5] || 'SUPER_ADMIN';

  if (!full_name || !email || !password) {
    console.log('Usage: node scripts/createAdmin.js "Name" email password [ROLE]');
    process.exit(1);
  }

  const exists = await query(`SELECT id FROM admins WHERE email = ? LIMIT 1`, [email]);
  if (exists.length) {
    console.log('Admin already exists with this email.');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);

  await query(
    `INSERT INTO admins (full_name, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [full_name, email, password_hash, role]
  );

  console.log('✅ Admin created:', email, 'role:', role);
  process.exit(0);
})();

/*
npm run admin:create "Super Admin" admin@shaheen.com Admin@123 SUPER_ADMIN
*/