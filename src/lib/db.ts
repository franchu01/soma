// lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve(process.cwd(), 'data.sqlite'));

// Creamos tabla de usuarios
db.prepare(`
  CREATE TABLE IF NOT EXISTS usuarios (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    recordatorio INTEGER DEFAULT 1
  );
`).run();

// Tabla de pagos
db.prepare(`
  CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    fecha TEXT NOT NULL,
    FOREIGN KEY (email) REFERENCES usuarios(email)
  );
`).run();

// Tabla de bajas
db.prepare(`
CREATE TABLE IF NOT EXISTS bajas (
  email TEXT NOT NULL,
  fecha TEXT NOT NULL
);
`).run();

export default db;
