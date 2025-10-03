import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { TEST_USER } from '../utils/test-auth.util';

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Global test setup
 *
 * Ensures test user exists in database before running integration tests
 */
export async function setup(): Promise<void> {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433'),
    database: process.env.DATABASE_NAME || 'project_db',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  });

  try {
    // Check if test user exists
    const checkResult = await pool.query('SELECT id FROM users WHERE id = $1', [
      TEST_USER.id,
    ]);

    if (checkResult.rows.length === 0) {
      // Create test user
      await pool.query(
        `INSERT INTO users (id, email, name, "googleId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [TEST_USER.id, TEST_USER.email, TEST_USER.name, TEST_USER.googleId],
      );
      console.log('✓ Test user created:', TEST_USER.email);
    } else {
      console.log('✓ Test user already exists:', TEST_USER.email);
    }
  } catch (error) {
    console.error('Failed to setup test user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
