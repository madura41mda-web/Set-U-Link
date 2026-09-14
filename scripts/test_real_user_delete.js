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

async function testRealDelete() {
  console.log('=== TESTING REAL DELETE AS AUTHENTICATED USER ===\n');

  const userId = 'ad16efea-d81f-4542-a68a-eee609c04ef6'; // madura41mda@gmail.com
  const targetIssueId = 'f9602a68-66a2-485e-9fbd-6a6157fcd7f1';

  // Generate sign-in magic link or admin token for user
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'madura41mda@gmail.com'
  });

  if (linkErr) {
    console.error('Magic link error:', linkErr);
    return;
  }

  console.log('Generated auth link for user:', linkData.user.id);

  // Authenticate user client
  const userClient = createClient(supabaseUrl, anonKey);
  const { data: sessionData, error: sessErr } = await userClient.auth.verifyOtp({
    email: 'madura41mda@gmail.com',
    token: linkData.properties.email_otp,
    type: 'magiclink'
  });

  if (sessErr) {
    console.error('Verify OTP error:', sessErr);
    return;
  }

  console.log('Authenticated session established for user:', sessionData.user.id);

  // Now attempt DELETE on target issue as authenticated user madura41mda@gmail.com!
  const { data: deleteData, error: deleteError } = await userClient
    .from('issues')
    .delete()
    .eq('id', targetIssueId)
    .select();

  console.log('\n--- REAL SUPABASE DELETE RESPONSE ---');
  console.log('Delete Error:', deleteError);
  console.log('Delete Data (Returned Rows):', deleteData);
  console.log('Returned rows count:', deleteData?.length);
}

testRealDelete();
