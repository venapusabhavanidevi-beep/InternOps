// Global teardown — runs once after all test files. We re-hash the
// seeded admin password to its known value so the next CI run (or
// developer run) starts from a known state. Leaving the password
// mutated between runs was the original cause of the cascading
// 401 errors.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { activateTestDatabase } = require('../src/config/testDatabase');
activateTestDatabase();

const argon2 = require('argon2');
const pool = require('../src/config/db');

const SEEDED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const SEEDED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
if (!SEEDED_ADMIN_EMAIL || !SEEDED_ADMIN_PASSWORD) {
  throw new Error(
    'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required for integration tests'
  );
}

module.exports = async function globalTeardown() {
  try {
    const hash = await argon2.hash(SEEDED_ADMIN_PASSWORD);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE lower(email) = lower($2)',
      [hash, SEEDED_ADMIN_EMAIL]
    );
    await pool.query('DELETE FROM password_reset_attempts');
  } catch (err) {
    console.error('[jest teardown] failed to reset admin state:', err.message);
  } finally {
    await pool.end().catch(() => {});
  }
};
