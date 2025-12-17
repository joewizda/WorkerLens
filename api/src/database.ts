import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'CFFE',
  user: process.env.DB_USER || 'joewizda',
  password: process.env.DB_PASSWORD,
});

export default pool;