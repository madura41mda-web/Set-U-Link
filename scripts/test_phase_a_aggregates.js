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

async function testAggregates() {
  console.log('--- TESTING DASHBOARD AGGREGATE QUERIES ---');

  // 1. Total Issues Count
  const { count: totalCount, error: err1 } = await adminClient
    .from('issues')
    .select('*', { count: 'exact', head: true });

  // 2. Resolved Count
  const { count: resolvedCount, error: err2 } = await adminClient
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'resolved');

  // 3. In Progress Count (validated, matched, sanctioned, in_progress)
  const { count: inProgressCount, error: err3 } = await adminClient
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .in('status', ['validated', 'matched', 'sanctioned', 'in_progress']);

  // 4. Category breakdown
  const { data: categoryData, error: err4 } = await adminClient
    .from('issues')
    .select('category');

  // 5. District breakdown
  const { data: districtData, error: err5 } = await adminClient
    .from('issues')
    .select('district, status');

  // 6. Status History for Avg Resolution Time
  const { data: historyData, error: err6 } = await adminClient
    .from('status_history')
    .select('issue_id, stage, changed_at');

  const { data: issuesData, error: err7 } = await adminClient
    .from('issues')
    .select('id, created_at, status');

  console.log('Total Count:', totalCount);
  console.log('Resolved Count:', resolvedCount);
  console.log('In Progress Count:', inProgressCount);
  
  if (categoryData) {
    const catCounts = {};
    categoryData.forEach(row => {
      catCounts[row.category] = (catCounts[row.category] || 0) + 1;
    });
    console.log('Category Counts:', catCounts);
  }

  if (districtData) {
    const distCounts = {};
    districtData.forEach(row => {
      distCounts[row.district] = (distCounts[row.district] || 0) + 1;
    });
    console.log('District Counts:', distCounts);
  }

  // Compute resolution time from status_history
  if (historyData && issuesData) {
    const issueCreatedMap = {};
    issuesData.forEach(i => { issueCreatedMap[i.id] = new Date(i.created_at); });

    const resolvedTimesDays = [];
    historyData.forEach(sh => {
      if (sh.stage === 'resolved' && issueCreatedMap[sh.issue_id]) {
        const diffMs = new Date(sh.changed_at) - issueCreatedMap[sh.issue_id];
        const diffDays = Math.max(0.5, diffMs / (1000 * 60 * 60 * 24));
        resolvedTimesDays.push(diffDays);
      }
    });

    const avgResolutionDays = resolvedTimesDays.length > 0
      ? (resolvedTimesDays.reduce((a, b) => a + b, 0) / resolvedTimesDays.length).toFixed(1)
      : '3.5';

    console.log('Avg Resolution Days:', avgResolutionDays, 'based on', resolvedTimesDays.length, 'resolved status history entries');
  }
}

testAggregates();
