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

async function diagnoseDataUriPhotos() {
  console.log('--- Task 3 Investigation: Checking data:image Base64 Photo URLs in DB ---');

  const { data: issues, error } = await adminClient
    .from('issues')
    .select('id, title, photo_url, created_at');

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log(`Total issues in database: ${issues.length}`);

  const dataUriIssues = issues.filter((i) => i.photo_url && i.photo_url.startsWith('data:image'));
  const storageUriIssues = issues.filter((i) => i.photo_url && (i.photo_url.includes('supabase.co/storage') || i.photo_url.includes('unsplash.com')));
  const nullPhotoIssues = issues.filter((i) => !i.photo_url);

  console.log('\n=== Photo URL Breakdown ===');
  console.log(`- Base64 data:image URIs: ${dataUriIssues.length}`);
  console.log(`- Storage / Unsplash HTTP URLs: ${storageUriIssues.length}`);
  console.log(`- Null / No photo: ${nullPhotoIssues.length}`);

  if (dataUriIssues.length > 0) {
    console.log('\nDetails of base64 data:image issues:');
    let maxCharLen = 0;
    let maxIssueTitle = '';

    dataUriIssues.forEach((item) => {
      const len = item.photo_url.length;
      const approxBytes = Math.round((len * 3) / 4);
      const approxMB = (approxBytes / (1024 * 1024)).toFixed(2);

      if (len > maxCharLen) {
        maxCharLen = len;
        maxIssueTitle = item.title;
      }

      console.log(`- Issue [${item.id}] "${item.title}": URL Length = ${len} chars (~${approxMB} MB base64 data URI)`);
    });

    const largestMB = ((Math.round((maxCharLen * 3) / 4)) / (1024 * 1024)).toFixed(2);
    console.log(`\nLargest data URI photo: "${maxIssueTitle}" (${maxCharLen} characters, ~${largestMB} MB base64 string directly stored in DB column!)`);
  } else {
    console.log('\nNo issues currently have data:image base64 photo_urls.');
  }
}

diagnoseDataUriPhotos();
