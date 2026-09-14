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
const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function diagnose() {
  console.log('=== DIAGNOSING DUPLICATES & DELETE BUG ===\n');

  // 1. Search for "jaynagar" or "pothole" or duplicates in DB
  const { data: jaynagarIssues, error: err1 } = await adminClient
    .from('issues')
    .select('id, title, description, category, district, status, upvotes, reporter_id, duplicate_of, created_at')
    .ilike('title', '%jaynagar%');

  console.log('Jaynagar issues found:', jaynagarIssues);

  const { data: allDuplicates } = await adminClient
    .from('issues')
    .select('id, title, status, upvotes, reporter_id, duplicate_of, created_at')
    .not('duplicate_of', 'is', null);

  console.log('All linked duplicate issues in DB:', allDuplicates);

  // 2. Inspect profiles & users in auth/profiles table
  const { data: profiles } = await adminClient.from('profiles').select('*');
  console.log('\nProfiles in DB:', profiles);

  // 3. Test exact delete policy behavior as an authenticated user
  // Let's sign in or get a token for a citizen user or create a session to reproduce client-side DELETE call!
  if (jaynagarIssues && jaynagarIssues.length > 0) {
    const testTarget = jaynagarIssues[0];
    console.log(`\nTesting client-side DELETE call on issue ID: ${testTarget.id}, status: ${testTarget.status}, reporter_id: ${testTarget.reporter_id}`);

    // Try deleting using anonClient without auth token
    const { data: res1, error: errAnon } = await anonClient.from('issues').delete().eq('id', testTarget.id).select();
    console.log('Anon delete result -> error:', errAnon, 'data:', res1);

    // If reporter_id exists, check if reporter's profile exists
    if (testTarget.reporter_id) {
      const { data: repProfile } = await adminClient.from('profiles').select('*').eq('id', testTarget.reporter_id).single();
      console.log('Reporter profile:', repProfile);
    }
  }

  // 4. Query RLS policies on issues table directly via pg_policies table or SQL query
  const { data: policies, error: polErr } = await adminClient.rpc('get_policies');
  if (polErr) {
    console.log('Could not call get_policies RPC (normal if not defined).');
  } else {
    console.log('Policies:', policies);
  }
}

diagnose();
