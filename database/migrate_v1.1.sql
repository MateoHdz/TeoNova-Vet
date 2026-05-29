-- ============================================================
-- MIGRACIÓN v1.1 — Ejecutar si ya tienes la BD creada
-- Solo ejecuta esto si YA tienes la base de datos corriendo
-- ============================================================
USE veterinaria_pos;

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

  CONSTRAINT fk_appt_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_appt_pet      FOREIGN KEY (pet_id)      REFERENCES pets(id)      ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_appt_service  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_appt_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appt_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appt_status    ON appointments(status);

SELECT 'Migración v1.1 completada ✅' AS resultado;
