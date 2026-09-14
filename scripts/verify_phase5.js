import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhase5Verification() {
  console.log('🚀 Initializing local Postgres engine (PGlite) for Phase 5 verification...');
  const db = new PGlite();

  try {
    // Auth & role stubs
    await db.exec(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '22222222-2222-4222-a222-222222222201'::uuid $$ LANGUAGE sql;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql;
    `);

    // Load migrations
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
    console.log('✅ All migrations applied.');

    // Load seed SQL
    const seedPath = path.join(__dirname, '../supabase/seed.sql');
    let seedSql = fs.readFileSync(seedPath, 'utf8')
      .replace(/ST_SetSRID\(ST_MakePoint\(([^)]+)\), 4326\)::geography/gi, "'POINT($1)'");
    await db.exec(seedSql);
    console.log('✅ Seed data loaded.');

    console.log('\n======================================================');
    console.log('🧪 TESTING ISSUE STATUS ADVANCE & AUDIT LOG');
    console.log('======================================================');

    const adminUserId = '22222222-2222-4222-a222-222222222201'; // Admin
    const citizenUserId = '22222222-2222-4222-a222-222222222202';
    const issueId = '99999999-9999-4999-a999-999999999901';

    // 1. Citizen creates issue at status 'reported'
    await db.query(`
      INSERT INTO public.issues (
        id, title, description, category, district, location, status, reporter_id, created_at
      ) VALUES (
        $1, 'Broken Culvert in Namkum Block', 'Heavy rains washed out culvert.', 'infra', 'Ranchi', 'POINT(85.35 23.35)', 'reported', $2, NOW() - INTERVAL '3 days'
      );
    `, [issueId, citizenUserId]);

    await db.query(`
      INSERT INTO public.status_history (issue_id, stage, changed_by, changed_at)
      VALUES ($1, 'reported', $2, NOW() - INTERVAL '3 days');
    `, [issueId, citizenUserId]);

    console.log('✅ Issue created at status "reported".');

    // 2. Admin advances status: reported -> validated
    console.log('Simulating Admin advancing status: reported ➔ validated...');
    await db.query(`UPDATE public.issues SET status = 'validated' WHERE id = $1;`, [issueId]);
    await db.query(`
      INSERT INTO public.status_history (issue_id, stage, changed_by, changed_at)
      VALUES ($1, 'validated', $2, NOW() - INTERVAL '2 days');
    `, [issueId, adminUserId]);

    // 3. Admin advances status: validated -> matched
    console.log('Simulating Admin advancing status: validated ➔ matched...');
    await db.query(`UPDATE public.issues SET status = 'matched' WHERE id = $1;`, [issueId]);
    await db.query(`
      INSERT INTO public.status_history (issue_id, stage, changed_by, changed_at)
      VALUES ($1, 'matched', $2, NOW() - INTERVAL '1 day');
    `, [issueId, adminUserId]);

    // 4. Verify results
    const issueRes = await db.query(`SELECT * FROM public.issues WHERE id = $1;`, [issueId]);
    const historyRes = await db.query(`SELECT * FROM public.status_history WHERE issue_id = $1 ORDER BY changed_at ASC;`, [issueId]);

    console.log('\n✅ Verification Query Results:');
    console.log(`   - Final Issue Status in DB: "${issueRes.rows[0].status}"`);
    console.log(`   - Total Status History Entries: ${historyRes.rows.length}`);
    historyRes.rows.forEach((h, idx) => {
      console.log(`     [Step ${idx + 1}] Stage: ${h.stage.padEnd(12)} | Changed By: ${h.changed_by} | Date: ${h.changed_at}`);
    });

    if (issueRes.rows[0].status === 'matched' && historyRes.rows.length === 3) {
      console.log('\n🎯 VERIFICATION PASSED: Issue status successfully advanced and all history rows persisted!');
    } else {
      console.error('\n❌ VERIFICATION FAILED!');
      process.exit(1);
    }

    console.log('\n======================================================');
    console.log('✨ PHASE 5 STATUS TRACKER VERIFICATION COMPLETE');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Verification error:', err);
    process.exit(1);
  }
}

runPhase5Verification();
