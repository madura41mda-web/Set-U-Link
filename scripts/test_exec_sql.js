import { createClient } from '@supabase/supabase-js';
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

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function testSqlExecution() {
  console.log('Testing SQL DDL execution options...');

  // Option 1: Try creating table or columns via rpc 'exec' or 'exec_sql'
  const sqlCommands = [
    `ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS avg_severity_score numeric DEFAULT 0;`,
    `ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_org_update boolean DEFAULT false;`,
    `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified boolean DEFAULT true;`,
    `CREATE TABLE IF NOT EXISTS public.severity_votes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
      voter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      score integer CHECK (score BETWEEN 1 AND 5),
      created_at timestamptz DEFAULT now(),
      CONSTRAINT severity_votes_issue_voter_key UNIQUE (issue_id, voter_id)
    );`,
    `ALTER TABLE public.severity_votes ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow select for all users" ON public.severity_votes;`,
    `CREATE POLICY "Allow select for all users" ON public.severity_votes FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Users insert own votes" ON public.severity_votes;`,
    `CREATE POLICY "Users insert own votes" ON public.severity_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);`,
    `DROP POLICY IF EXISTS "Users update own votes" ON public.severity_votes;`,
    `CREATE POLICY "Users update own votes" ON public.severity_votes FOR UPDATE USING (auth.uid() = voter_id);`
  ];

  for (const cmd of sqlCommands) {
    const { data, error } = await adminClient.rpc('exec_sql', { sql_string: cmd });
    console.log('RPC exec_sql result:', { cmd: cmd.slice(0, 40), data, error: error?.message });
  }
}

testSqlExecution();
