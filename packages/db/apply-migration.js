const postgres = require('postgres');
const fs = require('fs');
const sql = postgres(process.env.SUPABASE_DB_URL);

async function main() {
  const query = fs.readFileSync('src/migrations/0004_tense_shotgun.sql', 'utf8');
  await sql.unsafe(query);
  console.log("Migration applied!");
  process.exit(0);
}
main().catch(console.error);
