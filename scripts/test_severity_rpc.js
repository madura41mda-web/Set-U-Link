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

async function testSeverityRpc() {
  console.log('Testing RPC calls for severity voting...');

  // Try rpc 'recalc_issue_severity' or 'recalculate_severity'
  const { data: r1, error: e1 } = await adminClient.rpc('recalc_issue_severity', { p_issue_id: '33333333-3333-4333-a333-333333333303' });
  console.log('RPC recalc_issue_severity:', { r1, e1: e1?.message });
}

testSeverityRpc();
