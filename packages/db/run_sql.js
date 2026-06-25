const postgres = require('postgres');
const sql = postgres('postgresql://postgres:Focal%40%23123%40%23@db.mrmvoxqqvwltigwsruyl.supabase.co:5432/postgres');

async function main() {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb NOT NULL;`;
    console.log('Success');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
main();
