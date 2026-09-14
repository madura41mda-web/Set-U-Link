import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhase4Verification() {
  console.log('🚀 Initializing local Postgres engine (PGlite) for Phase 4 verification...');
  const db = new PGlite();

  try {
    // Auth & role stubs
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '22222222-2222-4222-a222-222222222202'::uuid $$ LANGUAGE sql;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql;
    `);

    // 1. Load migrations
    const mig1Path = path.join(__dirname, '../supabase/migrations/20260913000000_create_setulink_schema.sql');
    let mig1Sql = fs.readFileSync(mig1Path, 'utf8')
      .replace(/CREATE EXTENSION IF NOT EXISTS postgis;/gi, '-- PostGIS extension')
      .replace(/geography\(Point,\s*4326\)/gi, 'text')
      .replace(/USING GIST\(location\)/gi, 'USING btree(location)');
    await db.exec(mig1Sql);

    const mig2Path = path.join(__dirname, '../supabase/migrations/20260913000001_handle_new_user_trigger.sql');
    await db.exec(fs.readFileSync(mig2Path, 'utf8'));

    const mig3Path = path.join(__dirname, '../supabase/migrations/20260913000002_create_issue_photos_bucket.sql');
    await db.exec(fs.readFileSync(mig3Path, 'utf8'));
    console.log('✅ All 3 database migrations applied successfully.');

    // 2. Load seed SQL
    const seedPath = path.join(__dirname, '../supabase/seed.sql');
    let seedSql = fs.readFileSync(seedPath, 'utf8')
      .replace(/ST_SetSRID\(ST_MakePoint\(([^)]+)\), 4326\)::geography/gi, "'POINT($1)'");
    await db.exec(seedSql);
    console.log('✅ Seed data applied.');

    // 3. Test Issue Submission Logic (Issues + Status History)
    console.log('\n======================================================');
    console.log('🧪 TESTING ISSUE SUBMISSION & STATUS HISTORY LOGIC');
    console.log('======================================================');

    const testReporterId = '22222222-2222-4222-a222-222222222202';
    const testIssueId = '88888888-8888-4888-a888-888888888801';
    const photoUrl = 'https://your-project.supabase.co/storage/v1/object/public/issue-photos/test_photo.jpg';

    // Insert Issue
    console.log('Simulating Issue insertion into public.issues...');
    const issueRes = await db.query(`
      INSERT INTO public.issues (
        id, title, description, category, district, location, photo_url,
        status, upvotes, reporter_id, submitter_type, priority_score, created_at
      ) VALUES (
        $1,
        'Contaminated Tap Water in Doranda Colony',
        'Pipeline leakage has resulted in muddy, contaminated water supply affecting 80 households.',
        'water',
        'Ranchi',
        'POINT(85.3120 23.3320)',
        $2,
        'reported',
        0,
        $3,
        'citizen',
        65.0,
        NOW()
      ) RETURNING *;
    `, [testIssueId, photoUrl, testReporterId]);

    const createdIssue = issueRes.rows[0];
    console.log('✅ Issue Inserted:');
    console.log(`   - Issue ID: ${createdIssue.id}`);
    console.log(`   - Title: "${createdIssue.title}"`);
    console.log(`   - Category: ${createdIssue.category} | District: ${createdIssue.district}`);
    console.log(`   - Status: ${createdIssue.status}`);
    console.log(`   - Reporter ID: ${createdIssue.reporter_id}`);
    console.log(`   - Photo URL: ${createdIssue.photo_url}`);

    // Insert Status History
    console.log('\nSimulating status_history insertion...');
    const historyRes = await db.query(`
      INSERT INTO public.status_history (
        issue_id, stage, outcome_type, changed_by, changed_at
      ) VALUES (
        $1, 'reported', NULL, $2, NOW()
      ) RETURNING *;
    `, [createdIssue.id, testReporterId]);

    const createdHistory = historyRes.rows[0];
    console.log('✅ Status History Row Inserted:');
    console.log(`   - History ID: ${createdHistory.id}`);
    console.log(`   - Issue ID: ${createdHistory.issue_id}`);
    console.log(`   - Stage: ${createdHistory.stage}`);
    console.log(`   - Changed By: ${createdHistory.changed_by}`);

    // 4. Verify storage bucket existence
    const bucketRes = await db.query(`SELECT * FROM storage.buckets WHERE id = 'issue-photos';`);
    if (bucketRes.rows.length === 1 && bucketRes.rows[0].public === true) {
      console.log('\n✅ Storage Bucket "issue-photos" exists and is PUBLIC!');
    } else {
      console.error('❌ Storage bucket "issue-photos" verification failed!');
      process.exit(1);
    }

    console.log('\n======================================================');
    console.log('✨ PHASE 4 REPORT AN ISSUE VERIFICATION COMPLETE');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exit(1);
  }
}

runPhase4Verification();
