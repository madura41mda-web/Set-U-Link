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

const ORGANIZATIONS = [
  // 3 Universities
  {
    id: '11111111-1111-4111-a111-111111111101',
    name: 'BIT Mesra Rural Technology Hub',
    type: 'university',
    category_tags: ['infra', 'water', 'agriculture', 'education'],
    district: 'Ranchi',
  },
  {
    id: '11111111-1111-4111-a111-111111111102',
    name: 'IIT (ISM) Dhanbad Clean Energy & Water Cell',
    type: 'university',
    category_tags: ['water', 'sanitation', 'infra', 'education'],
    district: 'Dhanbad',
  },
  {
    id: '11111111-1111-4111-a111-111111111109',
    name: 'Birsa Agricultural University Innovation Center',
    type: 'university',
    category_tags: ['agriculture', 'water', 'livelihood', 'health'],
    district: 'Ranchi',
  },
  // 3 Industry / CSR
  {
    id: '11111111-1111-4111-a111-111111111103',
    name: 'Tata Steel Foundation CSR Initiative',
    type: 'csr',
    category_tags: ['health', 'education', 'livelihood', 'infra'],
    district: 'East Singhbhum',
  },
  {
    id: '11111111-1111-4111-a111-111111111104',
    name: 'Bokaro Steel City CSR Division',
    type: 'csr',
    category_tags: ['education', 'health', 'infra', 'sanitation'],
    district: 'Bokaro',
  },
  {
    id: '11111111-1111-4111-a111-111111111105',
    name: 'GreenAgro & MSME Innovations Hub',
    type: 'startup',
    category_tags: ['agriculture', 'livelihood', 'water', 'infra'],
    district: 'Hazaribagh',
  },
  // 3 Government
  {
    id: '11111111-1111-4111-a111-111111111110',
    name: 'Jharkhand State Rural Infrastructure Department',
    type: 'govt',
    category_tags: ['infra', 'sanitation', 'water', 'health'],
    district: 'Ranchi',
  },
  {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'Ranchi Municipal Corporation Urban Governance',
    type: 'govt',
    category_tags: ['sanitation', 'water', 'infra', 'health'],
    district: 'Ranchi',
  },
  {
    id: '11111111-1111-4111-a111-111111111112',
    name: 'Dhanbad Municipal Corporation & Civic Works',
    type: 'govt',
    category_tags: ['water', 'sanitation', 'infra'],
    district: 'Dhanbad',
  },
];

const CITIZEN_ACCOUNTS = Array.from({ length: 10 }, (_, i) => ({
  email: `citizen${i + 1}@setulink.in`,
  password: 'Password123!',
  fullName: `Citizen User ${i + 1}`,
  role: 'citizen',
}));

const ADMIN_ACCOUNTS = [
  // 3 Gov Admins
  {
    email: 'gov.admin1@setulink.in',
    password: 'Password123!',
    fullName: 'Ranchi Municipal Corp Officer',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111111',
    entityType: 'govt',
  },
  {
    email: 'gov.admin2@setulink.in',
    password: 'Password123!',
    fullName: 'Rural Infra State Engineer',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111110',
    entityType: 'govt',
  },
  {
    email: 'gov.admin3@setulink.in',
    password: 'Password123!',
    fullName: 'Dhanbad Civic Works Superintendent',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111112',
    entityType: 'govt',
  },
  // 3 Uni Admins
  {
    email: 'uni.admin1@setulink.in',
    password: 'Password123!',
    fullName: 'Dr. Ananya Roy (BIT Mesra Hub)',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111101',
    entityType: 'university',
  },
  {
    email: 'uni.admin2@setulink.in',
    password: 'Password123!',
    fullName: 'Prof. Rajesh Kumar (IIT ISM Dhanbad)',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111102',
    entityType: 'university',
  },
  {
    email: 'uni.admin3@setulink.in',
    password: 'Password123!',
    fullName: 'Dr. Sunita Murmu (Birsa Agri Uni)',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111109',
    entityType: 'university',
  },
  // 3 Industry Admins
  {
    email: 'ind.admin1@setulink.in',
    password: 'Password123!',
    fullName: 'Tata Steel CSR Program Lead',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111103',
    entityType: 'industry',
  },
  {
    email: 'ind.admin2@setulink.in',
    password: 'Password123!',
    fullName: 'Bokaro Steel CSR Officer',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111104',
    entityType: 'industry',
  },
  {
    email: 'ind.admin3@setulink.in',
    password: 'Password123!',
    fullName: 'GreenAgro MSME Lead',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111105',
    entityType: 'industry',
  },
  // Previous demo accounts preserved for backwards compatibility
  {
    email: 'madura41mda@gmail.com',
    password: 'Password123!',
    fullName: 'BIT Sindri University Rep',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111101',
    entityType: 'university',
  },
  {
    email: 'madura.0741@gmail.com',
    password: 'Password123!',
    fullName: 'Tata Steel CSR Partner',
    role: 'org_rep',
    orgId: '11111111-1111-4111-a111-111111111103',
    entityType: 'industry',
  },
  {
    email: 'admin@setulink.in',
    password: 'Password123!',
    fullName: 'State Portal Administrator',
    role: 'admin',
    orgId: null,
    entityType: 'admin',
  },
];

const DISTRICTS = [
  { name: 'Ranchi', lat: 23.3441, lng: 85.3096, areas: ['Doranda', 'Kanke', 'Morabadi', 'Hatia', 'Ratu', 'Namkum', 'Bariatu', 'Argora'] },
  { name: 'Dhanbad', lat: 23.7957, lng: 86.4304, areas: ['Jharia', 'Katras', 'Saraidhela', 'Bank More', 'Govindpur', 'Sindri', 'Nirsa'] },
  { name: 'East Singhbhum', lat: 22.8046, lng: 86.2029, areas: ['Sakchi', 'Bistupur', 'Kadma', 'Sonari', 'Ghatshila', 'Mango', 'Telco'] },
  { name: 'Bokaro', lat: 23.6693, lng: 85.9812, areas: ['Chas', 'Sector 4', 'Sector 9', 'Bermo', 'Gomia', 'Chandrapura'] },
  { name: 'Hazaribagh', lat: 23.9981, lng: 85.3647, areas: ['Barhi', 'Katkamsandi', 'Pelawal', 'Mandu', 'Barkagaon'] },
  { name: 'Deoghar', lat: 24.4826, lng: 86.6994, areas: ['Madhupur', 'Jasidih', 'Castairs Town', 'Sarath', 'Kunda'] },
  { name: 'Giridih', lat: 24.1843, lng: 86.3039, areas: ['Bermo Border', 'Dumri', 'Tisri', 'Bagodar', 'Pachamba'] },
  { name: 'Ramgarh', lat: 23.6288, lng: 85.5152, areas: ['Patratu', 'Gola', 'Mandu Border', 'Chitarpur', 'Barkakana'] },
  { name: 'West Singhbhum', lat: 22.5539, lng: 85.8081, areas: ['Chaibasa', 'Chakradharpur', 'Noamundi', 'Kiriburu', 'Manoharpur'] },
];

const PROBLEM_TEMPLATES = [
  // Govt category (Infrastructure, Municipal, Water, Sanitation)
  {
    target: 'govt',
    category: 'water',
    title: 'Severe Drinking Water Pipeline Leakage & Low Pressure',
    desc: 'Main public distribution line damaged near residential colony. Water is leaking onto the road causing road collapse and leaving 300+ households without drinking water for 5 days.',
  },
  {
    target: 'govt',
    category: 'infra',
    title: 'Collapsed Culvert and Bridge Access Cut Off in Monsoon',
    desc: 'Connecting culvert bridge partially collapsed due to flash floods. Vehicles and school buses cannot pass. Immediate structural repair and safety barricading required.',
  },
  {
    target: 'govt',
    category: 'sanitation',
    title: 'Overflowing Open Drains and Garbage Dumping Hazard',
    desc: 'Municipal open drain completely choked with silt and plastic waste. Foul odor and severe risk of vector-borne epidemic like dengue in the dense market area.',
  },
  {
    target: 'govt',
    category: 'infra',
    title: 'Defective High-Tension Electrical Transformer Sparking',
    desc: 'Street distribution transformer continuously sparking near a primary school gate. Frequent voltage surges damaging household appliances.',
  },
  {
    target: 'govt',
    category: 'health',
    title: 'Sub-Health Center Lacks Cold Chain Vaccine Storage Unit',
    desc: 'Local Primary Health Center lacks reliable backup power and refrigeration for neonatal vaccines and anti-venom injections. Immediate government intervention needed.',
  },
  // University category (R&D, Technical Solutions, Prototypes, Agriculture Innovation)
  {
    target: 'university',
    category: 'water',
    title: 'High Fluoride & Heavy Metal Contamination in Borewells',
    desc: 'Groundwater laboratory tests show fluoride levels 3x safe limit causing dental and skeletal fluorosis among children. Need low-cost activated alumina filter designed by university engineering team.',
  },
  {
    target: 'university',
    category: 'agriculture',
    title: 'Post-Harvest Tomato & Vegetable Spoilage Solution Needed',
    desc: 'Local tribal farmers lose 40% of seasonal tomato yield due to lack of cold storage. Requesting University agricultural engineering team to build a low-cost solar-powered evaporative cooling chamber.',
  },
  {
    target: 'university',
    category: 'education',
    title: 'IoT-Based Solar Smart Classroom Toolkit for Rural Schools',
    desc: 'Remote government school lacks internet and reliable electricity. Requesting University CS & Electrical department to prototype a portable raspberry-pi micro-server offline learning system.',
  },
  {
    target: 'university',
    category: 'livelihood',
    title: 'Automation Design for Lac & Mahua Processing for Women SHGs',
    desc: 'Forest-dwelling women spend 8 hours daily manually scraping lac seeds. Need university mechanical students to design a low-power motorized sheller to quadruple output.',
  },
  {
    target: 'university',
    category: 'sanitation',
    title: 'Microbial Inoculant for Rapid Solid Waste Composting',
    desc: 'Vegetable market generates 2 tons of wet organic waste daily. University bio-engineering lab collaboration requested to formulate rapid bacterial culture for odorless municipal composting.',
  },
  // Industry / CSR category (Funding, Grants, Co-development, Medical equipment)
  {
    target: 'industry',
    category: 'health',
    title: 'Mobile Telemedicine & Diagnostics Van for Remote Mining Blocks',
    desc: 'Villagers must travel 45km over unpaved roads to reach basic healthcare. Requesting CSR foundation funding for a mobile medical van equipped with ECG, blood analyzer, and broadband teleconsultation.',
  },
  {
    target: 'industry',
    category: 'education',
    title: 'CSR Support for STEM Robotics Lab & Computer Center',
    desc: 'High school with 600 students from marginalized tribal communities needs corporate sponsorship for 20 refurbished laptops and basic STEM robotics kits.',
  },
  {
    target: 'industry',
    category: 'water',
    title: 'Solar Deep Borewell & Overhead Tank Installation Under CSR',
    desc: 'Drought-prone village has zero water sources in summer. Requesting mining/industrial CSR grant to drill a 400ft solar-powered borewell with a 10,000-liter community distribution tank.',
  },
  {
    target: 'industry',
    category: 'livelihood',
    title: 'Artisan Common Facility Center & Toolkits for Metal Craftsmen',
    desc: 'Traditional Dhokra brass metal artisans lack modern induction smelting furnaces and safety gear. Requesting MSME industrial partnership for common facility center equipment.',
  },
  {
    target: 'industry',
    category: 'agriculture',
    title: 'Solar Micro-Cold Storage Unit at Weekly Farmer Haat',
    desc: 'Weekly village market haat needs 5-metric-ton solar cold room grant from corporate CSR to help smallholder farmers store unsold perishable produce.',
  },
];

async function setupScaleCms() {
  console.log('🚀 Setting up 19 Multi-Role Accounts and 100 Civic Reports across Jharkhand...\n');

  // 1. Upsert Organizations
  console.log('1. Upserting 9 Core Organizations (Govt, Uni, CSR)...');
  for (const org of ORGANIZATIONS) {
    const { error } = await adminClient.from('organizations').upsert(org);
    if (error) console.error('Org error:', error.message);
  }
  console.log('✅ Organizations ready.\n');

  // 2. Create / Update Citizens
  console.log('2. Setting up 10 Citizen Accounts in live Supabase Auth...');
  const citizenUserIds = [];

  for (const citizen of CITIZEN_ACCOUNTS) {
    const { data: list } = await adminClient.auth.admin.listUsers();
    let existing = list?.users?.find((u) => u.email === citizen.email);

    if (!existing) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: citizen.email,
        password: citizen.password,
        email_confirm: true,
        user_metadata: { full_name: citizen.fullName },
      });
      if (error) {
        console.error(`Error creating ${citizen.email}:`, error.message);
        continue;
      }
      existing = data.user;
    } else {
      await adminClient.auth.admin.updateUserById(existing.id, {
        password: citizen.password,
        email_confirm: true,
        user_metadata: { full_name: citizen.fullName },
      });
    }

    citizenUserIds.push(existing.id);

    await adminClient.from('profiles').upsert({
      id: existing.id,
      full_name: citizen.fullName,
      role: 'citizen',
      verified: true,
      org_id: null,
    });
  }
  console.log(`✅ 10 Citizen accounts configured: citizen1@setulink.in ... citizen10@setulink.in\n`);

  // 3. Create / Update Admin Accounts
  console.log('3. Setting up 9 Admin Accounts (3 Gov, 3 Uni, 3 Industry, 1 State Admin)...');
  for (const admin of ADMIN_ACCOUNTS) {
    const { data: list } = await adminClient.auth.admin.listUsers();
    let existing = list?.users?.find((u) => u.email === admin.email);

    if (!existing) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true,
        user_metadata: { full_name: admin.fullName },
      });
      if (error) {
        console.error(`Error creating ${admin.email}:`, error.message);
        continue;
      }
      existing = data.user;
    } else {
      await adminClient.auth.admin.updateUserById(existing.id, {
        password: admin.password,
        email_confirm: true,
        user_metadata: { full_name: admin.fullName },
      });
    }

    await adminClient.from('profiles').upsert({
      id: existing.id,
      full_name: admin.fullName,
      role: admin.role,
      verified: true,
      org_id: admin.orgId,
    });
    console.log(`  └─ ${admin.email} (${admin.fullName}) -> Role: ${admin.role} [Entity: ${admin.entityType}]`);
  }
  console.log('✅ Admin accounts configured.\n');

  // 4. Generate 100 Realistic Reports across the 10 Citizens
  console.log('4. Generating and inserting 100 realistic civic reports across 3 Target Pools...');
  
  // Clean up any previous test issues if needed or insert fresh batch
  const issuesToInsert = [];
  const statusHistoryToInsert = [];

  const PHOTO_URLS = [
    'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
  ];

  for (let i = 1; i <= 100; i++) {
    const citizenIdx = (i - 1) % citizenUserIds.length;
    const reporterId = citizenUserIds[citizenIdx];
    const template = PROBLEM_TEMPLATES[(i - 1) % PROBLEM_TEMPLATES.length];
    const distInfo = DISTRICTS[(i - 1) % DISTRICTS.length];
    const area = distInfo.areas[(i - 1) % distInfo.areas.length];

    // Slight coordinate jitter within the district
    const lat = Number((distInfo.lat + (Math.random() - 0.5) * 0.08).toFixed(6));
    const lng = Number((distInfo.lng + (Math.random() - 0.5) * 0.08).toFixed(6));

    const targetLabel = template.target === 'govt' ? 'Government' : template.target === 'university' ? 'University' : 'Industry';
    const issueTitle = `[#${i}] ${template.title} (${area})`;
    const issueDesc = `[Target: ${targetLabel}]\n[Locality: ${area}, ${distInfo.name}]\n\n${template.desc}\n\nUrgent community intervention requested via SetuLink.`;
    const photoUrl = PHOTO_URLS[(i - 1) % PHOTO_URLS.length];
    const upvotes = Math.floor(Math.random() * 25) + 1;
    const priority = Number((50 + upvotes * 5 + Math.random() * 20).toFixed(1));

    const issueId = `33333333-3333-4333-b333-${String(i).padStart(12, '0')}`;

    issuesToInsert.push({
      id: issueId,
      title: issueTitle,
      description: issueDesc,
      category: template.category,
      district: distInfo.name,
      area: area,
      location: `POINT(${lng} ${lat})`,
      photo_url: photoUrl,
      status: 'reported',
      upvotes: upvotes,
      reporter_id: reporterId,
      submitter_type: i % 7 === 0 ? 'panchayat' : 'citizen',
      priority_score: priority,
      avg_severity_score: Number((3.0 + Math.random() * 1.8).toFixed(1)),
    });

    statusHistoryToInsert.push({
      issue_id: issueId,
      stage: 'reported',
      outcome_type: null,
      changed_by: reporterId,
      changed_at: new Date(Date.now() - (100 - i) * 3600 * 1000).toISOString(),
    });
  }

  // Insert in batches of 25
  for (let b = 0; b < issuesToInsert.length; b += 25) {
    const batch = issuesToInsert.slice(b, b + 25);
    const { error: batchErr } = await adminClient.from('issues').upsert(batch);
    if (batchErr) console.error('Batch issue error:', batchErr.message);
  }

  for (let b = 0; b < statusHistoryToInsert.length; b += 25) {
    const batch = statusHistoryToInsert.slice(b, b + 25);
    const { error: batchErr } = await adminClient.from('status_history').upsert(batch);
    if (batchErr) console.warn('Batch status history notice:', batchErr.message);
  }

  console.log(`✅ 100 reports created and distributed across Government, University, and Industry Universal Pools!`);
  
  console.log('\n======================================================');
  console.log('🎉 SETUP COMPLETE SUMMARY');
  console.log('======================================================');
  console.log('• 10 Citizen Accounts: citizen1@setulink.in ... citizen10@setulink.in (Password123!)');
  console.log('• 3 Government Admins: gov.admin1@setulink.in ... gov.admin3@setulink.in (Password123!)');
  console.log('• 3 University Admins: uni.admin1@setulink.in ... uni.admin3@setulink.in (Password123!)');
  console.log('• 3 Industry Admins: ind.admin1@setulink.in ... ind.admin3@setulink.in (Password123!)');
  console.log('• 100 Civic Reports seeded across Ranchi, Dhanbad, East Singhbhum, Bokaro, etc.');
  console.log('======================================================\n');
}

setupScaleCms();
