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
const anonKey = envVars['VITE_SUPABASE_ANON_KEY'];

const client = createClient(supabaseUrl, serviceRoleKey);

async function testStorageUpload() {
  console.log('====================================================');
  console.log('🧪 TESTING SUPABASE STORAGE BUCKET & GETPUBLICURL 🧪');
  console.log('====================================================\n');

  const testBuffer = Buffer.from('fake-image-data-test-upload');
  const fileName = `test_${Date.now()}.jpg`;

  const { data: uploadData, error: uploadErr } = await client.storage
    .from('issue-photos')
    .upload(fileName, testBuffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadErr) {
    console.error('❌ Storage upload failed:', uploadErr.message);
    return;
  }

  console.log('✅ Upload succeeded! File path:', uploadData.path);

  const { data: publicUrlData } = client.storage
    .from('issue-photos')
    .getPublicUrl(fileName);

  console.log('✅ getPublicUrl() result:', publicUrlData?.publicUrl);

  // Clean up test file
  await client.storage.from('issue-photos').remove([fileName]);
  console.log('🧹 Cleaned up test upload file.');
}

testStorageUpload();
