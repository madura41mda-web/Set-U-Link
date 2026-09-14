import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

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

console.log('--- PHASE A DB AGGREGATE VERIFICATION TEST SUITE ---');
const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function runPhaseATest() {
  try {
    // 1. Fetch exact row counts from DB
    const { count: total, error: e1 } = await adminClient.from('issues').select('*', { count: 'exact', head: true });
    const { count: resolved, error: e2 } = await adminClient.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'resolved');
    const { count: inProgress, error: e3 } = await adminClient.from('issues').select('*', { count: 'exact', head: true }).in('status', ['validated', 'matched', 'sanctioned', 'in_progress']);

    if (e1 || e2 || e3) throw (e1 || e2 || e3);

    console.log(`Live DB Counts -> Total: ${total}, Resolved: ${resolved}, In-Progress: ${inProgress}`);

    assert.ok(typeof total === 'number' && total > 0, 'Total issues count must be a positive number');
    assert.ok(typeof resolved === 'number', 'Resolved count must be a number');
    assert.ok(typeof inProgress === 'number', 'In-progress count must be a number');

    // 2. Category counts
    const { data: issuesData } = await adminClient.from('issues').select('category, district');
    const catCounts = {};
    const distCounts = {};
    issuesData.forEach(row => {
      catCounts[row.category] = (catCounts[row.category] || 0) + 1;
      distCounts[row.district] = (distCounts[row.district] || 0) + 1;
    });

    const sumCats = Object.values(catCounts).reduce((a, b) => a + b, 0);
    assert.strictEqual(sumCats, total, 'Sum of category counts must equal total issues count');

    console.log('Category Distribution:', catCounts);
    console.log('District Distribution:', distCounts);

    console.log('✅ Phase A DB Aggregate Verification PASSED!');
  } catch (err) {
    console.error('Phase A Verification Failed:', err);
    process.exit(1);
  }
}

runPhaseATest();
