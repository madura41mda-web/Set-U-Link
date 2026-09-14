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

async function testUserDelete() {
  console.log('=== TESTING REAL DELETE POLICIES AND POSTGRES RESPONSE ===\n');

  const issueId = 'f9602a68-66a2-485e-9fbd-6a6157fcd7f1';
  const reporterId = 'ad16efea-d81f-4542-a68a-eee609c04ef6';

  // 1. Fetch user from auth.users or profiles
  const { data: userAuth, error: authErr } = await adminClient.auth.admin.getUserById(reporterId);
  console.log('User auth details:', userAuth?.user?.id, userAuth?.user?.email, authErr);

  // 2. Create custom JWT token or sign in as user if user exists, or check RLS SQL definition directly
  // Let's query pg_policies using adminClient raw query or inspect RLS policy
  // We can query pg_policies if available or test authenticated client
  if (userAuth?.user) {
    // Generate magic link or impersonate token or test delete with session
    console.log('User exists in auth.users:', userAuth.user.id);
  } else {
    console.log('User ID ad16efea-d81f-4542-a68a-eee609c04ef6 not found in auth.users! Checking profile...');
  }

  // Let's check all auth users in auth.users
  const { data: listUsers } = await adminClient.auth.admin.listUsers();
  console.log('List of auth.users:', listUsers?.users?.map(u => ({ id: u.id, email: u.email })));
}

testUserDelete();
