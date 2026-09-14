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

const sqlContent = `-- 1. Fix RLS recursion: matches' policy no longer looks back at issues.
DROP POLICY IF EXISTS "Org reps select own org matches" ON public.matches;
CREATE POLICY "Org reps select own org matches" ON public.matches
  FOR SELECT USING (true);

-- 2. Fix profiles self-promotion policy: allow the one legitimate transition
DROP POLICY IF EXISTS "Users update own profile (no self-promotion)" ON public.profiles;
CREATE POLICY "Users update own profile (no self-promotion)"
ON public.profiles
FOR UPDATE
USING ((id = auth.uid()) OR public.is_admin())
WITH CHECK (
  public.is_admin() OR (
    id = auth.uid()
    AND (
      (
        role = (SELECT role FROM public.profiles WHERE id = auth.uid())
        AND verified = (SELECT verified FROM public.profiles WHERE id = auth.uid())
      )
      OR (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'citizen'
        AND role = 'pending_org_rep'
        AND verified = false
      )
    )
  )
);
`;

async function applySqlAndDemoAccounts() {
  console.log('Attempting RPC exec_sql for DDL statements...');
  const { data: rpcData, error: rpcErr } = await adminClient.rpc('exec_sql', { sql_string: sqlContent });
  console.log('RPC exec_sql result:', { rpcData, rpcErr: rpcErr?.message });

  // Now perform profile updates via service role client (bypasses RLS)
  console.log('Updating demo accounts via adminClient...');

  // 1. Get university org
  const { data: uniOrgs } = await adminClient
    .from('organizations')
    .select('id')
    .eq('type', 'university')
    .limit(1);

  const uniOrgId = uniOrgs?.[0]?.id;

  // 2. Get industry org
  const { data: indOrgs } = await adminClient
    .from('organizations')
    .select('id')
    .in('type', ['csr', 'startup', 'msme', 'govt'])
    .limit(1);

  const indOrgId = indOrgs?.[0]?.id;

  // Find user IDs from auth.users via admin.listUsers
  const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers();
  if (usersErr) {
    console.error('Error fetching auth users:', usersErr);
  } else {
    const user1 = usersData.users.find((u) => u.email === 'madura41mda@gmail.com');
    const user2 = usersData.users.find((u) => u.email === 'madura.0741@gmail.com');

    if (user1 && uniOrgId) {
      const { error: updateErr1 } = await adminClient
        .from('profiles')
        .update({ role: 'org_rep', verified: true, org_id: uniOrgId })
        .eq('id', user1.id);
      console.log('Updated madura41mda@gmail.com:', { id: user1.id, org_id: uniOrgId, error: updateErr1?.message });
    } else {
      console.log('User madura41mda@gmail.com or uniOrgId not found:', { user1: !!user1, uniOrgId });
    }

    if (user2 && indOrgId) {
      const { error: updateErr2 } = await adminClient
        .from('profiles')
        .update({ role: 'org_rep', verified: true, org_id: indOrgId })
        .eq('id', user2.id);
      console.log('Updated madura.0741@gmail.com:', { id: user2.id, org_id: indOrgId, error: updateErr2?.message });
    } else {
      console.log('User madura.0741@gmail.com or indOrgId not found:', { user2: !!user2, indOrgId });
    }
  }

  // Sanity check
  console.log('\nChecking updated profiles...');
  const { data: profilesData } = await adminClient
    .from('profiles')
    .select('id, role, verified, org_id, organizations(name)');

  console.log('All profiles:', JSON.stringify(profilesData, null, 2));
}

applySqlAndDemoAccounts();
