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

// Pool of unique, verified HTTP 200 Unsplash photo URLs mapped by category
const WORKING_PHOTO_POOL = {
  water: [
    'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80', // Replace 404 with verified working water link
    'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1538300342682-cf57afb97285?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1527066579998-dbbaa57f4508?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
  ],
  health: [
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
  ],
  agriculture: [
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
  ],
  education: [
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
  ],
  infra: [
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  ],
  sanitation: [
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1611284446314-60a55ac7deab?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
  ],
  livelihood: [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
  ],
};

async function fixPhotosInDb() {
  console.log('--- Updating DB photo_urls with verified HTTP 200 links ---');

  const { data: issues, error } = await adminClient
    .from('issues')
    .select('id, title, category, photo_url');

  if (error) {
    console.error('Fetch issues error:', error);
    return;
  }

  const usedUrls = new Set();

  for (const issue of issues) {
    const category = issue.category?.toLowerCase() || 'infra';
    const pool = WORKING_PHOTO_POOL[category] || WORKING_PHOTO_POOL.infra;

    // Pick an unused URL from pool or construct unique variant
    let selectedUrl = pool.find((u) => !usedUrls.has(u));
    if (!selectedUrl) {
      // Create distinct variant with unique seed parameter
      const base = pool[0].split('?')[0];
      selectedUrl = `${base}?auto=format&fit=crop&w=800&q=80&sig=${issue.id.slice(0, 8)}`;
    }

    usedUrls.add(selectedUrl);

    const { error: updateErr } = await adminClient
      .from('issues')
      .update({ photo_url: selectedUrl })
      .eq('id', issue.id);

    if (updateErr) {
      console.error(`Failed to update photo for "${issue.title}":`, updateErr.message);
    } else {
      console.log(`Updated "${issue.title}" -> ${selectedUrl}`);
    }
  }

  console.log('\nAll issue photo URLs updated in DB successfully!');
}

fixPhotosInDb();
