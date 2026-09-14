import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon asset URLs in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function LocationPickerMap({ latitude, longitude, onChangeLocation, height = 'h-64' }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize Leaflet map instance once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialLat = latitude || 23.3441;
    const initialLng = longitude || 85.3096;

    const map = L.map(containerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      title: 'Drag pin to set exact issue location',
    }).addTo(map);

    marker.bindPopup('<b>Drag me or click map</b><br/>to pinpoint exact issue location.').openPopup();

    // Event listener on marker drag end
    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      if (onChangeLocation) {
        onChangeLocation(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));
      }
    });

    // Event listener on map click
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      if (onChangeLocation) {
        onChangeLocation(parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6)));
      }
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Sync marker position & map view when props change externally (e.g. District selection or GPS detect)
  useEffect(() => {
    if (mapRef.current && markerRef.current && latitude && longitude) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - latitude) > 0.0001 || Math.abs(currentPos.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapRef.current.setView([latitude, longitude], 13);
      }
    }
  }, [latitude, longitude]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--line)] shadow-inner">
      <div ref={containerRef} className={`${height} w-full z-0`} />
      <div className="absolute bottom-2 left-2 z-10 bg-white/90 nav-blur px-2.5 py-1 rounded-lg text-[10px] font-bold text-[var(--ink-soft)] border border-[var(--line)] shadow-sm">
        💡 Drag marker or click map to set exact coordinates
      </div>
    </div>
  );
}
