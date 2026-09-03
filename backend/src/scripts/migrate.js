const fs = require('fs');
const path = require('path');
const { pool, query } = require('../config/database');

const runMigrations = async () => {
  console.log('🔄 Running database migrations...');
  try {
    const migrationFilePath = path.join(__dirname, '../migrations/001_init_schema.sql');
    const sql = fs.readFileSync(migrationFilePath, 'utf8');

    await pool.query(sql);
    console.log('✅ Database schema migration completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;
