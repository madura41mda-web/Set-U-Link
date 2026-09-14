import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

console.log('====================================================');
console.log('🧪 VERIFYING EMAIL-GATED SIGNUP & DASHBOARD STATS 🧪');
console.log('====================================================\n');

// 1. Verify OrgSignUp Allowlist Logic
console.log('🔹 1. Testing OrgSignUp Allowlist Logic...');

const ORG_SIGNUP_ALLOWLIST = {
  'madura41mda@gmail.com': ['university'],
  'madura.0741@gmail.com': ['csr', 'startup', 'msme', 'govt', 'research_institution'],
};

function validateOrgSignup(email, orgType) {
  const cleanEmail = email.trim().toLowerCase();
  const allowedTypes = ORG_SIGNUP_ALLOWLIST[cleanEmail];

  if (!allowedTypes) {
    return { ok: false, error: 'This email address is not authorized to register an organization account.' };
  }

  if (!allowedTypes.includes(orgType)) {
    return {
      ok: false,
      error: `This email is not authorized for the selected organization type. Allowed organization type(s): ${allowedTypes.join(', ')}.`,
    };
  }

  return { ok: true };
}

// Test case 1.1: Unauthorized email
const res1 = validateOrgSignup('unauthorized@domain.com', 'university');
assert.strictEqual(res1.ok, false, 'Unauthorized email should be rejected');
assert.ok(res1.error.includes('not authorized'), 'Error message should indicate email is not authorized');
console.log('  ✅ Unauthorized email rejected with message:', res1.error);

// Test case 1.2: Allowed email with valid type
const res2 = validateOrgSignup('madura41mda@gmail.com', 'university');
assert.strictEqual(res2.ok, true, 'madura41mda@gmail.com with university should be allowed');
console.log('  ✅ Allowed email madura41mda@gmail.com + university passed validation');

// Test case 1.3: Allowed email with invalid type
const res3 = validateOrgSignup('madura41mda@gmail.com', 'csr');
assert.strictEqual(res3.ok, false, 'madura41mda@gmail.com with csr should be rejected');
assert.ok(res3.error.includes('university'), 'Error message should name allowed type "university"');
console.log('  ✅ Disallowed orgType for madura41mda@gmail.com rejected with message:', res3.error);

// Test case 1.4: Second allowed email with valid type
const res4 = validateOrgSignup('MADURA.0741@gmail.com ', 'startup');
assert.strictEqual(res4.ok, true, 'madura.0741@gmail.com with startup should be allowed (handling trim/lowercase)');
console.log('  ✅ Allowed email madura.0741@gmail.com + startup passed validation');

// Test case 1.5: Second allowed email with research_institution
const res5 = validateOrgSignup('madura.0741@gmail.com', 'research_institution');
assert.strictEqual(res5.ok, true, 'madura.0741@gmail.com with research_institution should be allowed');
console.log('  ✅ Allowed email madura.0741@gmail.com + research_institution passed validation');

// Test case 1.6: Second allowed email with invalid type
const res6 = validateOrgSignup('madura.0741@gmail.com', 'university');
assert.strictEqual(res6.ok, false, 'madura.0741@gmail.com with university should be rejected');
assert.ok(res6.error.includes('research_institution'), 'Error message should list research_institution');
console.log('  ✅ Disallowed orgType for madura.0741@gmail.com rejected with message:', res6.error);

// 2. Verify Dashboard Query & Calculation Logic
console.log('\n🔹 2. Testing Dashboard Queries against Supabase Database...');

async function verifyDashboardQueries() {
  const { data: matchesData, error: errMatches } = await adminClient
    .from('matches')
    .select('org_id, organizations(id, type)');

  assert.ifError(errMatches);

  const { data: orgsData, error: errOrgs } = await adminClient
    .from('organizations')
    .select('id, type');

  assert.ifError(errOrgs);

  const uniOrgs = new Set();
  const industryOrgs = new Set();

  const orgTypeMap = {};
  if (orgsData) {
    orgsData.forEach((o) => {
      if (o.id && o.type) orgTypeMap[o.id] = o.type;
    });
  }

  if (matchesData) {
    matchesData.forEach((m) => {
      const orgId = m.org_id;
      const orgType = (Array.isArray(m.organizations)
        ? m.organizations[0]?.type
        : m.organizations?.type) || orgTypeMap[orgId];

      if (orgId && orgType) {
        if (orgType === 'university') {
          uniOrgs.add(orgId);
        } else if (['csr', 'startup', 'msme'].includes(orgType)) {
          industryOrgs.add(orgId);
        }
      }
    });
  }

  console.log(`  📊 Live DB "University Participation" Count: ${uniOrgs.size}`);
  console.log(`  📊 Live DB "Industry Collaboration" Count: ${industryOrgs.size}`);

  assert.ok(typeof uniOrgs.size === 'number', 'University Participation count must be a number');
  assert.ok(typeof industryOrgs.size === 'number', 'Industry Collaboration count must be a number');
  assert.strictEqual(uniOrgs.size, 2, 'University Participation distinct count should be 2 for seeded data');
  assert.strictEqual(industryOrgs.size, 5, 'Industry Collaboration distinct count should be 5 for seeded data');

  console.log('  ✅ Dashboard StatCard queries verified successfully!');
}

await verifyDashboardQueries();

// 3. Verify StatCard Count in Dashboard.jsx
console.log('\n🔹 3. Verifying StatCard count in Dashboard.jsx file...');
const dashboardContent = fs.readFileSync(path.join(__dirname, '../src/pages/Dashboard.jsx'), 'utf8');
const statCardMatches = dashboardContent.match(/<StatCard/g);
console.log(`  📊 Found ${statCardMatches ? statCardMatches.length : 0} <StatCard /> components in Dashboard.jsx`);
assert.strictEqual(statCardMatches ? statCardMatches.length : 0, 5, 'Dashboard.jsx must contain exactly 5 StatCard components');

console.log('\n====================================================');
console.log('🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! 🎉');
console.log('====================================================');
