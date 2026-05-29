/**
 * SEED DE DATOS DE PRUEBA
 * Genera datos realistas para la clínica ID=1 (Mrmax)
 * 
 * USO:
 *   node seed-data.js
 * 
 * Crea:
 *  - 15 clientes
 *  - 22 mascotas
 *  - 12 productos con stock
 *  - 60 ventas (últimos 30 días)
 *  - 25 citas (esta semana)
 */

const mysql  = require('mysql2/promise');
const path   = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const CLINIC_ID = 1;

// ── Helpers ──────────────────────────────────────────────────
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = arr => arr[rand(0, arr.length - 1)];
const days  = n => new Date(Date.now() - n * 86400000);
const fmt   = d => d.toISOString().slice(0, 19).replace('T', ' ');

// ── Master data ───────────────────────────────────────────────
const CUSTOMERS = [
  { name: 'María González',   phone: '300 123 4567', email: 'maria@mail.com'   },
  { name: 'Carlos Ramírez',   phone: '311 456 7890', email: 'carlos@mail.com'  },
  { name: 'Ana Torres',       phone: '320 789 0123', email: 'ana@mail.com'     },
  { name: 'Jorge Mendoza',    phone: '315 234 5678', email: 'jorge@mail.com'   },
  { name: 'Laura Pérez',      phone: '301 345 6789', email: 'laura@mail.com'   },
  { name: 'Diego Sánchez',    phone: '312 567 8901', email: 'diego@mail.com'   },
  { name: 'Valentina Cruz',   phone: '317 890 1234', email: 'vale@mail.com'    },
  { name: 'Andrés Morales',   phone: '305 012 3456', email: 'andres@mail.com'  },
  { name: 'Catalina López',   phone: '316 234 5670', email: 'cata@mail.com'    },
  { name: 'Sebastián Ruiz',   phone: '318 456 7891', email: 'sebas@mail.com'   },
  { name: 'Gabriela Vargas',  phone: '313 678 9012', email: 'gaby@mail.com'    },
  { name: 'Felipe Herrera',   phone: '304 890 1235', email: 'felipe@mail.com'  },
  { name: 'Isabella Rojas',   phone: '319 012 3457', email: 'isa@mail.com'     },
  { name: 'Mateo Castillo',   phone: '302 234 5679', email: 'mateo@mail.com'   },
  { name: 'Daniela Ortega',   phone: '309 456 7892', email: 'dani@mail.com'    },
];

const PETS_DATA = [
  { name: 'Max',    species: 'dog', breed: 'Golden Retriever',  age: 4 },
  { name: 'Luna',   species: 'cat', breed: 'Persa',             age: 2 },
  { name: 'Rocky',  species: 'dog', breed: 'Bulldog Francés',   age: 3 },
  { name: 'Mía',    species: 'cat', breed: 'Siamés',            age: 5 },
  { name: 'Toby',   species: 'dog', breed: 'Beagle',            age: 1 },
  { name: 'Coco',   species: 'dog', breed: 'Poodle',            age: 6 },
  { name: 'Simba',  species: 'cat', breed: 'Maine Coon',        age: 3 },
  { name: 'Bella',  species: 'dog', breed: 'Labrador',          age: 2 },
  { name: 'Nala',   species: 'cat', breed: 'Ragdoll',           age: 1 },
  { name: 'Bruno',  species: 'dog', breed: 'Boxer',             age: 4 },
  { name: 'Loki',   species: 'dog', breed: 'Husky Siberiano',   age: 2 },
  { name: 'Kitty',  species: 'cat', breed: 'Doméstico',         age: 3 },
  { name: 'Thor',   species: 'dog', breed: 'Pastor Alemán',     age: 5 },
  { name: 'Mochi',  species: 'dog', breed: 'Shih Tzu',          age: 1 },
  { name: 'Oliver', species: 'cat', breed: 'British Shorthair', age: 2 },
  { name: 'Canela', species: 'dog', breed: 'Cocker Spaniel',    age: 3 },
  { name: 'Nico',   species: 'dog', breed: 'Schnauzer',         age: 4 },
  { name: 'Mila',   species: 'cat', breed: 'Angora',            age: 2 },
  { name: 'Bono',   species: 'dog', breed: 'Dálmata',           age: 1 },
  { name: 'Cloe',   species: 'dog', breed: 'Chihuahua',         age: 6 },
  { name: 'Tito',   species: 'dog', breed: 'Pomerania',         age: 2 },
  { name: 'Nina',   species: 'cat', breed: 'Bengalí',           age: 3 },
];

const PRODUCTS_DATA = [
  { name: 'Concentrado Premium 15kg',  category: 'Alimento',    purchasePrice: 60000,  salePrice: 85000,  stock: 24, minStock: 10 },
  { name: 'Collar reflectivo M',       category: 'Accesorios',  purchasePrice: 18000,  salePrice: 30000,  stock: 8,  minStock: 12 },
  { name: 'Juguete mordedor',          category: 'Juguetes',    purchasePrice:  9000,  salePrice: 20000,  stock: 32, minStock: 15 },
  { name: 'Shampoo hipoalérgénico',    category: 'Higiene',     purchasePrice: 22000,  salePrice: 38000,  stock: 3,  minStock:  8 },
  { name: 'Arena sanitaria 10kg',      category: 'Higiene',     purchasePrice: 28000,  salePrice: 45000,  stock: 0,  minStock:  6 },
  { name: 'Snacks dentales x24',       category: 'Snacks',      purchasePrice:  7000,  salePrice: 15000,  stock: 45, minStock: 20 },
  { name: 'Cama ortopédica L',         category: 'Accesorios',  purchasePrice: 95000,  salePrice: 150000, stock: 6,  minStock:  4 },
  { name: 'Antipulgas pipeta x3',      category: 'Salud',       purchasePrice: 25000,  salePrice: 42000,  stock: 18, minStock: 10 },
  { name: 'Pechera deportiva S',       category: 'Accesorios',  purchasePrice: 35000,  salePrice: 58000,  stock: 11, minStock:  8 },
  { name: 'Vitaminas masticables 60u', category: 'Salud',       purchasePrice: 32000,  salePrice: 52000,  stock: 9,  minStock:  5 },
  { name: 'Concentrado Gato 3kg',      category: 'Alimento',    purchasePrice: 28000,  salePrice: 42000,  stock: 15, minStock:  8 },
  { name: 'Bebedero automático',       category: 'Accesorios',  purchasePrice: 45000,  salePrice: 72000,  stock: 5,  minStock:  4 },
];

async function main() {
  console.log('\n🌱 Iniciando carga de datos de prueba...\n');

  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     +(process.env.DB_PORT)  || 3306,
    user:     process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'veterinaria_pos',
  });

  // ── Get admin user id ─────────────────────────────────────
  const [users] = await conn.execute(
    'SELECT id FROM users WHERE clinic_id = ? AND role = ? LIMIT 1',
    [CLINIC_ID, 'admin']
  );
  if (!users.length) {
    console.error('❌ No se encontró usuario admin para clinic_id=1. Ejecuta setup-admin.js primero.');
    process.exit(1);
  }
  const adminId = users[0].id;
  console.log(`  ✓ Admin user ID: ${adminId}`);

  // ── Get service ids ───────────────────────────────────────
  const [services] = await conn.execute(
    'SELECT id, name, base_price, is_price_variable FROM services WHERE clinic_id = ?',
    [CLINIC_ID]
  );
  console.log(`  ✓ Servicios encontrados: ${services.length}`);

  // ── Clean existing seed data (keep users and services) ───
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  await conn.execute(`DELETE FROM appointments    WHERE clinic_id = ${CLINIC_ID}`);
  await conn.execute(`DELETE FROM stock_movements WHERE clinic_id = ${CLINIC_ID}`);
  await conn.execute(`DELETE FROM sale_items      WHERE sale_id IN (SELECT id FROM sales WHERE clinic_id = ${CLINIC_ID})`);
  await conn.execute(`DELETE FROM sales           WHERE clinic_id = ${CLINIC_ID}`);
  await conn.execute(`DELETE FROM products        WHERE clinic_id = ${CLINIC_ID}`);
  await conn.execute(`DELETE FROM pets            WHERE clinic_id = ${CLINIC_ID}`);
  await conn.execute(`DELETE FROM customers       WHERE clinic_id = ${CLINIC_ID}`);
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  console.log('  ✓ Datos anteriores limpiados');

  // ── 1. Customers ─────────────────────────────────────────
  const customerIds = [];
  for (const c of CUSTOMERS) {
    const [res] = await conn.execute(
      'INSERT INTO customers (clinic_id, name, phone, email) VALUES (?, ?, ?, ?)',
      [CLINIC_ID, c.name, c.phone, c.email]
    );
    customerIds.push(res.insertId);
  }
  console.log(`  ✓ ${customerIds.length} clientes creados`);

  // ── 2. Pets ───────────────────────────────────────────────
  const petIds = [];
  for (let i = 0; i < PETS_DATA.length; i++) {
    const p = PETS_DATA[i];
    const customerId = customerIds[i % customerIds.length];
    const birthdate = new Date();
    birthdate.setFullYear(birthdate.getFullYear() - p.age);
    const [res] = await conn.execute(
      'INSERT INTO pets (clinic_id, customer_id, name, species, breed, birthdate) VALUES (?, ?, ?, ?, ?, ?)',
      [CLINIC_ID, customerId, p.name, p.species, p.breed, birthdate.toISOString().split('T')[0]]
    );
    petIds.push({ id: res.insertId, customerId });
  }
  console.log(`  ✓ ${petIds.length} mascotas creadas`);

  // ── 3. Products ───────────────────────────────────────────
  const productIds = [];
  for (const p of PRODUCTS_DATA) {
    const [res] = await conn.execute(
      `INSERT INTO products (clinic_id, name, category, purchase_price, sale_price, stock, min_stock, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'unidad')`,
      [CLINIC_ID, p.name, p.category, p.purchasePrice, p.salePrice, p.stock, p.minStock]
    );
    productIds.push({ id: res.insertId, ...p });
  }
  console.log(`  ✓ ${productIds.length} productos creados`);

  // ── 4. Sales (last 30 days, 2-4 per day) ─────────────────
  const payMethods = ['cash', 'cash', 'cash', 'card', 'transfer'];
  let salesCount = 0;

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const salesPerDay = rand(1, 5);
    for (let s = 0; s < salesPerDay; s++) {
      const pet      = pick(petIds);
      const soldAt   = days(dayOffset);
      soldAt.setHours(rand(8, 19), rand(0, 59), 0);

      // Random items: 1-3 products + maybe 1 service
      const items = [];
      const numProducts = rand(1, 3);
      for (let i = 0; i < numProducts; i++) {
        const prod = pick(productIds);
        items.push({
          type: 'product',
          id:   prod.id,
          name: prod.name,
          qty:  rand(1, 3),
          unitPrice:     prod.salePrice,
          purchasePrice: prod.purchasePrice,
        });
      }
      // 40% chance of adding a service
      if (services.length > 0 && Math.random() < 0.4) {
        const svc = pick(services);
        const price = svc.is_price_variable ? rand(25000, 80000) : svc.base_price;
        items.push({
          type: 'service',
          id:   svc.id,
          name: svc.name,
          qty:  1,
          unitPrice:     price,
          purchasePrice: 0,
        });
      }

      const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
      const discount = Math.random() < 0.1 ? rand(2000, 10000) : 0;
      const total    = subtotal - discount;

      // Insert sale
      const [saleRes] = await conn.execute(
        `INSERT INTO sales (clinic_id, user_id, customer_id, pet_id, payment_method, subtotal, discount, total, status, sold_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [CLINIC_ID, adminId, pet.customerId, pet.id, pick(payMethods), subtotal, discount, total, fmt(soldAt)]
      );
      const saleId = saleRes.insertId;

      // Insert sale items
      for (const item of items) {
        const lineTotal = item.qty * item.unitPrice;
        if (item.type === 'product') {
          await conn.execute(
            `INSERT INTO sale_items (sale_id, item_type, product_id, description, quantity, unit_price, purchase_price, line_total)
             VALUES (?, 'product', ?, ?, ?, ?, ?, ?)`,
            [saleId, item.id, item.name, item.qty, item.unitPrice, item.purchasePrice, lineTotal]
          );
        } else {
          await conn.execute(
            `INSERT INTO sale_items (sale_id, item_type, service_id, description, quantity, unit_price, purchase_price, line_total)
             VALUES (?, 'service', ?, ?, ?, ?, 0, ?)`,
            [saleId, item.id, item.name, item.qty, item.unitPrice, lineTotal]
          );
        }
      }
      salesCount++;
    }
  }
  console.log(`  ✓ ${salesCount} ventas creadas (últimos 30 días)`);

  // ── 5. Appointments (next 7 days + today) ─────────────────
  if (services.length > 0) {
    const statuses = ['pending', 'pending', 'pending', 'in_progress', 'done'];
    let apptCount = 0;

    for (let dayOffset = -1; dayOffset <= 6; dayOffset++) {
      const numAppts = rand(2, 5);
      for (let a = 0; a < numAppts; a++) {
        const pet      = pick(petIds);
        const svc      = pick(services);
        const price    = svc.is_price_variable ? rand(25000, 80000) : Number(svc.base_price);
        const apptDate = days(-dayOffset); // negative = future
        apptDate.setHours(rand(8, 17), pick([0, 15, 30, 45]), 0);

        const status = dayOffset <= 0 ? pick(statuses) : 'pending';

        await conn.execute(
          `INSERT INTO appointments (clinic_id, customer_id, pet_id, service_id, user_id, scheduled_at, price, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [CLINIC_ID, pet.customerId, pet.id, svc.id, adminId, fmt(apptDate), price, status]
        );
        apptCount++;
      }
    }
    console.log(`  ✓ ${apptCount} citas creadas (ayer + próximos 7 días)`);
  }

  // ── Summary ───────────────────────────────────────────────
  const [[{ totalRevenue }]] = await conn.execute(
    'SELECT COALESCE(SUM(total), 0) as totalRevenue FROM sales WHERE clinic_id = ? AND status = "completed"',
    [CLINIC_ID]
  );

  console.log('\n✅ Seed completado!\n');
  console.log('  Resumen:');
  console.log(`    • Clientes:  ${customerIds.length}`);
  console.log(`    • Mascotas:  ${petIds.length}`);
  console.log(`    • Productos: ${productIds.length}`);
  console.log(`    • Ventas:    ${salesCount}`);
  console.log(`    • Ingresos totales: $${Number(totalRevenue).toLocaleString('es-CO')}`);
  console.log('\n  Abre http://localhost:5173 y verás las gráficas con datos reales.\n');

  await conn.end();
}

main().catch(err => {
  console.error('\n❌ Error en seed:', err.message);
  process.exit(1);
});