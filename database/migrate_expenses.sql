-- ============================================================
-- MIGRACIÓN: Módulo de gastos (expenses)
-- Ejecutar en phpMyAdmin si ya tienes la BD creada
-- ============================================================
USE veterinaria_pos;

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

  CONSTRAINT fk_expenses_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)  ON DELETE CASCADE,
  CONSTRAINT fk_expenses_user   FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE SET NULL
);

CREATE INDEX idx_expenses_clinic ON expenses(clinic_id);
CREATE INDEX idx_expenses_date   ON expenses(clinic_id, date);

SELECT 'Tabla expenses creada ✅' AS resultado;
