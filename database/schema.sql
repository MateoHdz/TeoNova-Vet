-- ============================================================
-- VETERINARIA POS - SCHEMA DE BASE DE DATOS
-- Versión: 1.0.0 (MVP)
-- Motor: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS veterinaria_pos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE veterinaria_pos;

-- ============================================================
-- TABLA: users
-- Usuarios del sistema (admin y empleados)
-- ============================================================
CREATE TABLE users (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100)        NOT NULL,
  email        VARCHAR(150)        NOT NULL UNIQUE,
  password     VARCHAR(255)        NOT NULL,           -- bcrypt hash
  role         ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  is_active    TINYINT(1)          NOT NULL DEFAULT 1,
  created_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: customers
-- Dueños de mascotas / compradores
-- ============================================================
CREATE TABLE customers (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100)        NOT NULL,
  phone        VARCHAR(20)                  ,
  email        VARCHAR(150)                 ,
  notes        TEXT                         ,           -- alergias, preferencias
  is_active    TINYINT(1)          NOT NULL DEFAULT 1,
  created_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: pets
-- Mascotas asociadas a un cliente
-- ============================================================
CREATE TABLE pets (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT UNSIGNED        NOT NULL,
  name         VARCHAR(100)        NOT NULL,
  species      VARCHAR(50)         NOT NULL DEFAULT 'dog',  -- dog, cat, bird, etc.
  breed        VARCHAR(100)                 ,
  birthdate    DATE                         ,
  notes        TEXT                         ,
  is_active    TINYINT(1)          NOT NULL DEFAULT 1,
  created_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_pets_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLA: products
-- Inventario de productos físicos
-- ============================================================
CREATE TABLE products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150)       NOT NULL,
  description     TEXT                         ,
  sku             VARCHAR(80)                   UNIQUE,    -- código interno opcional
  category        VARCHAR(80)                  ,           -- alimento, accesorio, medicamento…
  purchase_price  DECIMAL(10,2)      NOT NULL DEFAULT 0.00,
  sale_price      DECIMAL(10,2)      NOT NULL,
  stock           INT                NOT NULL DEFAULT 0,
  min_stock       INT                NOT NULL DEFAULT 5,   -- umbral de alerta
  unit            VARCHAR(30)        NOT NULL DEFAULT 'unidad',
  is_active       TINYINT(1)         NOT NULL DEFAULT 1,
  created_at      TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: services
-- Catálogo de servicios ofrecidos
-- ============================================================
CREATE TABLE services (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)       NOT NULL,              -- Baño, Corte, Guardería
  type          ENUM('bath','haircut','boarding','other') NOT NULL,
  description   TEXT                         ,
  base_price    DECIMAL(10,2)      NOT NULL DEFAULT 0.00, -- precio base (0 = variable)
  is_price_variable TINYINT(1)     NOT NULL DEFAULT 0,    -- 1 = precio se define al vender
  is_active     TINYINT(1)         NOT NULL DEFAULT 1,
  created_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLA: sales
-- Cabecera de cada transacción (venta)
-- ============================================================
CREATE TABLE sales (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED       NOT NULL,             -- empleado que registró
  customer_id     INT UNSIGNED                ,            -- puede ser venta sin cliente
  pet_id          INT UNSIGNED                ,            -- mascota asociada (opcional)
  payment_method  ENUM('cash','card','transfer','other') NOT NULL DEFAULT 'cash',
  subtotal        DECIMAL(10,2)      NOT NULL DEFAULT 0.00,
  discount        DECIMAL(10,2)      NOT NULL DEFAULT 0.00,
  total           DECIMAL(10,2)      NOT NULL DEFAULT 0.00,
  notes           TEXT                         ,
  status          ENUM('completed','cancelled') NOT NULL DEFAULT 'completed',
  sold_at         TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_sales_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_sales_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sales_pet
    FOREIGN KEY (pet_id) REFERENCES pets(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================
-- TABLA: sale_items
-- Detalle de cada línea dentro de una venta
-- Soporta TANTO productos como servicios en la misma venta
-- ============================================================
CREATE TABLE sale_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id         INT UNSIGNED       NOT NULL,
  item_type       ENUM('product','service') NOT NULL,

  -- FK polimórfica — solo uno de los dos tendrá valor
  product_id      INT UNSIGNED                ,
  service_id      INT UNSIGNED                ,

  -- Snapshot de precios al momento de la venta
  -- (los precios pueden cambiar en el futuro)
  description     VARCHAR(200)       NOT NULL,             -- nombre capturado al vender
  quantity        DECIMAL(10,3)      NOT NULL DEFAULT 1,   -- guardería: días como decimales
  unit_price      DECIMAL(10,2)      NOT NULL,
  purchase_price  DECIMAL(10,2)      NOT NULL DEFAULT 0.00,-- costo al momento de venta
  line_total      DECIMAL(10,2)      NOT NULL,             -- quantity * unit_price

  -- Extra para guardería
  service_date_start DATE                        ,
  service_date_end   DATE                        ,
  service_notes      TEXT                        ,

  CONSTRAINT fk_sale_items_sale
    FOREIGN KEY (sale_id) REFERENCES sales(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sale_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sale_items_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  -- Garantizar coherencia: un item es producto O servicio, no ambos
  CONSTRAINT chk_item_type CHECK (
    (item_type = 'product'  AND product_id IS NOT NULL AND service_id IS NULL) OR
    (item_type = 'service'  AND service_id IS NOT NULL AND product_id IS NULL)
  )
);

-- ============================================================
-- TABLA: stock_movements
-- Auditoría de todos los cambios de inventario
-- ============================================================
CREATE TABLE stock_movements (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id   INT UNSIGNED       NOT NULL,
  user_id      INT UNSIGNED                ,
  sale_id      INT UNSIGNED                ,            -- si el movimiento es por venta
  type         ENUM('in','out','adjustment') NOT NULL, -- entrada, salida, ajuste manual
  quantity     INT                NOT NULL,             -- siempre positivo
  stock_before INT                NOT NULL,
  stock_after  INT                NOT NULL,
  notes        VARCHAR(255)                ,
  created_at   TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_stock_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_stock_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_stock_sale
    FOREIGN KEY (sale_id) REFERENCES sales(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================
-- ÍNDICES — optimización para reportes y búsquedas frecuentes
-- ============================================================
CREATE INDEX idx_sales_sold_at       ON sales(sold_at);
CREATE INDEX idx_sales_customer      ON sales(customer_id);
CREATE INDEX idx_sale_items_product  ON sale_items(product_id);
CREATE INDEX idx_sale_items_service  ON sale_items(service_id);
CREATE INDEX idx_pets_customer       ON pets(customer_id);
CREATE INDEX idx_stock_product       ON stock_movements(product_id);
CREATE INDEX idx_stock_created       ON stock_movements(created_at);
CREATE INDEX idx_products_stock      ON products(stock, min_stock);  -- alerta stock bajo

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Usuario administrador por defecto
-- Contraseña: Admin1234! (bcrypt — cambiar en producción)
INSERT INTO users (name, email, password, role) VALUES
('Administrador', 'admin@veterinaria.com',
 '$2b$10$YourHashHere.ChangeInProduction', 'admin');

-- Servicios base
INSERT INTO services (name, type, base_price, is_price_variable) VALUES
('Baño básico',        'bath',     25000, 0),
('Baño + secado',      'bath',     35000, 0),
('Corte de pelo',      'haircut',  40000, 0),
('Baño y corte',       'haircut',  60000, 0),
('Guardería (por día)','boarding',      0, 1);  -- precio variable

-- ============================================================
-- TABLA: appointments (Agenda de servicios)
-- Agregada en v1.1
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT UNSIGNED        NULL,
  pet_id       INT UNSIGNED        NULL,
  service_id   INT UNSIGNED        NULL,
  user_id      INT UNSIGNED        NULL,
  scheduled_at DATETIME            NOT NULL,
  price        DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
  notes        TEXT                NULL,
  status       ENUM('pending','in_progress','done','cancelled') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_appt_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_appt_pet      FOREIGN KEY (pet_id)      REFERENCES pets(id)      ON DELETE SET NULL,
  CONSTRAINT fk_appt_service  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE SET NULL,
  CONSTRAINT fk_appt_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE SET NULL
);

CREATE INDEX idx_appt_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appt_status    ON appointments(status);
