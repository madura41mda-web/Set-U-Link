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

async function testPolicyUpdate() {
  console.log('=== INVESTIGATING RLS POLICY EXECUTION ON ISSUES ===\n');

  // Let's test what happens when we update an issue as userClient
  const userId = 'ad16efea-d81f-4542-a68a-eee609c04ef6';
  const issueId = 'f9602a68-66a2-485e-9fbd-6a6157fcd7f1';

  const { data: userLink } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'madura41mda@gmail.com'
  });
  const userClient = createClient(supabaseUrl, anonKey);
  await userClient.auth.verifyOtp({
    email: 'madura41mda@gmail.com',
    token: userLink.properties.email_otp,
    type: 'magiclink'
  });

  // Test UPDATE policy as user
  const { data: updateRes, error: updateErr } = await userClient
    .from('issues')
    .update({ upvotes: 1 })
    .eq('id', issueId)
    .select();

  console.log('User UPDATE issue result -> error:', updateErr, 'data:', updateRes);

  // Test SELECT policy as user
  const { data: selectRes, error: selectErr } = await userClient
    .from('issues')
    .select('*')
    .eq('id', issueId);

  console.log('User SELECT issue result -> error:', selectErr, 'data count:', selectRes?.length);
}

testPolicyUpdate();
