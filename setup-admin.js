/**
 * SETUP INICIAL — Crear superadmin + admin de clínica demo
 * Ejecutar UNA SOLA VEZ después de importar schema_v2.sql
 *
 * USO:
 *   node setup-admin.js
 */
const bcrypt = require('bcrypt');
const mysql  = require('mysql2/promise');
const path   = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     +(process.env.DB_PORT)  || 3306,
    user:     process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'veterinaria_pos',
  });

  const superHash = await bcrypt.hash('SuperAdmin2024!', 10);
  const adminHash = await bcrypt.hash('Admin1234!', 10);

  // Superadmin (sin clínica)
  await conn.execute(
    'UPDATE users SET password = ? WHERE email = ? AND role = ?',
    [superHash, 'superadmin@vetpos.com', 'superadmin']
  );

  // Admin de clínica 1
  await conn.execute(
    'UPDATE users SET password = ? WHERE email = ? AND role = ?',
    [adminHash, 'admin@mrmax.com', 'admin']
  );

  console.log('\n✅ Contraseñas configuradas:\n');
  console.log('  SUPERADMIN   →  superadmin@vetpos.com  /  SuperAdmin2024!');
  console.log('  ADMIN MRMAX  →  admin@mrmax.com        /  Admin1234!\n');
  console.log('⚠️  Cambia estas contraseñas después del primer acceso.\n');

  await conn.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
