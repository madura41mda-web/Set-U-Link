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

async function checkUserRoles() {
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, role, verified, org_id');

  const { data: usersData } = await adminClient.auth.admin.listUsers();

  usersData.users.forEach((u) => {
    const prof = profiles.find((p) => p.id === u.id);
    console.log(`User ${u.email} (${u.id}): role=${prof?.role}, verified=${prof?.verified}`);
  });
}

checkUserRoles();
