import mysql from "mysql2/promise";

// Persist the pool on the global object so Next.js hot reloads don't create
// a new pool (and new connections) on every module re-evaluation.
declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

const pool =
  global._mysqlPool ??
  (global._mysqlPool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
  }));

export async function query({
  query,
  values = [],
}: {
  query: string;
  values?: any[];
}) {
  try {
    const [results] = await pool.execute(query, values);
    return results;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
