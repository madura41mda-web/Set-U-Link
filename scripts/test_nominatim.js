async function testNominatim() {
  console.log('Testing Nominatim reverse geocoding for Jharkhand coordinates...\n');

  const locations = [
    { name: 'Ranchi Doranda', lat: 23.3441, lng: 85.3096 },
    { name: 'Ranchi Kanke', lat: 23.4120, lng: 85.3200 },
    { name: 'Dhanbad Station', lat: 23.7957, lng: 86.4304 },
    { name: 'Rural Angara', lat: 23.3700, lng: 85.5200 },
  ];

  for (const loc of locations) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json&accept-language=en&email=setulink@jharkhand.gov.in`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SetuLink-CivicApp/1.0 (setulink@jharkhand.gov.in)'
        }
      });
      const data = await res.json();
      console.log(`📍 ${loc.name} (${loc.lat}, ${loc.lng}):`);
      console.log('Display Name:', data.display_name);
      console.log('Address Object:', data.address);

      const addr = data.address || {};
      const candidates = [];
      ['suburb', 'neighbourhood', 'quarter', 'residential', 'village', 'town', 'city_district', 'subdistrict', 'road']
        .forEach((key) => {
          if (addr[key] && !candidates.includes(addr[key])) {
            candidates.push(addr[key]);
          }
        });
      console.log('Extracted Locality Candidates:', candidates.slice(0, 3));
      console.log('--------------------------------------------------\n');
    } catch (err) {
      console.error(`Error testing ${loc.name}:`, err);
    }
  }
}

testNominatim();
