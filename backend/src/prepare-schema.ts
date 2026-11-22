import { config as loadEnv } from 'dotenv';
import mysql from 'mysql2/promise';

loadEnv();

export async function prepareSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'lexia',
  });
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME AS name
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'colaboradores'
         AND COLUMN_NAME IN ('salario_mensual', 'salario_semanal')`,
    );
    const names = new Set(rows.map((row) => String(row.name)));
    if (names.has('salario_mensual') && !names.has('salario_semanal')) {
      await connection.query(
        'ALTER TABLE colaboradores CHANGE salario_mensual salario_semanal DECIMAL(12,2) NOT NULL',
      );
    }
  } finally {
    await connection.end();
  }
}
