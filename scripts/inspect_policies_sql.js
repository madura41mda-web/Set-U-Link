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

async function inspectPgPolicies() {
  console.log('=== INSPECTING PG_POLICIES ON ISSUES TABLE ===\n');

  // Query issues table structure and RLS policies using REST or RPC query if possible
  // Let's create an RPC or execute a SELECT from pg_policies via REST query if pg_policies is exposed, or check RLS on issues
  const { data: issueRow } = await adminClient.from('issues').select('*').eq('id', 'f9602a68-66a2-485e-9fbd-6a6157fcd7f1').single();
  console.log('Raw Issue Row in DB:', issueRow);

  // Let's test calling an update or delete policy test with userClient
  // Let's check what happens if we query `issues` as userClient (SELECT)
  const { data: userLink, error: lErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'madura41mda@gmail.com'
  });

  const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];
  const userClient = createClient(supabaseUrl, anonKey);
  await userClient.auth.verifyOtp({
    email: 'madura41mda@gmail.com',
    token: userLink.properties.email_otp,
    type: 'magiclink'
  });

  const { data: userIssues, error: selectErr } = await userClient.from('issues').select('id, title, status, reporter_id').eq('id', 'f9602a68-66a2-485e-9fbd-6a6157fcd7f1');
  console.log('User SELECT issue result:', userIssues, selectErr);
  console.log('Current Auth User ID:', (await userClient.auth.getUser()).data.user?.id);
}

inspectPgPolicies();
