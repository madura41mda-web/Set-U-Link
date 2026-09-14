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

async function diagnosePhotos() {
  console.log('--- Part 2: Diagnosing Issue Photo URLs from Database ---');

  const { data: issues, error } = await adminClient
    .from('issues')
    .select('id, title, photo_url, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error querying issues:', error);
    return;
  }

  console.log(`Total issues fetched: ${issues.length}\n`);

  // 1. Check duplicate photo_urls
  const urlCounts = {};
  issues.forEach((item) => {
    if (item.photo_url) {
      urlCounts[item.photo_url] = (urlCounts[item.photo_url] || 0) + 1;
    }
  });

  const duplicates = Object.entries(urlCounts).filter(([url, count]) => count > 1);
  console.log('=== 1. Duplicate photo_url Analysis ===');
  if (duplicates.length === 0) {
    console.log('✅ No duplicate photo_url values found among these issues!');
  } else {
    console.log(`⚠️ Found ${duplicates.length} duplicate photo_urls:`);
    duplicates.forEach(([url, count]) => {
      console.log(`- Count ${count}: ${url}`);
      const matching = issues.filter((i) => i.photo_url === url);
      matching.forEach((m) => console.log(`   * "${m.title}" (${m.id})`));
    });
  }

  // 2. Specific issues mentioned: "Severe Fluoride Contamination in Angara Borewells" and "Lack of Cold Storage for Tomato Farmers in Ormanjhi"
  console.log('\n=== 2. Specific Target Issues Inspection ===');
  const target1 = issues.find((i) => i.title.includes('Severe Fluoride Contamination'));
  const target2 = issues.find((i) => i.title.includes('Lack of Cold Storage for Tomato Farmers'));

  console.log('Target 1 ("Severe Fluoride Contamination"):', {
    id: target1?.id,
    title: target1?.title,
    photo_url: target1?.photo_url,
  });

  console.log('Target 2 ("Lack of Cold Storage for Tomato Farmers"):', {
    id: target2?.id,
    title: target2?.title,
    photo_url: target2?.photo_url,
  });

  // 3. Test HTTP status of target URLs
  console.log('\n=== 3. HTTP Request Status Verification for Target URLs ===');
  for (const item of [target1, target2]) {
    if (item && item.photo_url) {
      try {
        const res = await fetch(item.photo_url, { method: 'HEAD' });
        console.log(`URL HTTP Status for "${item.title}":`, {
          status: res.status,
          statusText: res.statusText,
          contentType: res.headers.get('content-type'),
          url: item.photo_url,
        });
      } catch (err) {
        console.error(`Fetch error for "${item.title}":`, err.message);
      }
    }
  }

  // 4. Test HTTP status for all non-null photo_urls to see if any return 404/403
  console.log('\n=== 4. Checking HTTP Status for All Issues with photo_url ===');
  for (const item of issues) {
    if (item.photo_url) {
      try {
        const res = await fetch(item.photo_url, { method: 'HEAD' });
        if (res.status !== 200) {
          console.log(`⚠️ Non-200 image URL for "${item.title}": HTTP ${res.status} ${res.statusText} -> ${item.photo_url}`);
        }
      } catch (err) {
        console.log(`❌ Network error for "${item.title}": ${err.message} -> ${item.photo_url}`);
      }
    }
  }
}

diagnosePhotos();
