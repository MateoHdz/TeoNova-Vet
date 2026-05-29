-- Corrige ventas guardadas ~5 h atrás cuando MySQL/TypeORM usaban sesión UTC
-- pero la hora real era Colombia (America/Bogota, UTC-5).
-- Ejecutar UNA vez después de actualizar DB_TIMEZONE=-05:00 en el backend.
--
-- Hacer backup antes: mysqldump ... > backup.sql

UPDATE sales
SET sold_at = DATE_ADD(sold_at, INTERVAL 5 HOUR)
WHERE status = 'completed';

-- Luego en backend/.env:
-- SOLD_AT_LEGACY_UTC_CLOCK=false
