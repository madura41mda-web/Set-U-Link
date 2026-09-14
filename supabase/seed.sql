-- Supabase Seed Data for SetuLink
-- Clear existing data (in reverse dependency order)
TRUNCATE TABLE public.comments CASCADE;
TRUNCATE TABLE public.matches CASCADE;
TRUNCATE TABLE public.status_history CASCADE;
TRUNCATE TABLE public.issues CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.organizations CASCADE;
DELETE FROM auth.users WHERE id IN (
  '22222222-2222-4222-a222-222222222201',
  '22222222-2222-4222-a222-222222222202',
  '22222222-2222-4222-a222-222222222203',
  '22222222-2222-4222-a222-222222222204',
  '22222222-2222-4222-a222-222222222205',
  '22222222-2222-4222-a222-222222222206',
  '22222222-2222-4222-a222-222222222207',
  '22222222-2222-4222-a222-222222222208',
  '22222222-2222-4222-a222-222222222209',
  '22222222-2222-4222-a222-222222222210'
);

-- 1. Insert Auth Users
INSERT INTO auth.users (id, email, created_at) VALUES
('22222222-2222-4222-a222-222222222201', 'admin@setulink.org', NOW() - INTERVAL '60 days'),
('22222222-2222-4222-a222-222222222202', 'ramesh.mahato@gmail.com', NOW() - INTERVAL '58 days'),
('22222222-2222-4222-a222-222222222203', 'anita.murmu@panchayat.in', NOW() - INTERVAL '55 days'),
('22222222-2222-4222-a222-222222222204', 'suresh.oraon@yahoo.com', NOW() - INTERVAL '50 days'),
('22222222-2222-4222-a222-222222222205', 'priya.kumari@ulb.jh.gov.in', NOW() - INTERVAL '45 days'),
('22222222-2222-4222-a222-222222222206', 'vikram.soren@rediffmail.com', NOW() - INTERVAL '40 days'),
('22222222-2222-4222-a222-222222222207', 'arisudan.singh@bitmesra.ac.in', NOW() - INTERVAL '59 days'),
('22222222-2222-4222-a222-222222222208', 'ravi.sharma@tatasteel.com', NOW() - INTERVAL '57 days'),
('22222222-2222-4222-a222-222222222209', 'sunita.hansda@greenagro.io', NOW() - INTERVAL '50 days'),
('22222222-2222-4222-a222-222222222210', 'amitabh.c@jharkhand.gov.in', NOW() - INTERVAL '52 days');

-- 2. Insert Organizations (~10 across all types and Jharkhand districts)
INSERT INTO public.organizations (id, name, type, category_tags, district, created_at) VALUES
('11111111-1111-4111-a111-111111111101', 'BIT Mesra Rural Technology Hub', 'university', ARRAY['infra', 'water', 'agriculture'], 'Ranchi', NOW() - INTERVAL '60 days'),
('11111111-1111-4111-a111-111111111102', 'IIT (ISM) Dhanbad Clean Energy & Water Cell', 'university', ARRAY['water', 'sanitation', 'infra'], 'Dhanbad', NOW() - INTERVAL '60 days'),
('11111111-1111-4111-a111-111111111103', 'Tata Steel Foundation CSR Initiative', 'csr', ARRAY['health', 'education', 'livelihood'], 'East Singhbhum', NOW() - INTERVAL '60 days'),
('11111111-1111-4111-a111-111111111104', 'Bokaro Steel City CSR Division', 'csr', ARRAY['education', 'health', 'infra'], 'Bokaro', NOW() - INTERVAL '60 days'),
('11111111-1111-4111-a111-111111111105', 'GreenAgro AgriTech Innovations', 'startup', ARRAY['agriculture', 'livelihood', 'water'], 'Hazaribagh', NOW() - INTERVAL '55 days'),
('11111111-1111-4111-a111-111111111106', 'Jharkhand CleanWater Solutions', 'startup', ARRAY['water', 'sanitation'], 'Deoghar', NOW() - INTERVAL '55 days'),
('11111111-1111-4111-a111-111111111107', 'Chhotanagpur Rural Artisans MSME Consortium', 'msme', ARRAY['livelihood', 'infra'], 'Giridih', NOW() - INTERVAL '50 days'),
('11111111-1111-4111-a111-111111111108', 'Damodar Basin Hydrological MSME', 'msme', ARRAY['water', 'infra'], 'Ramgarh', NOW() - INTERVAL '50 days'),
('11111111-1111-4111-a111-111111111109', 'Birsa Agricultural University Research Directorate', 'research_institution', ARRAY['agriculture', 'water', 'livelihood'], 'Ranchi', NOW() - INTERVAL '60 days'),
('11111111-1111-4111-a111-111111111110', 'Jharkhand State Rural Infrastructure Department', 'govt', ARRAY['infra', 'sanitation', 'water', 'health'], 'West Singhbhum', NOW() - INTERVAL '60 days');

-- 3. Insert Profiles
INSERT INTO public.profiles (id, full_name, role, org_id, created_at) VALUES
('22222222-2222-4222-a222-222222222201', 'SetuLink System Admin', 'admin', NULL, NOW() - INTERVAL '60 days'),
('22222222-2222-4222-a222-222222222202', 'Ramesh Mahato', 'citizen', NULL, NOW() - INTERVAL '58 days'),
('22222222-2222-4222-a222-222222222203', 'Anita Murmu', 'panchayat_rep', NULL, NOW() - INTERVAL '55 days'),
('22222222-2222-4222-a222-222222222204', 'Suresh Oraon', 'citizen', NULL, NOW() - INTERVAL '50 days'),
('22222222-2222-4222-a222-222222222205', 'Priya Kumari', 'ulb_rep', NULL, NOW() - INTERVAL '45 days'),
('22222222-2222-4222-a222-222222222206', 'Vikram Soren', 'citizen', NULL, NOW() - INTERVAL '40 days'),
('22222222-2222-4222-a222-222222222207', 'Dr. Arisudan Singh', 'org_rep', '11111111-1111-4111-a111-111111111101', NOW() - INTERVAL '59 days'),
('22222222-2222-4222-a222-222222222208', 'Ravi Sharma', 'org_rep', '11111111-1111-4111-a111-111111111103', NOW() - INTERVAL '57 days'),
('22222222-2222-4222-a222-222222222209', 'Sunita Hansda', 'org_rep', '11111111-1111-4111-a111-111111111105', NOW() - INTERVAL '50 days'),
('22222222-2222-4222-a222-222222222210', 'Amitabh Choudhary', 'org_rep', '11111111-1111-4111-a111-111111111110', NOW() - INTERVAL '52 days')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  org_id = EXCLUDED.org_id;

-- 4. Insert Issues (~40 realistic issues spread across districts and categories)
INSERT INTO public.issues (id, title, description, category, district, location, photo_url, status, upvotes, reporter_id, submitter_type, priority_score, created_at) VALUES
-- Reported status (14 issues)
('33333333-3333-4333-a333-333333333301', 'Severe Fluoride Contamination in Angara Borewells', 'Borewells in 3 hamlets contain fluoride above permissible limits causing bone fluorosis among children.', 'water', 'Ranchi', ST_SetSRID(ST_MakePoint(85.4521, 23.3892), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'reported', 42, '22222222-2222-4222-a222-222222222202', 'citizen', 68.5, NOW() - INTERVAL '5 days'),
('33333333-3333-4333-a333-333333333302', 'Primary School Lacks Sanitation and Drinking Water', 'Govt school with 180 students lacks separate toilets for girls and has no running water source.', 'education', 'Dhanbad', ST_SetSRID(ST_MakePoint(86.4211, 23.8105), 4326)::geography, 'https://images.unsplash.com/photo-1580582932707-520aed937b7b', 'reported', 88, '22222222-2222-4222-a222-222222222203', 'panchayat', 82.0, NOW() - INTERVAL '12 days'),
('33333333-3333-4333-a333-333333333303', 'Lack of Cold Storage for Tomato Farmers in Ormanjhi', 'Over 40 tons of seasonal tomato crop rots annually due to absence of solar-powered cold storage micro-units.', 'agriculture', 'Ranchi', ST_SetSRID(ST_MakePoint(85.4851, 23.4912), 4326)::geography, 'https://images.unsplash.com/photo-1595855759920-86582396756a', 'reported', 115, '22222222-2222-4222-a222-222222222204', 'citizen', 85.0, NOW() - INTERVAL '8 days'),
('33333333-3333-4333-a333-333333333304', 'Broken Culvert Isolating Ghatshila Tribal Villages', 'Monsoon stream overflow broke culvert connecting 4 tribal hamlets to hospital and secondary school.', 'infra', 'East Singhbhum', ST_SetSRID(ST_MakePoint(86.4802, 22.5811), 4326)::geography, 'https://images.unsplash.com/photo-1517649763962-0c623266010b', 'reported', 64, '22222222-2222-4222-a222-222222222203', 'panchayat', 74.0, NOW() - INTERVAL '15 days'),
('33333333-3333-4333-a333-333333333305', 'Absence of Primary Health Center Cold Chain for Vaccines', 'Sub-center near Bermo lacks solar refrigeration causing vaccine wastage during regular power cuts.', 'health', 'Bokaro', ST_SetSRID(ST_MakePoint(85.9405, 23.7745), 4326)::geography, 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982', 'reported', 92, '22222222-2222-4222-a222-222222222205', 'ulb', 89.0, NOW() - INTERVAL '18 days'),
('33333333-3333-4333-a333-333333333306', 'High Arsenic Content in Handpump Water near Chas', 'Water test kits show elevated arsenic levels in 8 community handpumps.', 'water', 'Bokaro', ST_SetSRID(ST_MakePoint(86.0125, 23.6301), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'reported', 53, '22222222-2222-4222-a222-222222222206', 'citizen', 71.0, NOW() - INTERVAL '2 days'),
('33333333-3333-4333-a333-333333333307', 'Soil Erosion Degrading Paddy Fields in Ichak Block', 'Uncontrolled rainwater runoff eroding topsoil across 120 acres of fertile rainfed land.', 'agriculture', 'Hazaribagh', ST_SetSRID(ST_MakePoint(85.4215, 24.1102), 4326)::geography, 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854', 'reported', 37, '22222222-2222-4222-a222-222222222202', 'citizen', 59.0, NOW() - INTERVAL '4 days'),
('33333333-3333-4333-a333-333333333308', 'Lack of Silk Weaving Yarn Processing Machinery', 'Tussar silk weavers in Dumri block struggle with manual yarn reeling resulting in low income.', 'livelihood', 'Giridih', ST_SetSRID(ST_MakePoint(86.0501, 24.0305), 4326)::geography, 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17', 'reported', 78, '22222222-2222-4222-a222-222222222204', 'citizen', 77.5, NOW() - INTERVAL '9 days'),
('33333333-3333-4333-a333-333333333309', 'Open Waste Dumping near Pilgrimage Corridor', 'Solid waste accumulation causing groundwater leaching near temple entry zone.', 'sanitation', 'Deoghar', ST_SetSRID(ST_MakePoint(86.6912, 24.4891), 4326)::geography, 'https://images.unsplash.com/photo-1530587191325-3db32d826c18', 'reported', 104, '22222222-2222-4222-a222-222222222205', 'ulb', 83.0, NOW() - INTERVAL '14 days'),
('33333333-3333-4333-a333-333333333310', 'Frequent Coal Dust Air Pollution in Jharia Market', 'Uncovered coal transport trucks causing respiratory illness among local residents and shopkeepers.', 'health', 'Dhanbad', ST_SetSRID(ST_MakePoint(86.4150, 23.7420), 4326)::geography, 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982', 'reported', 140, '22222222-2222-4222-a222-222222222206', 'citizen', 91.0, NOW() - INTERVAL '20 days'),
('33333333-3333-4333-a333-333333333311', 'Non-functional Solar Mini-grid in Mandar Block', 'Battery failure left 60 households without electricity for community lighting and study centers.', 'infra', 'Ranchi', ST_SetSRID(ST_MakePoint(85.0890, 23.4560), 4326)::geography, 'https://images.unsplash.com/photo-1509391365360-2e959784a276', 'reported', 49, '22222222-2222-4222-a222-222222222202', 'citizen', 62.0, NOW() - INTERVAL '10 days'),
('33333333-3333-4333-a333-333333333312', 'Pond Siltation Reducing Fish Farming Yield in Patratu', 'Heavy silt influx from unlined drains reduced water depth by 60% in community aquaculture pond.', 'livelihood', 'Ramgarh', ST_SetSRID(ST_MakePoint(85.2910, 23.6380), 4326)::geography, 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854', 'reported', 31, '22222222-2222-4222-a222-222222222204', 'citizen', 54.0, NOW() - INTERVAL '3 days'),
('33333333-3333-4333-a333-333333333313', 'Lack of STEM Lab Equipment in Kasturba Gandhi Balika Vidyalaya', 'Residential girls school needs basic lab instruments and computer stations for 250 tribal students.', 'education', 'West Singhbhum', ST_SetSRID(ST_MakePoint(85.8120, 22.5610), 4326)::geography, 'https://images.unsplash.com/photo-1580582932707-520aed937b7b', 'reported', 86, '22222222-2222-4222-a222-222222222203', 'panchayat', 80.0, NOW() - INTERVAL '11 days'),
('33333333-3333-4333-a333-333333333314', 'Untreated Effluent Discharge into Subarnarekha River tributary', 'Small-scale industrial washings polluting river stretch used for domestic cattle water.', 'water', 'East Singhbhum', ST_SetSRID(ST_MakePoint(86.2250, 22.7890), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'reported', 110, '22222222-2222-4222-a222-222222222205', 'ulb', 87.0, NOW() - INTERVAL '17 days'),

-- Validated status (10 issues)
('33333333-3333-4333-a333-333333333315', 'Iron Contamination in Drinking Water of Namkum Panchayat', 'High iron concentration (>3mg/L) rendering water unpalatable and damaging domestic pipes.', 'water', 'Ranchi', ST_SetSRID(ST_MakePoint(85.3850, 23.3280), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'validated', 165, '22222222-2222-4222-a222-222222222203', 'panchayat', 88.0, NOW() - INTERVAL '25 days'),
('33333333-3333-4333-a333-333333333316', 'Low Agricultural Yield Due to Soil Acidity in Katkamsandi', 'Soil pH of 4.8 restricting mustard and pulse production across 8 village clusters.', 'agriculture', 'Hazaribagh', ST_SetSRID(ST_MakePoint(85.2750, 24.0890), 4326)::geography, 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854', 'validated', 128, '22222222-2222-4222-a222-222222222204', 'citizen', 84.5, NOW() - INTERVAL '28 days'),
('33333333-3333-4333-a333-333333333317', 'Unsanitary Waste Disposal near Potka Community Health Center', 'Medical solid waste accumulating in open pits near outpatient department.', 'sanitation', 'East Singhbhum', ST_SetSRID(ST_MakePoint(86.2110, 22.6180), 4326)::geography, 'https://images.unsplash.com/photo-1530587191325-3db32d826c18', 'validated', 142, '22222222-2222-4222-a222-222222222205', 'ulb', 90.0, NOW() - INTERVAL '30 days'),
('33333333-3333-4333-a333-333333333318', 'High Maternal Anemia Rates in Rural Khuntpani Villages', 'Over 65% of pregnant women report severe iron deficiency due to lack of fortified food access.', 'health', 'West Singhbhum', ST_SetSRID(ST_MakePoint(85.7320, 22.6010), 4326)::geography, 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982', 'validated', 195, '22222222-2222-4222-a222-222222222203', 'panchayat', 93.0, NOW() - INTERVAL '32 days'),
('33333333-3333-4333-a333-333333333319', 'Lack of Digital Smart Classrooms in Chas Govt High School', 'Students lack exposure to digital curriculum and basic computer literacy tools.', 'education', 'Bokaro', ST_SetSRID(ST_MakePoint(86.0230, 23.6410), 4326)::geography, 'https://images.unsplash.com/photo-1580582932707-520aed937b7b', 'validated', 98, '22222222-2222-4222-a222-222222222202', 'citizen', 76.0, NOW() - INTERVAL '22 days'),
('33333333-3333-4333-a333-333333333320', 'Groundwater Depletion in Nirsa Mining Belt', 'Drying wells affecting drinking water supply for 12,000 mine workers and families.', 'water', 'Dhanbad', ST_SetSRID(ST_MakePoint(86.7110, 23.7850), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'validated', 178, '22222222-2222-4222-a222-222222222206', 'citizen', 91.5, NOW() - INTERVAL '35 days'),
('33333333-3333-4333-a333-333333333321', 'Lack of Storage Facilities for Bamboo Artisans in Madhupur', 'Traditional bamboo craft producers lose materials due to moisture damage in monsoon.', 'livelihood', 'Deoghar', ST_SetSRID(ST_MakePoint(86.6450, 24.2580), 4326)::geography, 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17', 'validated', 84, '22222222-2222-4222-a222-222222222204', 'citizen', 72.0, NOW() - INTERVAL '26 days'),
('33333333-3333-4333-a333-333333333322', 'Lack of Solar Powered Irrigation Pumps in Gola Block', 'Small farmers dependent on expensive diesel pumps for winter vegetable crops.', 'agriculture', 'Ramgarh', ST_SetSRID(ST_MakePoint(85.7120, 23.5510), 4326)::geography, 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854', 'validated', 112, '22222222-2222-4222-a222-222222222203', 'panchayat', 81.0, NOW() - INTERVAL '27 days'),
('33333333-3333-4333-a333-333333333323', 'Unpaved Access Road Blocking Ambulance Service in Tisri', 'Hilly terrain road washed out, preventing healthcare vehicle access to 5 tribal hamlets.', 'infra', 'Giridih', ST_SetSRID(ST_MakePoint(86.0610, 24.5710), 4326)::geography, 'https://images.unsplash.com/photo-1517649763962-0c623266010b', 'validated', 156, '22222222-2222-4222-a222-222222222206', 'citizen', 87.5, NOW() - INTERVAL '38 days'),
('33333333-3333-4333-a333-333333333324', 'Open Drainage Overflows in Urban Slums of Adityapur', 'Blocked storm drains causing stagnant water breeding mosquitoes and disease.', 'sanitation', 'East Singhbhum', ST_SetSRID(ST_MakePoint(86.1680, 22.7850), 4326)::geography, 'https://images.unsplash.com/photo-1530587191325-3db32d826c18', 'validated', 130, '22222222-2222-4222-a222-222222222205', 'ulb', 85.0, NOW() - INTERVAL '29 days'),

-- Matched status (6 issues)
('33333333-3333-4333-a333-333333333325', 'Modular Community Water Filtration Unit Needed for Kanke', 'Community seeking low-cost terracotta and biochar water filter setup for 300 households.', 'water', 'Ranchi', ST_SetSRID(ST_MakePoint(85.3210, 23.4320), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'matched', 210, '22222222-2222-4222-a222-222222222203', 'panchayat', 94.0, NOW() - INTERVAL '40 days'),
('33333333-3333-4333-a333-333333333326', 'Solar Micro-Grids for Remote Tribal Schools in West Singhbhum', 'Providing uninterrupted power for lighting and digital learning tools.', 'education', 'West Singhbhum', ST_SetSRID(ST_MakePoint(85.7950, 22.5210), 4326)::geography, 'https://images.unsplash.com/photo-1509391365360-2e959784a276', 'matched', 188, '22222222-2222-4222-a222-222222222203', 'panchayat', 92.0, NOW() - INTERVAL '42 days'),
('33333333-3333-4333-a333-333333333327', 'Bio-degradable Solid Waste Processing Micro-Plant in Deoghar', 'Designing decentralized composting units for temple flower and organic waste.', 'sanitation', 'Deoghar', ST_SetSRID(ST_MakePoint(86.7010, 24.4750), 4326)::geography, 'https://images.unsplash.com/photo-1530587191325-3db32d826c18', 'matched', 175, '22222222-2222-4222-a222-222222222205', 'ulb', 89.5, NOW() - INTERVAL '44 days'),
('33333333-3333-4333-a333-333333333328', 'Drip Irrigation Automation for Smallholder Farmers in Hazaribagh', 'Deploying low-cost IoT sensor-based drip irrigation kits for vegetable crops.', 'agriculture', 'Hazaribagh', ST_SetSRID(ST_MakePoint(85.3780, 23.9850), 4326)::geography, 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854', 'matched', 160, '22222222-2222-4222-a222-222222222204', 'citizen', 88.0, NOW() - INTERVAL '41 days'),
('33333333-3333-4333-a333-333333333329', 'Acid Mine Drainage Water Treatment Pilot in Dhanbad', 'Treating abandoned coal mine pit water for non-potable agricultural usage.', 'water', 'Dhanbad', ST_SetSRID(ST_MakePoint(86.4350, 23.7910), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'matched', 230, '22222222-2222-4222-a222-222222222206', 'citizen', 96.0, NOW() - INTERVAL '45 days'),
('33333333-3333-4333-a333-333333333330', 'Mechanized Lac Processing Units for Women SHGs in Khunti border', 'Installing motor-driven lac scraping machines to boost productivity and safety.', 'livelihood', 'Ranchi', ST_SetSRID(ST_MakePoint(85.2810, 23.2100), 4326)::geography, 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17', 'matched', 145, '22222222-2222-4222-a222-222222222202', 'citizen', 86.0, NOW() - INTERVAL '39 days'),

-- Sanctioned status (4 issues)
('33333333-3333-4333-a333-333333333331', 'Mobile Health Van for Remote Tribal Blocks in East Singhbhum', 'Sanctioned CSR mobile medical unit with diagnostic tools and tele-consultation.', 'health', 'East Singhbhum', ST_SetSRID(ST_MakePoint(86.2510, 22.7120), 4326)::geography, 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982', 'sanctioned', 240, '22222222-2222-4222-a222-222222222205', 'ulb', 97.0, NOW() - INTERVAL '48 days'),
('33333333-3333-4333-a333-333333333332', 'Rainwater Harvesting Structures for Bokaro Schools', 'Rooftop rainwater harvesting tanks approved for 15 govt schools in Chandrapura block.', 'water', 'Bokaro', ST_SetSRID(ST_MakePoint(86.1210, 23.7510), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'sanctioned', 190, '22222222-2222-4222-a222-222222222203', 'panchayat', 91.0, NOW() - INTERVAL '50 days'),
('33333333-3333-4333-a333-333333333333', 'Solar Cold Room Installation in Ramgarh Mandi', 'Govt approved 10 MT solar-powered cold storage micro-facility for vegetable farmers.', 'agriculture', 'Ramgarh', ST_SetSRID(ST_MakePoint(85.5210, 23.6310), 4326)::geography, 'https://images.unsplash.com/photo-1595855759920-86582396756a', 'sanctioned', 172, '22222222-2222-4222-a222-222222222204', 'citizen', 89.0, NOW() - INTERVAL '49 days'),
('33333333-3333-4333-a333-333333333334', 'Community Eco-Sanitation Toilets in Giridih Villages', 'Sanctioned dry twin-pit urine-diverting eco-san toilets for 80 households.', 'sanitation', 'Giridih', ST_SetSRID(ST_MakePoint(86.3120, 24.1950), 4326)::geography, 'https://images.unsplash.com/photo-1530587191325-3db32d826c18', 'sanctioned', 158, '22222222-2222-4222-a222-222222222203', 'panchayat', 87.0, NOW() - INTERVAL '51 days'),

-- In Progress status (3 issues)
('33333333-3333-4333-a333-333333333335', 'Fluoride-Removal Water Treatment Plant in Angara', 'Construction of 5000 LPD community fluoride filter plant actively ongoing.', 'water', 'Ranchi', ST_SetSRID(ST_MakePoint(85.4550, 23.3910), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'in_progress', 225, '22222222-2222-4222-a222-222222222202', 'citizen', 95.0, NOW() - INTERVAL '53 days'),
('33333333-3333-4333-a333-333333333336', 'Smart Soil Testing Mobile Vans in Hazaribagh', 'Pilot testing real-time NPK soil testing kits with local farmer producer organizations.', 'agriculture', 'Hazaribagh', ST_SetSRID(ST_MakePoint(85.3650, 24.0010), 4326)::geography, 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854', 'in_progress', 198, '22222222-2222-4222-a222-222222222204', 'citizen', 92.5, NOW() - INTERVAL '54 days'),
('33333333-3333-4333-a333-333333333337', 'Vocational Skill Development Center for Tribal Youth in Chaibasa', 'Setting up computer hardware and electrical repair training lab.', 'livelihood', 'West Singhbhum', ST_SetSRID(ST_MakePoint(85.8050, 22.5510), 4326)::geography, 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17', 'in_progress', 182, '22222222-2222-4222-a222-222222222203', 'panchayat', 90.5, NOW() - INTERVAL '55 days'),

-- Resolved status (3 issues)
('33333333-3333-4333-a333-333333333338', 'Solar Powered Drinking Water Kiosk at Deoghar Railway Hub', 'Installed 1000 LPD solar powered RO kiosk serving 4000 pilgrims daily.', 'water', 'Deoghar', ST_SetSRID(ST_MakePoint(86.6980, 24.4810), 4326)::geography, 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3', 'resolved', 280, '22222222-2222-4222-a222-222222222205', 'ulb', 99.0, NOW() - INTERVAL '58 days'),
('33333333-3333-4333-a333-333333333339', 'Low-Cost Sanitary Napkin Manufacturing Unit in Jamshedpur Rural', 'Established SHG-run biodegradable sanitary napkin production unit.', 'health', 'East Singhbhum', ST_SetSRID(ST_MakePoint(86.2050, 22.8010), 4326)::geography, 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982', 'resolved', 265, '22222222-2222-4222-a222-222222222203', 'panchayat', 98.0, NOW() - INTERVAL '59 days'),
('33333333-3333-4333-a333-333333333340', 'Digital Literacy Labs in 5 High Schools of Dhanbad Mining Belt', 'Completed installation of 50 refurbished PCs with offline digital learning modules.', 'education', 'Dhanbad', ST_SetSRID(ST_MakePoint(86.4310, 23.7990), 4326)::geography, 'https://images.unsplash.com/photo-1580582932707-520aed937b7b', 'resolved', 250, '22222222-2222-4222-a222-222222222206', 'citizen', 96.5, NOW() - INTERVAL '60 days');

-- 5. Insert Status History rows matching current status of each issue
INSERT INTO public.status_history (id, issue_id, stage, outcome_type, changed_by, changed_at) VALUES
-- Reported issues history
('44444444-4444-4444-a444-444444444401', '33333333-3333-4333-a333-333333333301', 'reported', NULL, '22222222-2222-4222-a222-222222222202', NOW() - INTERVAL '5 days'),
('44444444-4444-4444-a444-444444444402', '33333333-3333-4333-a333-333333333302', 'reported', NULL, '22222222-2222-4222-a222-222222222203', NOW() - INTERVAL '12 days'),
('44444444-4444-4444-a444-444444444403', '33333333-3333-4333-a333-333333333303', 'reported', NULL, '22222222-2222-4222-a222-222222222204', NOW() - INTERVAL '8 days'),
('44444444-4444-4444-a444-444444444404', '33333333-3333-4333-a333-333333333304', 'reported', NULL, '22222222-2222-4222-a222-222222222203', NOW() - INTERVAL '15 days'),
('44444444-4444-4444-a444-444444444405', '33333333-3333-4333-a333-333333333305', 'reported', NULL, '22222222-2222-4222-a222-222222222205', NOW() - INTERVAL '18 days'),
('44444444-4444-4444-a444-444444444406', '33333333-3333-4333-a333-333333333306', 'reported', NULL, '22222222-2222-4222-a222-222222222206', NOW() - INTERVAL '2 days'),
('44444444-4444-4444-a444-444444444407', '33333333-3333-4333-a333-333333333307', 'reported', NULL, '22222222-2222-4222-a222-222222222202', NOW() - INTERVAL '4 days'),
('44444444-4444-4444-a444-444444444408', '33333333-3333-4333-a333-333333333308', 'reported', NULL, '22222222-2222-4222-a222-222222222204', NOW() - INTERVAL '9 days'),
('44444444-4444-4444-a444-444444444409', '33333333-3333-4333-a333-333333333309', 'reported', NULL, '22222222-2222-4222-a222-222222222205', NOW() - INTERVAL '14 days'),
('44444444-4444-4444-a444-444444444410', '33333333-3333-4333-a333-333333333310', 'reported', NULL, '22222222-2222-4222-a222-222222222206', NOW() - INTERVAL '20 days'),
('44444444-4444-4444-a444-444444444411', '33333333-3333-4333-a333-333333333311', 'reported', NULL, '22222222-2222-4222-a222-222222222202', NOW() - INTERVAL '10 days'),
('44444444-4444-4444-a444-444444444412', '33333333-3333-4333-a333-333333333312', 'reported', NULL, '22222222-2222-4222-a222-222222222204', NOW() - INTERVAL '3 days'),
('44444444-4444-4444-a444-444444444413', '33333333-3333-4333-a333-333333333313', 'reported', NULL, '22222222-2222-4222-a222-222222222203', NOW() - INTERVAL '11 days'),
('44444444-4444-4444-a444-444444444414', '33333333-3333-4333-a333-333333333314', 'reported', NULL, '22222222-2222-4222-a222-222222222205', NOW() - INTERVAL '17 days'),

-- Validated issues history
('44444444-4444-4444-a444-444444444415', '33333333-3333-4333-a333-333333333315', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '20 days'),
('44444444-4444-4444-a444-444444444416', '33333333-3333-4333-a333-333333333316', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '22 days'),
('44444444-4444-4444-a444-444444444417', '33333333-3333-4333-a333-333333333317', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '24 days'),
('44444444-4444-4444-a444-444444444418', '33333333-3333-4333-a333-333333333318', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '25 days'),
('44444444-4444-4444-a444-444444444419', '33333333-3333-4333-a333-333333333319', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '18 days'),
('44444444-4444-4444-a444-444444444420', '33333333-3333-4333-a333-333333333320', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '28 days'),
('44444444-4444-4444-a444-444444444421', '33333333-3333-4333-a333-333333333321', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '20 days'),
('44444444-4444-4444-a444-444444444422', '33333333-3333-4333-a333-333333333322', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '21 days'),
('44444444-4444-4444-a444-444444444423', '33333333-3333-4333-a333-333333333323', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '30 days'),
('44444444-4444-4444-a444-444444444424', '33333333-3333-4333-a333-333333333324', 'validated', NULL, '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '22 days'),

-- Matched issues history
('44444444-4444-4444-a444-444444444425', '33333333-3333-4333-a333-333333333325', 'matched', 'research_output', '22222222-2222-4222-a222-222222222207', NOW() - INTERVAL '30 days'),
('44444444-4444-4444-a444-444444444426', '33333333-3333-4333-a333-333333333326', 'matched', 'pilot_test', '22222222-2222-4222-a222-222222222210', NOW() - INTERVAL '32 days'),
('44444444-4444-4444-a444-444444444427', '33333333-3333-4333-a333-333333333327', 'matched', 'pilot_test', '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '35 days'),
('44444444-4444-4444-a444-444444444428', '33333333-3333-4333-a333-333333333328', 'matched', 'pilot_test', '22222222-2222-4222-a222-222222222209', NOW() - INTERVAL '31 days'),
('44444444-4444-4444-a444-444444444429', '33333333-3333-4333-a333-333333333329', 'matched', 'research_output', '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '34 days'),
('44444444-4444-4444-a444-444444444430', '33333333-3333-4333-a333-333333333330', 'matched', 'policy_change', '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '29 days'),

-- Sanctioned issues history
('44444444-4444-4444-a444-444444444431', '33333333-3333-4333-a333-333333333331', 'sanctioned', 'deployed_solution', '22222222-2222-4222-a222-222222222208', NOW() - INTERVAL '38 days'),
('44444444-4444-4444-a444-444444444432', '33333333-3333-4333-a333-333333333332', 'sanctioned', 'pilot_test', '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '40 days'),
('44444444-4444-4444-a444-444444444433', '33333333-3333-4333-a333-333333333333', 'sanctioned', 'deployed_solution', '22222222-2222-4222-a222-222222222210', NOW() - INTERVAL '41 days'),
('44444444-4444-4444-a444-444444444434', '33333333-3333-4333-a333-333333333334', 'sanctioned', 'policy_change', '22222222-2222-4222-a222-222222222210', NOW() - INTERVAL '42 days'),

-- In Progress issues history
('44444444-4444-4444-a444-444444444435', '33333333-3333-4333-a333-333333333335', 'in_progress', 'deployed_solution', '22222222-2222-4222-a222-222222222207', NOW() - INTERVAL '45 days'),
('44444444-4444-4444-a444-444444444436', '33333333-3333-4333-a333-333333333336', 'in_progress', 'pilot_test', '22222222-2222-4222-a222-222222222209', NOW() - INTERVAL '46 days'),
('44444444-4444-4444-a444-444444444437', '33333333-3333-4333-a333-333333333337', 'in_progress', 'deployed_solution', '22222222-2222-4222-a222-222222222210', NOW() - INTERVAL '47 days'),

-- Resolved issues history
('44444444-4444-4444-a444-444444444438', '33333333-3333-4333-a333-333333333338', 'resolved', 'deployed_solution', '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '50 days'),
('44444444-4444-4444-a444-444444444439', '33333333-3333-4333-a333-333333333339', 'resolved', 'deployed_solution', '22222222-2222-4222-a222-222222222208', NOW() - INTERVAL '51 days'),
('44444444-4444-4444-a444-444444444440', '33333333-3333-4333-a333-333333333340', 'resolved', 'deployed_solution', '22222222-2222-4222-a222-222222222201', NOW() - INTERVAL '52 days');

-- 6. Insert Matches linking matched+ issues to organizations with overlapping tags/districts
INSERT INTO public.matches (id, issue_id, org_id, role, matched_at) VALUES
-- Issue 25 (Water in Kanke/Ranchi) -> BIT Mesra University
('55555555-5555-5555-a555-555555555501', '33333333-3333-4333-a333-333333333325', '11111111-1111-4111-a111-111111111101', 'university', NOW() - INTERVAL '30 days'),
-- Issue 26 (Education solar in W.Singhbhum) -> Govt Rural Dev
('55555555-5555-5555-a555-555555555502', '33333333-3333-4333-a333-333333333326', '11111111-1111-4111-a111-111111111110', 'govt', NOW() - INTERVAL '32 days'),
-- Issue 27 (Sanitation in Deoghar) -> Jharkhand CleanWater Startup
('55555555-5555-5555-a555-555555555503', '33333333-3333-4333-a333-333333333327', '11111111-1111-4111-a111-111111111106', 'industry', NOW() - INTERVAL '35 days'),
-- Issue 28 (Agri drip irrigation Hazaribagh) -> GreenAgro Startup
('55555555-5555-5555-a555-555555555504', '33333333-3333-4333-a333-333333333328', '11111111-1111-4111-a111-111111111105', 'industry', NOW() - INTERVAL '31 days'),
-- Issue 29 (Acid Mine Water Dhanbad) -> IIT ISM Dhanbad
('55555555-5555-5555-a555-555555555505', '33333333-3333-4333-a333-333333333329', '11111111-1111-4111-a111-111111111102', 'university', NOW() - INTERVAL '34 days'),
-- Issue 30 (Lac processing Ranchi) -> Birsa Agri Univ Research
('55555555-5555-5555-a555-555555555506', '33333333-3333-4333-a333-333333333330', '11111111-1111-4111-a111-111111111109', 'university', NOW() - INTERVAL '29 days'),
-- Issue 31 (Mobile Health Van E.Singhbhum) -> Tata Steel Foundation CSR
('55555555-5555-5555-a555-555555555507', '33333333-3333-4333-a333-333333333331', '11111111-1111-4111-a111-111111111103', 'industry', NOW() - INTERVAL '38 days'),
-- Issue 32 (Rainwater harvesting Bokaro) -> Bokaro Steel CSR
('55555555-5555-5555-a555-555555555508', '33333333-3333-4333-a333-333333333332', '11111111-1111-4111-a111-111111111104', 'industry', NOW() - INTERVAL '40 days'),
-- Issue 33 (Solar Cold room Ramgarh) -> Damodar Basin Water Works MSME
('55555555-5555-5555-a555-555555555509', '33333333-3333-4333-a333-333333333333', '11111111-1111-4111-a111-111111111108', 'industry', NOW() - INTERVAL '41 days'),
-- Issue 35 (Fluoride plant Angara Ranchi) -> BIT Mesra
('55555555-5555-5555-a555-555555555510', '33333333-3333-4333-a333-333333333335', '11111111-1111-4111-a111-111111111101', 'university', NOW() - INTERVAL '45 days'),
-- Issue 39 (Sanitary napkin Jamshedpur) -> Tata Steel CSR
('55555555-5555-5555-a555-555555555511', '33333333-3333-4333-a333-333333333339', '11111111-1111-4111-a111-111111111103', 'industry', NOW() - INTERVAL '51 days');

-- 7. Insert Comments
INSERT INTO public.comments (id, issue_id, author_id, body, created_at) VALUES
('66666666-6666-6666-a666-666666666601', '33333333-3333-4333-a333-333333333301', '22222222-2222-4222-a222-222222222207', 'BIT Mesra water lab can perform detailed spectrometry tests on samples from these 3 hamlets next week.', NOW() - INTERVAL '4 days'),
('66666666-6666-6666-a666-666666666602', '33333333-3333-4333-a333-333333333301', '22222222-2222-4222-a222-222222222202', 'Thank you Dr. Singh, we have collected 5 water samples ready for testing.', NOW() - INTERVAL '3 days'),
('66666666-6666-6666-a666-666666666603', '33333333-3333-4333-a333-333333333303', '22222222-2222-4222-a222-222222222209', 'GreenAgro can deploy 2 units of 5MT portable solar cold storage as a pilot test.', NOW() - INTERVAL '6 days'),
('66666666-6666-6666-a666-666666666604', '33333333-3333-4333-a333-333333333325', '22222222-2222-4222-a222-222222222207', 'Terracotta filter design approved by technical committee. Prototype deployment starting.', NOW() - INTERVAL '25 days'),
('66666666-6666-6666-a666-666666666605', '33333333-3333-4333-a333-333333333331', '22222222-2222-4222-a222-222222222208', 'Tata Steel Foundation mobile health van scheduled for rollout starting next Monday.', NOW() - INTERVAL '35 days'),
('66666666-6666-6666-a666-666666666606', '33333333-3333-4333-a333-333333333338', '22222222-2222-4222-a222-222222222205', 'RO Water kiosk is fully operational now and benefiting thousands of daily visitors.', NOW() - INTERVAL '48 days');
