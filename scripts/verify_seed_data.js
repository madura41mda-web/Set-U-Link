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

async function inspectSeedData() {
  console.log('--- SEED DATA AUDIT ---');

  // 1. Issues Audit
  const { data: issues, error: e1 } = await adminClient.from('issues').select('id, title, status, category, district, duplicate_of');
  console.log(`Total Issues in DB: ${issues?.length}`);

  const statusMap = {};
  const duplicateMap = {};
  issues?.forEach(i => {
    statusMap[i.status] = (statusMap[i.status] || 0) + 1;
    if (i.duplicate_of) duplicateMap[i.id] = i.duplicate_of;
  });

  console.log('Status Distribution across pipeline:', statusMap);
  console.log('Linked Duplicates Count:', Object.keys(duplicateMap).length);

  // 2. Organizations Audit
  const { data: orgs, error: e2 } = await adminClient.from('organizations').select('id, name, type, district');
  console.log(`Total Organizations in DB: ${orgs?.length}`);
  orgs?.forEach(o => {
    console.log(` - ${o.name} (${o.type}) in ${o.district}`);
  });

  // 3. Matches Audit
  const { data: matches, error: e3 } = await adminClient.from('matches').select('id, issue_id, org_id, role');
  console.log(`Total Matches in DB: ${matches?.length}`);

  // Check for orphaned matches (where issue or org doesn't exist)
  const issueIds = new Set(issues?.map(i => i.id));
  const orgIds = new Set(orgs?.map(o => o.id));

  let orphanedMatches = 0;
  matches?.forEach(m => {
    if (!issueIds.has(m.issue_id) || !orgIds.has(m.org_id)) {
      orphanedMatches++;
    }
  });

  console.log(`Orphaned Matches found: ${orphanedMatches}`);
}

inspectSeedData();
