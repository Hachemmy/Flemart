import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');

async function runMigrations() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'flemart',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        multipleStatements: true,
    });

    try {
        // Create _migrations table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                name VARCHAR(255) PRIMARY KEY,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Read migration files
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            console.log('[migrate] No migration files found.');
            return;
        }

        // Get already applied migrations
        const [applied] = await pool.query('SELECT name FROM _migrations');
        const appliedNames = new Set((applied as any[]).map((r: any) => r.name));

        for (const file of files) {
            if (appliedNames.has(file)) {
                console.log(`[migrate] Skipping ${file} (already applied)`);
                continue;
            }

            const filePath = path.join(MIGRATIONS_DIR, file);
            let sql = fs.readFileSync(filePath, 'utf-8');

            // Remove MySQL comments and split statements
            sql = sql.replace(/--.*$/gm, '').trim();

            // Split by semicolons, filter empty
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            console.log(`[migrate] Applying ${file} (${statements.length} statement(s))...`);

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                for (const stmt of statements) {
                    // Use query() instead of execute() to support non-preparable
                    // statements like CREATE DATABASE, USE, etc.
                    if (stmt.toUpperCase().startsWith('ALTER TABLE')) {
                        try {
                            await connection.query(stmt);
                        } catch (err: any) {
                            if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
                                console.log(`  → Skipped (column already exists): ${stmt.substring(0, 80)}...`);
                            } else {
                                throw err;
                            }
                        }
                    } else {
                        await connection.query(stmt);
                    }
                }

                await connection.query(
                    'INSERT INTO _migrations (name) VALUES (?)',
                    [file]
                );

                await connection.commit();
                console.log(`[migrate] ✓ ${file} applied`);
            } catch (err) {
                await connection.rollback();
                console.error(`[migrate] ✗ ${file} failed:`, err);
                throw err;
            } finally {
                connection.release();
            }
        }

        console.log('[migrate] All migrations applied successfully.');
    } catch (error) {
        console.error('[migrate] Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
