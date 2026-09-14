// Shared Geographical & PostGIS Utilities for SetuLink

const hexToFloat64 = (hexStr, isLittleEndian = true) => {
  const match = hexStr.match(/../g);
  if (!match || match.length < 8) return 0;
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(match[i], 16);
  }
  return new DataView(bytes.buffer).getFloat64(0, isLittleEndian);
};

export const parseEWKBPoint = (hex) => {
  const cleanHex = hex.trim().toUpperCase();
  if (cleanHex.length < 50) return null;
  const isLittleEndian = cleanHex.startsWith('01');
  const lngHex = cleanHex.substring(18, 34);
  const latHex = cleanHex.substring(34, 50);
  const lng = hexToFloat64(lngHex, isLittleEndian);
  const lat = hexToFloat64(latHex, isLittleEndian);
  if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
  }
  return null;
};

export const parseCoords = (location) => {
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

// Calculate Haversine distance in meters between two lat/lng points
export const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
  if (lat1 === 'N/A' || lng1 === 'N/A' || lat2 === 'N/A' || lng2 === 'N/A') return Infinity;
  const R = 6371000; // Earth radius in meters
  const rLat1 = (Number(lat1) * Math.PI) / 180;
  const rLat2 = (Number(lat2) * Math.PI) / 180;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLng = ((Number(lng2) - Number(lng1)) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
