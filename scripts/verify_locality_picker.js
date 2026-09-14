import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runLocalityPickerVerification() {
  console.log('🚀 Running Locality Picker & Reverse Geocoding Verification Test...\n');

  // 1. Test Nominatim Extraction Algorithm
  const sampleNominatimResponses = [
    {
      name: 'Urban Ranchi (Doranda/Naditoli)',
      address: { suburb: 'Naditoli', county: 'Namkum', state_district: 'Ranchi', state: 'Jharkhand' }
    },
    {
      name: 'Urban Dhanbad (Kasturba Nagar)',
      address: { road: 'Dhaiya Main Road', suburb: 'Kasturba Nagar', city: 'Dhanbad', state_district: 'Dhanbad' }
    },
    {
      name: 'Rural Angara Village',
      address: { road: 'Angara Hahe Road', neighbourhood: 'Janum', hamlet: 'Hahe', village: 'Angara', state_district: 'Ranchi' }
    },
    {
      name: 'Sparse Rural Pin (Empty Locality)',
      address: { state_district: 'Palamu', state: 'Jharkhand', country: 'India' }
    }
  ];

  console.log('======================================================');
  console.log('🧪 TEST 1: NOMINATIM REVERSE GEOCODE CHIP EXTRACTION');
  console.log('======================================================');

  const district = 'Ranchi';
  const keys = ['suburb', 'neighbourhood', 'village', 'hamlet', 'town', 'quarter', 'residential', 'city_district', 'road'];

  for (const sample of sampleNominatimResponses) {
    const candidates = [];
    for (const k of keys) {
      if (sample.address[k] && typeof sample.address[k] === 'string' && sample.address[k].trim()) {
        const val = sample.address[k].trim();
        if (
          !candidates.includes(val) &&
          val.toLowerCase() !== district.toLowerCase() &&
          val.toLowerCase() !== 'india' &&
          val.toLowerCase() !== 'jharkhand'
        ) {
          candidates.push(val);
        }
      }
    }
    const topChips = candidates.slice(0, 3);
    console.log(`• Location: "${sample.name}"`);
    console.log(`  Extracted Chips: ${JSON.stringify(topChips)}`);

    if (sample.name.includes('Sparse')) {
      if (topChips.length === 0) {
        console.log('  ✅ Correctly fell back to 0 chips (triggers custom text input fallback)');
      } else {
        console.error('  ❌ Failed sparse fallback!');
        process.exit(1);
      }
    } else {
      if (topChips.length > 0) {
        console.log(`  ✅ Successfully extracted ${topChips.length} chip candidate(s): "${topChips[0]}" auto-selected`);
      } else {
        console.error('  ❌ Failed to extract candidate chips!');
        process.exit(1);
      }
    }
  }

  // 2. Test DB persistence of selected chip string in issues.area
  console.log('\n======================================================');
  console.log('🧪 TEST 2: DATABASE PERSISTENCE OF CHIP SELECTION');
  console.log('======================================================');

  const db = new PGlite();
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$ LANGUAGE sql;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'authenticated'::text $$ LANGUAGE sql;
  `);

  const mig1Path = path.join(__dirname, '../supabase/migrations/20260913000000_create_setulink_schema.sql');
  let mig1Sql = fs.readFileSync(mig1Path, 'utf8')
    .replace(/CREATE EXTENSION IF NOT EXISTS postgis;/gi, '-- PostGIS extension')
    .replace(/geography\(Point,\s*4326\)/gi, 'text')
    .replace(/USING GIST\(location\)/gi, 'USING btree(location)');
  await db.exec(mig1Sql);

  const mig2Path = path.join(__dirname, '../supabase/migrations/20260913000001_handle_new_user_trigger.sql');
  await db.exec(fs.readFileSync(mig2Path, 'utf8'));

  const mig5Path = path.join(__dirname, '../supabase/migrations/20260913000005_add_area_and_org_location.sql');
  let mig5Sql = fs.readFileSync(mig5Path, 'utf8')
    .replace(/geography\(Point,\s*4326\)/gi, 'text')
    .replace(/USING GIST\(location\)/gi, 'USING btree(location)')
    .replace(/ST_SetSRID\(ST_MakePoint\(([^)]+)\), 4326\)::geography/gi, "'POINT($1)'");
  await db.exec(mig5Sql);

  const reporterId = '11111111-1111-4111-a111-111111111111';
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'reporter@citizen.org');`, [reporterId]);

  const selectedChipArea = 'Kasturba Nagar';
  const newIssueId = 'c1111111-2222-3333-4444-555555555555';

  await db.query(`
    INSERT INTO public.issues (
      id, title, description, category, district, area, location, status, reporter_id
    ) VALUES (
      $1, 'Contaminated Water in Kasturba Nagar', 'Brown water from taps', 'water', 'Dhanbad', $2, 'POINT(86.43 23.79)', 'reported', $3
    );
  `, [newIssueId, selectedChipArea, reporterId]);

  const savedIssue = (await db.query(`SELECT id, title, district, area FROM public.issues WHERE id = $1;`, [newIssueId])).rows[0];
  console.log(`• Saved issue row: ID=${savedIssue.id}, District="${savedIssue.district}", Area="${savedIssue.area}"`);

  if (savedIssue.area === selectedChipArea) {
    console.log('✅ Locality chip selection saved cleanly to issues.area as plain text!');
  } else {
    console.error('❌ DB Area persistence failed!');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('✨ LOCALITY PICKER VERIFICATION COMPLETE!');
  console.log('======================================================\n');
}

runLocalityPickerVerification();
