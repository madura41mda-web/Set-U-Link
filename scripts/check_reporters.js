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

async function checkReporters() {
  const { data: issues } = await adminClient
    .from('issues')
    .select('id, title, reporter_id, upvotes, avg_severity_score')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Issues with Reporters:');
  issues.forEach((i) => {
    console.log(`- [${i.id}] "${i.title}": reporter_id=${i.reporter_id}, upvotes=${i.upvotes}, avg_severity=${i.avg_severity_score}`);
  });

  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const user1 = usersData.users.find((u) => u.email === 'madura.0741@gmail.com');
  const user2 = usersData.users.find((u) => u.email === 'madura41mda@gmail.com');

  console.log('User IDs:');
  console.log('  madura.0741@gmail.com:', user1?.id);
  console.log('  madura41mda@gmail.com:', user2?.id);
}

checkReporters();
