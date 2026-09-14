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

const adminClient = createClient(envVars['VITE_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);

async function verifyMigrationSchema() {
  console.log('Query 1: Checking tables in information_schema.tables...');
  const sql1 = `SELECT table_name FROM information_schema.tables WHERE table_name IN ('faculty_mentors','project_teams','team_members');`;
  const { data: d1, error: e1 } = await adminClient.rpc('exec_sql', { sql_string: sql1 });
  console.log('--- TABLES QUERY RESULT ---');
  console.log(d1 || e1);

  console.log('\nQuery 2: Checking columns in information_schema.columns for matches table...');
  const sql2 = `SELECT column_name FROM information_schema.columns WHERE table_name = 'matches' AND column_name IN ('review_status','review_notes','assigned_mentor_id');`;
  const { data: d2, error: e2 } = await adminClient.rpc('exec_sql', { sql_string: sql2 });
  console.log('--- COLUMNS QUERY RESULT ---');
  console.log(d2 || e2);
}

verifyMigrationSchema();
