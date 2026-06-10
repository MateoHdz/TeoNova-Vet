-- Parches para alinear BD con el código actual (instalación Docker nueva)
USE veterinaria_pos;

-- Gastos
CREATE TABLE IF NOT EXISTS expenses (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clinic_id   INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NULL,
  description VARCHAR(200) NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  category    ENUM(
    'alimentacion','transporte','mantenimiento',
    'compras','servicios','nomina','marketing','otros'
  ) NOT NULL DEFAULT 'otros',
  date        DATE NOT NULL,
  notes       TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_expenses_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
);
CREATE INDEX idx_expenses_clinic ON expenses(clinic_id);
CREATE INDEX idx_expenses_date   ON expenses(clinic_id, date);

-- Productos a granel + stock decimal
ALTER TABLE products
  MODIFY COLUMN stock     DECIMAL(10,3) NOT NULL DEFAULT 0,
  MODIFY COLUMN min_stock DECIMAL(10,3) NOT NULL DEFAULT 5;

-- Columnas bulk (ignorar error si ya existen en re-ejecución manual)
SET @bulk_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'veterinaria_pos' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'is_bulk'
);
SET @sql_bulk = IF(@bulk_exists = 0,
  'ALTER TABLE products ADD COLUMN is_bulk TINYINT(1) NOT NULL DEFAULT 0 AFTER unit, ADD COLUMN sale_unit VARCHAR(30) NOT NULL DEFAULT ''unidad'' AFTER is_bulk',
  'SELECT 1');
PREPARE stmt FROM @sql_bulk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cantidades decimales en ventas
ALTER TABLE sale_items
  MODIFY COLUMN quantity DECIMAL(10,3) NOT NULL DEFAULT 1;
