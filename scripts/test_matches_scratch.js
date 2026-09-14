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

async function testAdminAccess() {
  console.log('--- Testing issues with admin key ---');
  const issues = await adminClient.from('issues').select('id, status');
  console.log('Admin issues count:', issues.data?.length, 'error:', issues.error?.message);

  console.log('--- Testing matches with admin key ---');
  const matches = await adminClient.from('matches').select('org_id, organizations(type)');
  console.log('Admin matches count:', matches.data?.length, 'error:', matches.error?.message);
  console.log('Matches data:', JSON.stringify(matches.data, null, 2));

  console.log('--- Testing organizations with admin key ---');
  const orgs = await adminClient.from('organizations').select('id, type');
  console.log('Admin orgs count:', orgs.data?.length, 'error:', orgs.error?.message);
}

testAdminAccess();
