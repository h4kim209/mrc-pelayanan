import mysql, { Pool } from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: Pool | undefined;
}

let pool: Pool;

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mrc_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

if (process.env.NODE_ENV === 'production') {
  pool = mysql.createPool(poolConfig);
} else {
  // Prevent multiple pool instances during Next.js Hot Module Replacement (HMR)
  if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool(poolConfig);
  }
  pool = global._mysqlPool;
}

export default pool;
