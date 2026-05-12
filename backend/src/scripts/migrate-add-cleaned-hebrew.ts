import pg from 'pg';
const { Pool } = pg;

type ColumnRow = {
  column_name: string;
  data_type: string;
};

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');

    try {
      // Add cleaned_hebrew column if it doesn't exist
      console.log('Checking for cleaned_hebrew column...');
      const checkCleanedHebrew = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'cleaned_hebrew'
      `);
      
      if (checkCleanedHebrew.rows.length === 0) {
        console.log('Adding cleaned_hebrew column...');
        await client.query('ALTER TABLE questions ADD COLUMN cleaned_hebrew TEXT');
        console.log('✅ cleaned_hebrew column added');
      } else {
        console.log('ℹ️  cleaned_hebrew column already exists');
      }

      // Add french_understanding column if it doesn't exist
      console.log('Checking for french_understanding column...');
      const checkFrenchUnderstanding = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'french_understanding'
      `);
      
      if (checkFrenchUnderstanding.rows.length === 0) {
        console.log('Adding french_understanding column...');
        await client.query('ALTER TABLE questions ADD COLUMN french_understanding TEXT');
        console.log('✅ french_understanding column added');
      } else {
        console.log('ℹ️  french_understanding column already exists');
      }

      // Verify the columns
      console.log('Verifying columns in questions table...');
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'questions' 
        ORDER BY ordinal_position
      `);
      
      console.log('Current columns in questions table:');
      columns.rows.forEach((row: ColumnRow) => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });

      console.log('✅ Migration completed successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
