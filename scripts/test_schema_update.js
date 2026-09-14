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

async function testSchema() {
  console.log('Testing remote schema inspection and modification...');

  // Try creating table or columns via adminClient or checking existing columns
  const { data: issueRow, error: issueErr } = await adminClient.from('issues').select('*').limit(1);
  console.log('Issues columns:', issueRow ? Object.keys(issueRow[0]) : issueErr);

  const { data: profileRow, error: profileErr } = await adminClient.from('profiles').select('*').limit(1);
  console.log('Profiles columns:', profileRow ? Object.keys(profileRow[0]) : profileErr);

  const { data: commentRow, error: commentErr } = await adminClient.from('comments').select('*').limit(1);
  console.log('Comments columns:', commentRow ? Object.keys(commentRow[0]) : commentErr);

  // Check if severity_votes table exists
  const { data: voteRow, error: voteErr } = await adminClient.from('severity_votes').select('*').limit(1);
  console.log('severity_votes check:', voteRow, voteErr?.message);
}

testSchema();
