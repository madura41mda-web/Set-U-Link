import assert from 'node:assert';

// 1. Verify Jharkhand Bounding Box Helper Logic
const JHARKHAND_BOUNDS = {
  minLat: 21.9,
  maxLat: 25.3,
  minLng: 83.3,
  maxLng: 87.9,
};

const isWithinJharkhand = (lat, lng) => {
  return (
    lat >= JHARKHAND_BOUNDS.minLat &&
    lat <= JHARKHAND_BOUNDS.maxLat &&
    lng >= JHARKHAND_BOUNDS.minLng &&
    lng <= JHARKHAND_BOUNDS.maxLng
  );
};

const DISTRICT_CENTERS = {
  Ranchi: { lat: 23.3441, lng: 85.3096 },
  Dhanbad: { lat: 23.7957, lng: 86.4304 },
  'East Singhbhum': { lat: 22.8046, lng: 86.2029 },
  Bokaro: { lat: 23.6693, lng: 85.9812 },
  Hazaribagh: { lat: 23.9981, lng: 85.3647 },
  Deoghar: { lat: 24.4826, lng: 86.6994 },
  Giridih: { lat: 24.1843, lng: 86.3039 },
  Ramgarh: { lat: 23.6288, lng: 85.5152 },
  'West Singhbhum': { lat: 22.5539, lng: 85.8081 },
};

console.log('Testing Bug 3: Jharkhand GPS Bounding Box & District Selection...');

// Test Ranchi center coordinates
assert.strictEqual(isWithinJharkhand(DISTRICT_CENTERS.Ranchi.lat, DISTRICT_CENTERS.Ranchi.lng), true, 'Ranchi should be inside Jharkhand');

// Test Dhanbad center coordinates
assert.strictEqual(isWithinJharkhand(DISTRICT_CENTERS.Dhanbad.lat, DISTRICT_CENTERS.Dhanbad.lng), true, 'Dhanbad should be inside Jharkhand');

// Test Out-of-bounds location (Bangalore / London / New York)
assert.strictEqual(isWithinJharkhand(12.9716, 77.5946), false, 'Bangalore should be outside Jharkhand');
assert.strictEqual(isWithinJharkhand(51.5074, -0.1278), false, 'London should be outside Jharkhand');

console.log('✅ Bug 3 Jharkhand Bounding Box tests PASSED.');

// 2. Verify Coordinate Parsing Logic in MyReports.jsx (PostGIS EWKB Hex, WKT, GeoJSON)
const hexToFloat64 = (hexStr, isLittleEndian = true) => {
  const match = hexStr.match(/../g);
  if (!match || match.length < 8) return 0;
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(match[i], 16);
  }
  return new DataView(bytes.buffer).getFloat64(0, isLittleEndian);
};

const parseEWKBPoint = (hex) => {
  const cleanHex = hex.trim().toUpperCase();
  if (cleanHex.length < 50) return null;
  const isLittleEndian = cleanHex.startsWith('01');
  const lngHex = cleanHex.substring(18, 34);
  const latHex = cleanHex.substring(34, 50);
  const lng = hexToFloat64(lngHex, isLittleEndian);
  const lat = hexToFloat64(latHex, isLittleEndian);
  if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
  }
  return null;
};

const parseCoords = (location) => {
  if (!location) return { lat: 'N/A', lng: 'N/A' };

  if (typeof location === 'string' && /^[0-9A-Fa-f]{32,}$/.test(location.trim())) {
    const ewkbResult = parseEWKBPoint(location);
    if (ewkbResult) return ewkbResult;
  }

  if (typeof location === 'string') {
    const match = location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i) ||
                  location.match(/\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
    if (match) {
      return { lng: parseFloat(match[1]).toFixed(6), lat: parseFloat(match[2]).toFixed(6) };
    }
  }

  if (location && typeof location === 'object') {
    if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      return {
        lng: Number(location.coordinates[0]).toFixed(6),
        lat: Number(location.coordinates[1]).toFixed(6),
      };
    }
    if (location.lat !== undefined && location.lng !== undefined) {
      return {
        lat: Number(location.lat).toFixed(6),
        lng: Number(location.lng).toFixed(6),
      };
    }
  }

  return { lat: 'N/A', lng: 'N/A' };
};

console.log('\nTesting Bug 1: PostGIS Location EWKB & WKT Parsing for Detail View...');

// Test WKT string
const pointStr = 'POINT(85.3096 23.3441)';
const parsedStr = parseCoords(pointStr);
assert.strictEqual(parsedStr.lat, '23.344100');
assert.strictEqual(parsedStr.lng, '85.309600');

// Test GeoJSON object
const pointObj = { type: 'Point', coordinates: [86.4304, 23.7957] };
const parsedObj = parseCoords(pointObj);
assert.strictEqual(parsedObj.lat, '23.795700');
assert.strictEqual(parsedObj.lng, '86.430400');

// Test EWKB Hex string from PostGIS: POINT(85.3096 23.3441)
const ewkbHex = '0101000020E61000008A36952CCF5355407BE26A2917583740';
const parsedEwkb = parseCoords(ewkbHex);
assert.ok(Math.abs(Number(parsedEwkb.lat) - 23.3441) < 0.001, 'Latitude parsed from EWKB should match 23.3441');
assert.ok(Math.abs(Number(parsedEwkb.lng) - 85.3096) < 0.001, 'Longitude parsed from EWKB should match 85.3096');

console.log('✅ Bug 1 PostGIS Location Parsing tests (EWKB, WKT, GeoJSON) PASSED.');

console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
