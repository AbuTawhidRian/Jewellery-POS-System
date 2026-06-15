import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating companies and users tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if the default company exists, if not create it
    const companyRes = await client.query(`SELECT id FROM companies WHERE name = 'Rian Jewellery' LIMIT 1`);
    let defaultCompanyId;
    if (companyRes.rows.length === 0) {
      const insertRes = await client.query(`
        INSERT INTO companies (name) VALUES ('Rian Jewellery') RETURNING id
      `);
      defaultCompanyId = insertRes.rows[0].id;
    } else {
      defaultCompanyId = companyRes.rows[0].id;
    }

    console.log(`Default Company ID: ${defaultCompanyId}`);

    const tablesToUpdate = ['items', 'buyers', 'sales', 'item_types', 'descriptions'];

    for (const table of tablesToUpdate) {
      console.log(`Updating table: ${table}...`);
      
      // Check if column exists
      const colCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name=$1 AND column_name='company_id';
      `, [table]);

      if (colCheck.rows.length === 0) {
        // Add column
        await client.query(`ALTER TABLE ${table} ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE`);
        
        // Update existing rows
        await client.query(`UPDATE ${table} SET company_id = $1`, [defaultCompanyId]);
        
        // Make it NOT NULL
        await client.query(`ALTER TABLE ${table} ALTER COLUMN company_id SET NOT NULL`);
      } else {
        console.log(`Column company_id already exists in ${table}`);
      }
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
