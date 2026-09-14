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

async function fixMatchesPolicy() {
  console.log('Fixing infinite recursion in matches policy...');

  const sqlCommands = [
    `DROP POLICY IF EXISTS "Org reps select own org matches" ON public.matches;`,
    `DROP POLICY IF EXISTS "Allow select for all users" ON public.matches;`,
    `CREATE POLICY "Allow select for all users" ON public.matches FOR SELECT USING (true);`,
  ];

  for (const cmd of sqlCommands) {
    const { data, error } = await adminClient.rpc('exec_sql', { sql_string: cmd });
    console.log('RPC exec_sql result:', { cmd, data, error: error?.message });
  }
}

fixMatchesPolicy();
