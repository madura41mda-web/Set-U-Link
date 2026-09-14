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

async function testCascadePolicy() {
  console.log('=== TESTING CASCADE POLICIES AND DELETE CAUSE ===\n');

  const userId = 'ad16efea-d81f-4542-a68a-eee609c04ef6';
  const issueId = 'f9602a68-66a2-485e-9fbd-6a6157fcd7f1';

  // Check status_history rows for this issue
  const { data: history } = await adminClient.from('status_history').select('*').eq('issue_id', issueId);
  console.log('status_history rows for issue:', history);

  // Check matches rows for this issue
  const { data: matches } = await adminClient.from('matches').select('*').eq('issue_id', issueId);
  console.log('matches rows for issue:', matches);

  // Check comments rows for this issue
  const { data: comments } = await adminClient.from('comments').select('*').eq('issue_id', issueId);
  console.log('comments rows for issue:', comments);

  // Setup user authenticated client
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

  // Test 1: Try deleting status_history as userClient
  if (history && history.length > 0) {
    const { data: delHist, error: errHist } = await userClient.from('status_history').delete().eq('issue_id', issueId).select();
    console.log('userClient DELETE status_history result -> error:', errHist, 'data:', delHist);
  }

  // Test 2: Try deleting issue without select
  const { data: delIssueNoSelect, error: errNoSelect } = await userClient.from('issues').delete().eq('id', issueId);
  console.log('userClient DELETE issues (no .select()) -> error:', errNoSelect, 'data:', delIssueNoSelect);

  // Check if issue is still in DB after delete attempt
  const { data: checkIssue } = await adminClient.from('issues').select('id').eq('id', issueId);
  console.log('Issue still exists in DB after delete attempt?', checkIssue.length > 0 ? 'YES (DELETE WAS BLOCKED!)' : 'NO (DELETED!)');
}

testCascadePolicy();
