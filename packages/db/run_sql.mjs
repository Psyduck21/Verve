import postgres from 'postgres';

const sql = postgres('postgresql://postgres:Focal%40%23123%40%23@db.mrmvoxqqvwltigwsruyl.supabase.co:5432/postgres');

async function main() {
  try {
    await sql`ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;`;
    console.log("Added is_default to routines");
    await sql`ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;`;
    console.log("Added is_default to task_templates");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}

main();
