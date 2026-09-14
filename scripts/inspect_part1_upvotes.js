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

async function inspectUpvotes() {
  console.log('--- Inspecting Issues Upvotes in DB ---');
  const { data, error } = await adminClient
    .from('issues')
    .select('id, title, upvotes, avg_severity_score, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching issues:', error);
  } else {
    console.log(`Fetched ${data?.length} issues:`);
    data.forEach((i) => {
      console.log(`- [${i.id}] "${i.title}": upvotes=${i.upvotes}, avg_severity=${i.avg_severity_score}`);
    });
  }
}

inspectUpvotes();
