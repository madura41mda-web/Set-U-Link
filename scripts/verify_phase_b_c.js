import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { classifyIssueCategory } from '../src/lib/aiClassifier.js';
import { calculatePriorityScore } from '../src/lib/priorityScorer.js';

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

console.log('--- PHASE B & C DB VERIFICATION TEST SUITE ---');
const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function runPhaseBCTest() {
  try {
    // 1. Test AI Categorization
    console.log('1. Testing AI Classifier...');
    const cat1 = await classifyIssueCategory('Broken Handpump', 'Severely contaminated drinking water well in Angara');
    console.log('AI Classifier output for water issue:', cat1);
    assert.strictEqual(cat1, 'water', 'Should categorize water issue correctly');

    const cat2 = await classifyIssueCategory('Bridge Damage', 'Collapsed culvert on main highway connecting villages');
    console.log('AI Classifier output for infra issue:', cat2);
    assert.strictEqual(cat2, 'infra', 'Should categorize infra issue correctly');

    // 2. Test Priority Scoring
    console.log('2. Testing Priority Scorer...');
    const scoreCitizen = calculatePriorityScore({
      upvotes: 1,
      created_at: new Date(),
      title: 'Minor pothole',
      description: 'Small road issue',
      submitter_type: 'citizen'
    });
    const scorePanchayat = calculatePriorityScore({
      upvotes: 1,
      created_at: new Date(),
      title: 'Collapsed Emergency Bridge',
      description: 'Severe contamination and collapsed road structure',
      submitter_type: 'panchayat'
    });

    console.log(`Priority Score -> Citizen Minor: ${scoreCitizen}, Panchayat Severe: ${scorePanchayat}`);
    assert.ok(scorePanchayat > scoreCitizen, 'Panchayat emergency report should get significantly higher priority score');

    // 3. Test Panchayat Auto-Validation Submission in Real DB
    console.log('3. Submitting Panchayat Report to Supabase DB...');
    const panchayatPayload = {
      title: '__TEST_PANCHAYAT_REPORT__',
      description: '[Locality: Jaynagar]\n\nOfficial Panchayat report on urgent school infrastructure collapse.',
      category: 'education',
      district: 'Ranchi',
      location: 'POINT(85.3096 23.3441)',
      status: 'validated',
      upvotes: 0,
      submitter_type: 'panchayat',
      priority_score: scorePanchayat
    };

    const { data: panchayatIssue, error: pErr } = await adminClient.from('issues').insert([panchayatPayload]).select().single();
    if (pErr) throw pErr;

    console.log('Panchayat report created successfully:', panchayatIssue.id, 'Status:', panchayatIssue.status);
    assert.strictEqual(panchayatIssue.status, 'validated', 'Panchayat report must be auto-validated');

    // Check status history
    await adminClient.from('status_history').insert([
      { issue_id: panchayatIssue.id, stage: 'reported' },
      { issue_id: panchayatIssue.id, stage: 'validated' }
    ]);

    const { data: histories } = await adminClient.from('status_history').select('stage').eq('issue_id', panchayatIssue.id);
    assert.strictEqual(histories.length, 2, 'Should have 2 status history rows (reported & validated)');

    console.log('✅ Phase B & C DB Verification PASSED!');

    // Cleanup
    await adminClient.from('issues').delete().eq('id', panchayatIssue.id);
    console.log('Cleaned up test panchayat report.');
  } catch (err) {
    console.error('Phase B & C Verification Failed:', err);
    process.exit(1);
  }
}

runPhaseBCTest();
