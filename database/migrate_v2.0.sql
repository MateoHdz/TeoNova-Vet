-- ============================================================
-- MIGRACIÓN v1 → v2 (Multi-tenant)
-- Para instalaciones que ya tienen datos
-- Ejecutar en phpMyAdmin o MySQL CLI
-- ============================================================
USE veterinaria_pos;

-- 1. Crear tabla clinics
CREATE TABLE IF NOT EXISTS clinics (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150)        NOT NULL,
  slug         VARCHAR(80)         NOT NULL UNIQUE,
  email        VARCHAR(150)                 ,
  phone        VARCHAR(30)                  ,
  address      TEXT                         ,
  nit          VARCHAR(30)                  ,
  logo_url     VARCHAR(255)                 ,
  currency     VARCHAR(10)         NOT NULL DEFAULT 'COP',
  timezone     VARCHAR(50)         NOT NULL DEFAULT 'America/Bogota',
  plan         ENUM('trial','basic','pro','enterprise') NOT NULL DEFAULT 'pro',
  is_active    TINYINT(1)          NOT NULL DEFAULT 1,
  trial_ends_at DATE                        ,
  created_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Insertar la clínica existente (tus datos actuales)
INSERT INTO clinics (id, name, slug, plan) VALUES (1, 'Mi Veterinaria', 'principal', 'pro')
  ON DUPLICATE KEY UPDATE name = name;

-- 3. Agregar clinic_id a users
ALTER TABLE users
  ADD COLUMN clinic_id INT UNSIGNED NULL AFTER id,
  MODIFY COLUMN role ENUM('superadmin','admin','employee') NOT NULL DEFAULT 'employee',
  ADD CONSTRAINT fk_users_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

UPDATE users SET clinic_id = 1 WHERE role IN ('admin','employee');
CREATE INDEX idx_users_clinic ON users(clinic_id);

-- 4. customers
ALTER TABLE customers ADD COLUMN clinic_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
UPDATE customers SET clinic_id = 1;
ALTER TABLE customers ADD CONSTRAINT fk_customers_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX idx_customers_clinic ON customers(clinic_id);

-- 5. pets
ALTER TABLE pets ADD COLUMN clinic_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
UPDATE pets SET clinic_id = 1;
ALTER TABLE pets ADD CONSTRAINT fk_pets_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX idx_pets_clinic ON pets(clinic_id);

-- 6. products
ALTER TABLE products ADD COLUMN clinic_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
UPDATE products SET clinic_id = 1;
ALTER TABLE products ADD CONSTRAINT fk_products_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
-- Fix: sku unique per clinic not globally
ALTER TABLE products DROP INDEX sku;
ALTER TABLE products ADD UNIQUE KEY uq_product_sku (clinic_id, sku);
CREATE INDEX idx_products_clinic ON products(clinic_id);

-- 7. services
ALTER TABLE services ADD COLUMN clinic_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
UPDATE services SET clinic_id = 1;
ALTER TABLE services ADD CONSTRAINT fk_services_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX idx_services_clinic ON services(clinic_id);

-- 8. sales
ALTER TABLE sales ADD COLUMN clinic_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
UPDATE sales SET clinic_id = 1;
ALTER TABLE sales ADD CONSTRAINT fk_sales_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX idx_sales_clinic   ON sales(clinic_id);
CREATE INDEX idx_sales_sold_at2 ON sales(clinic_id, sold_at);

-- 9. stock_movements
ALTER TABLE stock_movements ADD COLUMN clinic_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
UPDATE stock_movements SET clinic_id = 1;
ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX idx_stock_clinic ON stock_movements(clinic_id);

-- 10. appointments
ALTER TABLE appointments ADD COLUMN clinic_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
UPDATE appointments SET clinic_id = 1;
ALTER TABLE appointments ADD CONSTRAINT fk_appt_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
CREATE INDEX idx_appt_clinic ON appointments(clinic_id);

-- 11. Crear superadmin (ejecutar setup-admin.js después para el hash correcto)
INSERT IGNORE INTO users (clinic_id, name, email, password, role) VALUES
(NULL, 'Super Admin', 'superadmin@vetpos.com', '$2b$10$placeholder', 'superadmin');

SELECT 'Migración v2.0 completada ✅ — Recuerda ejecutar: node setup-admin.js' AS resultado;
