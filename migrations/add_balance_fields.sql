-- Agregar campos de balance personal y familiar a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS personal_balance NUMERIC DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS family_balance NUMERIC DEFAULT 0 NOT NULL;

-- Crear tabla para transferencias de saldo
CREATE TABLE IF NOT EXISTS balance_transfers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  from_personal BOOLEAN NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UYU',
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);