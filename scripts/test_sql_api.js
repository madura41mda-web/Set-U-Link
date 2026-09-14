import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

async function testSqlApi() {
  console.log('Testing SQL execution endpoints on Supabase...');

  const sqlQuery = `
    DROP POLICY IF EXISTS "Allow citizens to delete own reported or validated issues" ON public.issues;
    CREATE POLICY "Allow citizens to delete own reported or validated issues"
      ON public.issues FOR DELETE
      TO authenticated
      USING (reporter_id = auth.uid() AND status IN ('reported', 'validated'));
  `;

  // Endpoint 1: /pg/v1/query
  try {
    const res1 = await fetch(`${supabaseUrl}/pg/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ query: sqlQuery })
    });

    console.log('/pg/v1/query Status:', res1.status, res1.statusText);
    const text1 = await res1.text();
    console.log('/pg/v1/query Body:', text1);
  } catch (err) {
    console.error('Error testing /pg/v1/query:', err);
  }

  // Endpoint 2: Direct Postgres DB connection using pg
  console.log('\nDirect postgres DB host: db.uhmykasatoyspdfogygg.supabase.co');
}

testSqlApi();
