-- ============================================================
-- VETERINARIA POS v2.0 — Schema Multi-tenant
-- Motor: MySQL 8.0+ / MariaDB 10.6+
-- EJECUTAR COMPLETO en instalación nueva
-- ============================================================

CREATE DATABASE IF NOT EXISTS veterinaria_pos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE veterinaria_pos;

-- ── clinics ─────────────────────────────────────────────────
CREATE TABLE clinics (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150)  NOT NULL,
  slug          VARCHAR(80)   NOT NULL UNIQUE,
  email         VARCHAR(150)  NULL,
  phone         VARCHAR(30)   NULL,
  address       TEXT          NULL,
  nit           VARCHAR(30)   NULL,
  logo_url      VARCHAR(255)  NULL,
  currency      VARCHAR(10)   NOT NULL DEFAULT 'COP',
  timezone      VARCHAR(50)   NOT NULL DEFAULT 'America/Bogota',
  plan          ENUM('trial','basic','pro','enterprise') NOT NULL DEFAULT 'trial',
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  trial_ends_at DATE          NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── users ────────────────────────────────────────────────────
-- clinic_id = NULL → superadmin de plataforma
CREATE TABLE users (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clinic_id  INT UNSIGNED NULL,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('superadmin','admin','employee') NOT NULL DEFAULT 'employee',
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_users_clinic ON users(clinic_id);

-- ── customers ────────────────────────────────────────────────
CREATE TABLE customers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clinic_id  INT UNSIGNED NOT NULL,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20)  NULL,
  email      VARCHAR(150) NULL,
  notes      TEXT         NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);
CREATE INDEX idx_customers_clinic ON customers(clinic_id);

-- ── pets ─────────────────────────────────────────────────────
CREATE TABLE pets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clinic_id   INT UNSIGNED NOT NULL,
  customer_id INT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  species     VARCHAR(50)  NOT NULL DEFAULT 'dog',
  breed       VARCHAR(100) NULL,
  birthdate   DATE         NULL,
  notes       TEXT         NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pets_clinic    FOREIGN KEY (clinic_id)   REFERENCES clinics(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pets_customer  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX idx_pets_clinic   ON pets(clinic_id);
CREATE INDEX idx_pets_customer ON pets(customer_id);

-- ── products ─────────────────────────────────────────────────
CREATE TABLE products (
  id             INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
  clinic_id      INT UNSIGNED   NOT NULL,
  name           VARCHAR(150)   NOT NULL,
  description    TEXT           NULL,
  sku            VARCHAR(80)    NULL,
  category       VARCHAR(80)    NULL,
  purchase_price DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  sale_price     DECIMAL(10,2)  NOT NULL,
  stock          INT            NOT NULL DEFAULT 0,
  min_stock      INT            NOT NULL DEFAULT 5,
  unit           VARCHAR(30)    NOT NULL DEFAULT 'unidad',
  is_active      TINYINT(1)     NOT NULL DEFAULT 1,
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  UNIQUE KEY uq_product_sku (clinic_id, sku)
);
CREATE INDEX idx_products_clinic ON products(clinic_id);
CREATE INDEX idx_products_stock  ON products(clinic_id, stock, min_stock);

-- ── services ─────────────────────────────────────────────────
CREATE TABLE services (
  id                INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  clinic_id         INT UNSIGNED  NOT NULL,
  name              VARCHAR(100)  NOT NULL,
  type              ENUM('bath','haircut','boarding','other') NOT NULL,
  description       TEXT          NULL,
  base_price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_price_variable TINYINT(1)    NOT NULL DEFAULT 0,
  is_active         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);
CREATE INDEX idx_services_clinic ON services(clinic_id);

-- ── sales ────────────────────────────────────────────────────
CREATE TABLE sales (
  id             INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  clinic_id      INT UNSIGNED  NOT NULL,
  user_id        INT UNSIGNED  NOT NULL,
  customer_id    INT UNSIGNED  NULL,
  pet_id         INT UNSIGNED  NULL,
  payment_method ENUM('cash','card','transfer','other') NOT NULL DEFAULT 'cash',
  subtotal       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes          TEXT          NULL,
  status         ENUM('completed','cancelled') NOT NULL DEFAULT 'completed',
  sold_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_clinic   FOREIGN KEY (clinic_id)   REFERENCES clinics(id)   ON DELETE CASCADE,
  CONSTRAINT fk_sales_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE RESTRICT,
  CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_pet      FOREIGN KEY (pet_id)      REFERENCES pets(id)      ON DELETE SET NULL
);
CREATE INDEX idx_sales_clinic   ON sales(clinic_id);
CREATE INDEX idx_sales_date     ON sales(clinic_id, sold_at);
CREATE INDEX idx_sales_customer ON sales(clinic_id, customer_id);

-- ── sale_items ───────────────────────────────────────────────
CREATE TABLE sale_items (
  id                 INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  sale_id            INT UNSIGNED  NOT NULL,
  item_type          ENUM('product','service') NOT NULL,
  product_id         INT UNSIGNED  NULL,
  service_id         INT UNSIGNED  NULL,
  description        VARCHAR(200)  NOT NULL,
  quantity           DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price         DECIMAL(10,2) NOT NULL,
  purchase_price     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  line_total         DECIMAL(10,2) NOT NULL,
  service_date_start DATE          NULL,
  service_date_end   DATE          NULL,
  service_notes      TEXT          NULL,
  CONSTRAINT fk_items_sale    FOREIGN KEY (sale_id)    REFERENCES sales(id)    ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_items_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- ── stock_movements ──────────────────────────────────────────
CREATE TABLE stock_movements (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clinic_id    INT UNSIGNED NOT NULL,
  product_id   INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NULL,
  sale_id      INT UNSIGNED NULL,
  type         ENUM('in','out','adjustment') NOT NULL,
  quantity     INT          NOT NULL,
  stock_before INT          NOT NULL,
  stock_after  INT          NOT NULL,
  notes        VARCHAR(255) NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_clinic  FOREIGN KEY (clinic_id)  REFERENCES clinics(id)  ON DELETE CASCADE,
  CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
  CONSTRAINT fk_stock_sale    FOREIGN KEY (sale_id)    REFERENCES sales(id)    ON DELETE SET NULL
);
CREATE INDEX idx_stock_clinic  ON stock_movements(clinic_id);
CREATE INDEX idx_stock_product ON stock_movements(clinic_id, product_id);

-- ── appointments ─────────────────────────────────────────────
CREATE TABLE appointments (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clinic_id    INT UNSIGNED NOT NULL,
  customer_id  INT UNSIGNED NULL,
  pet_id       INT UNSIGNED NULL,
  service_id   INT UNSIGNED NULL,
  user_id      INT UNSIGNED NULL,
  scheduled_at DATETIME     NOT NULL,
  price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes        TEXT         NULL,
  status       ENUM('pending','in_progress','done','cancelled') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appt_clinic   FOREIGN KEY (clinic_id)   REFERENCES clinics(id)   ON DELETE CASCADE,
  CONSTRAINT fk_appt_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_appt_pet      FOREIGN KEY (pet_id)      REFERENCES pets(id)      ON DELETE SET NULL,
  CONSTRAINT fk_appt_service  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE SET NULL,
  CONSTRAINT fk_appt_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE SET NULL
);
CREATE INDEX idx_appt_clinic    ON appointments(clinic_id);
CREATE INDEX idx_appt_scheduled ON appointments(clinic_id, scheduled_at);

-- ============================================================
-- DATOS SEMILLA — ejecutar setup-admin.js para los hashes
-- ============================================================
INSERT INTO clinics (id, name, slug, email, phone, address, nit, plan, is_active)
VALUES (1, 'Mrmax Veterinaria', 'mrmax', 'admin@mrmax.com', '+57 300 123 4567',
        'Cra. 45 #12-34, Bogotá', '900.123.456-7', 'pro', 1);

-- Passwords: run setup-admin.js to insert correct bcrypt hashes
-- Placeholders below — DO NOT USE IN PRODUCTION
INSERT INTO users (id, clinic_id, name, email, password, role)
VALUES
  (1, NULL, 'Super Administrador', 'superadmin@vetpos.com', 'RUN_SETUP_SCRIPT', 'superadmin'),
  (2, 1,    'Administrador Mrmax', 'admin@mrmax.com',       'RUN_SETUP_SCRIPT', 'admin');

-- Default services for clinic 1
INSERT INTO services (clinic_id, name, type, base_price, is_price_variable) VALUES
  (1, 'Baño básico',         'bath',     25000, 0),
  (1, 'Baño + secado',       'bath',     35000, 0),
  (1, 'Corte de pelo',       'haircut',  40000, 0),
  (1, 'Baño y corte',        'haircut',  60000, 0),
  (1, 'Guardería (por día)', 'boarding',     0, 1);
