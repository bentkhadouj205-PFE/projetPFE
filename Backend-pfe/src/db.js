import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// APP database (users, requests, chat, notifications...)
export const appPool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.APP_DB_NAME || 'baladiya_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port:     parseInt(process.env.DB_PORT) || 5432,
});

// REGISTRY database (citizens, CNI, NIN...)
export const registryPool = new Pool({
  user:     process.env.DB_USER          || 'postgres',
  host:     process.env.DB_HOST          || 'localhost',
  database: process.env.REGISTRY_DB_NAME || 'baladiya_registry',
  password: process.env.DB_PASSWORD      || 'postgres',
  port:     parseInt(process.env.DB_PORT) || 5432,
});

appPool.on('error',      err => console.error('APP DB error:',      err.message));
registryPool.on('error', err => console.error('REGISTRY DB error:', err.message));

export default appPool;