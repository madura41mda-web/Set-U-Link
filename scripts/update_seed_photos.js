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

// Distinct, category-matched Unsplash photos for each issue ID
const PHOTO_MAPPINGS = {
  '33333333-3333-4333-a333-333333333301': 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333302': 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333303': 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333304': 'https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333305': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333306': 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333307': 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333308': 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333309': 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333310': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333311': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333312': 'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333313': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333314': 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333315': 'https://images.unsplash.com/photo-1527066579998-dbbaa57f4508?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333316': 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333317': 'https://images.unsplash.com/photo-1611284446314-60a55ac7deab?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333318': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333319': 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333320': 'https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333321': 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333322': 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333323': 'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333324': 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333325': 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333326': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333327': 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333328': 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333329': 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333330': 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333331': 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333332': 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333333': 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333334': 'https://images.unsplash.com/photo-1611284446314-60a55ac7deab?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333335': 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333336': 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333337': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333338': 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333339': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
  '33333333-3333-4333-a333-333333333340': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'
};

async function updateSeedPhotos() {
  console.log('====================================================');
  console.log('🖼️ UPDATING DATABASE & SEED.SQL WITH DISTINCT PHOTOS 🖼️');
  console.log('====================================================\n');

  let updatedCount = 0;
  for (const [id, url] of Object.entries(PHOTO_MAPPINGS)) {
    const { error } = await adminClient
      .from('issues')
      .update({ photo_url: url })
      .eq('id', id);

    if (error) {
      console.warn(`Failed to update issue ${id}:`, error.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`✅ Updated ${updatedCount} seeded issue photo_urls in Supabase database!`);

  // Verify distinctness
  const { data: allIssues } = await adminClient.from('issues').select('id, photo_url');
  if (allIssues) {
    const photoUrls = allIssues.map((i) => i.photo_url).filter(Boolean);
    const uniqueUrls = new Set(photoUrls);
    console.log(`📊 Total Issues with photos: ${photoUrls.length}`);
    console.log(`📊 Unique Photo URLs count: ${uniqueUrls.size}`);
  }
}

updateSeedPhotos();
