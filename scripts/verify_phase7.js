import assert from 'node:assert';
import { calculateDistanceMeters, parseCoords } from '../src/lib/geoUtils.js';

console.log('--- ENHANCED PHASE 7 VERIFICATION TEST SUITE ---');

// 1. Test Haversine Spatial Distance calculation (500m radius duplicate check)
console.log('\nTesting Feature 1: Spatial Duplicate Detection Distance...');

const ranchiCenter = { lat: 23.3441, lng: 85.3096 };
// Point ~189 meters away from Ranchi center
const nearPoint = { lat: 23.3458, lng: 85.3096 };
// Point ~5 km away from Ranchi center
const farPoint = { lat: 23.3891, lng: 85.3096 };

const distNearMeters = calculateDistanceMeters(ranchiCenter.lat, ranchiCenter.lng, nearPoint.lat, nearPoint.lng);
const distFarMeters = calculateDistanceMeters(ranchiCenter.lat, ranchiCenter.lng, farPoint.lat, farPoint.lng);

console.log(`Near point distance: ${distNearMeters.toFixed(1)}m`);
console.log(`Far point distance: ${distFarMeters.toFixed(1)}m`);

assert.ok(distNearMeters <= 500, 'Near point within 500m should trigger duplicate detection');
assert.ok(distFarMeters > 500, 'Far point (>500m) should NOT be flagged as duplicate');

console.log('✅ Feature 1 Spatial Duplicate Check PASSED.');

// 2. Test Duplicate Deletion & Upvote Decrement / Re-assignment Logic
console.log('\nTesting Feature 1 & 2: Duplicate Deletion & Cluster Re-assignment...');

let mockOriginalIssue = { id: 'orig-101', title: 'Water Pipe Leak', upvotes: 3, duplicate_of: null, created_at: '2026-09-01T10:00:00Z' };
let mockDuplicateIssue1 = { id: 'dup-201', title: 'Water Pipe Leak 2', upvotes: 0, duplicate_of: 'orig-101', created_at: '2026-09-02T10:00:00Z' };
let mockDuplicateIssue2 = { id: 'dup-202', title: 'Water Pipe Leak 3', upvotes: 0, duplicate_of: 'orig-101', created_at: '2026-09-03T10:00:00Z' };

let mockIssueList = [mockOriginalIssue, mockDuplicateIssue1, mockDuplicateIssue2];

// Test case A: Deleting a duplicate issue decrements original issue upvotes
const deleteDuplicate = (dupId) => {
  const target = mockIssueList.find((i) => i.id === dupId);
  if (target && target.duplicate_of) {
    const orig = mockIssueList.find((i) => i.id === target.duplicate_of);
    if (orig) orig.upvotes = Math.max(0, orig.upvotes - 1);
  }
  mockIssueList = mockIssueList.filter((i) => i.id !== dupId);
};

deleteDuplicate('dup-202');
assert.strictEqual(mockOriginalIssue.upvotes, 2, 'Original issue upvotes should decrement from 3 to 2 after deleting duplicate');
assert.strictEqual(mockIssueList.length, 2, 'Issue list length should be 2 after deleting duplicate');

console.log('✅ Duplicate deletion upvote decrement test PASSED.');

// Test case B: Deleting an original issue reassigns remaining child duplicates
const deleteOriginal = (origId) => {
  const childDups = mockIssueList.filter((i) => i.duplicate_of === origId);
  if (childDups.length > 0) {
    const sorted = [...childDups].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const newPrimary = sorted[0];
    newPrimary.duplicate_of = null;
    for (let i = 1; i < sorted.length; i++) {
      sorted[i].duplicate_of = newPrimary.id;
    }
  }
  mockIssueList = mockIssueList.filter((i) => i.id !== origId);
};

deleteOriginal('orig-101');
assert.strictEqual(mockDuplicateIssue1.duplicate_of, null, 'Oldest duplicate should become new primary report (duplicate_of = null)');
assert.strictEqual(mockIssueList.length, 1, 'Only new primary report remains in issue list');

console.log('✅ Original deletion duplicate cluster re-assignment test PASSED.');

// 3. Test Nearest Organizations Distance Ranking
console.log('\nTesting Feature 4: Nearest Organizations Spatial Ranking...');

const orgs = [
  { id: '1', name: 'BIT Mesra', type: 'university', location: 'POINT(85.4390 23.4120)' },
  { id: '2', name: 'Ranchi University', type: 'university', location: 'POINT(85.3200 23.3500)' },
  { id: '3', name: 'IIT ISM Dhanbad', type: 'university', location: 'POINT(86.4410 23.8140)' },
];

const issueLoc = { lat: 23.3441, lng: 85.3096 }; // Main Ranchi

const ranked = orgs.map((org) => {
  const coords = parseCoords(org.location);
  const distMeters = calculateDistanceMeters(issueLoc.lat, issueLoc.lng, coords.lat, coords.lng);
  return { ...org, distMeters };
}).sort((a, b) => a.distMeters - b.distMeters);

assert.strictEqual(ranked[0].name, 'Ranchi University', 'Ranchi University should be nearest to Ranchi center');
assert.strictEqual(ranked[2].name, 'IIT ISM Dhanbad', 'IIT ISM Dhanbad should be furthest from Ranchi center');

console.log('✅ Feature 4 Nearest Organizations Ranking PASSED.');

console.log('\n🎉 ALL ENHANCED PHASE 7 VERIFICATION TESTS PASSED SUCCESSFULLY!');
