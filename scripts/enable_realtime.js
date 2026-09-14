import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const adminClient = createClient(supabaseUrl, serviceRoleKey);

const sqlContent = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260914000004_enable_realtime_publication.sql'), 'utf8');

async function main() {
  console.log('Applying Realtime publication migration...');
  const { data, error } = await adminClient.rpc('exec_sql', { sql_string: sqlContent });
  console.log('Result:', { data, error: error?.message });
}

main();
