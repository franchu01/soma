// lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // tu URL de Neon pooled
  ssl: { rejectUnauthorized: false }
});

export default pool;
