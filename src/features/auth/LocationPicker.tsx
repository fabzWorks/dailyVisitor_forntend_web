'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, LocateFixed, Loader2 } from 'lucide-react';
import { geoApi } from '@/api';

export interface PickedLocation {
  lat: number; lng: number;
  country: string; province: string; city: string; area: string; address: string;
}

interface Props {
  lat?: number | null;
  lng?: number | null;
  onPick: (loc: PickedLocation) => void;
}

const DEFAULT_CENTER: [number, number] = [33.6844, 73.0479]; // Islamabad
//reverseGeocode latitude aur longitude ki madad se address information hasil karne wala asynchronous function hai.
async function reverseGeocode(lat: number, lng: number): Promise<Omit<PickedLocation, 'lat' | 'lng'>> {
  const empty = { country: '', province: '', city: '', area: '', address: '' };
  try {
    const j = await geoApi.reverse(lat, lng);
    const a = j.address || {};
    return {
      country: a.country || '',
      province: a.state || a.region || a.state_district || '',
      city: a.city || a.town || a.village || a.county || '',
      area: a.suburb || a.neighbourhood || a.quarter || a.city_district || a.residential || '',
      address:
        [a.house_number, a.road].filter(Boolean).join(' ') ||
        String(j.display_name || '').split(',').slice(0, 2).join(',').trim(),
    };
  } catch {
    return empty;
  }
}

const PIN_HTML =
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">` +
  `<path d="M16 0C7.2 0 0 7 0 15.6 0 27 16 40 16 40s16-13 16-24.4C32 7 24.8 0 16 0z" fill="#ef4444" stroke="#fff" stroke-width="2"/>` +
  `<circle cx="16" cy="15" r="6" fill="#fff"/></svg>`;

export function LocationPicker({ lat, lng, onPick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  //Map ko baad mein control karne ke liye
  const markerRef = useRef<any>(null);
  //Map library ko reference karne ke liye
  const leafletRef = useRef<any>(null);
  //Container ka size change hone par usay observe karne ke liye
  const roRef = useRef<ResizeObserver | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  //ka matlab is state mein ya to text (string) hoga ya null, yani koi hint nahi.Misal: setHint('Map par apni location select karein').
  const [hint, setHint] = useState<string | null>(null);

  // place / move the pin, then fill the address fields
  const choose = async (la: number, ln: number, pan = false) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!markerRef.current) {
      const icon = L.divIcon({ html: PIN_HTML, className: '', iconSize: [32, 40], iconAnchor: [16, 40] });
      markerRef.current = L.marker([la, ln], { icon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        choose(p.lat, p.lng);
      });
    } else {
      markerRef.current.setLatLng([la, ln]);
    }
    if (pan) map.setView([la, ln], Math.max(map.getZoom(), 16));
    setBusy(true);
    const place = await reverseGeocode(la, ln);
    setBusy(false);
    onPickRef.current({ lat: la, lng: ln, ...place });
  };

  // create the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !box.current || mapRef.current) return;
      leafletRef.current = L;
      const start: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
      const map = L.map(box.current, { zoomControl: true }).setView(start, lat != null ? 16 : 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.on('click', (e: any) => choose(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 250);
      setTimeout(() => map.invalidateSize(), 800);
      if (typeof ResizeObserver !== 'undefined') {
        roRef.current = new ResizeObserver(() => map.invalidateSize());
        roRef.current.observe(box.current);
      }
      if (lat != null && lng != null) {
        const icon = L.divIcon({ html: PIN_HTML, className: '', iconSize: [32, 40], iconAnchor: [16, 40] });
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const p = markerRef.current.getLatLng();
          choose(p.lat, p.lng);
        });
      }
    })();
    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setBusy(true); setHint(null);
    try {
      const j = await geoApi.search(q);
      if (!j.length) { setHint('Place not found. Try a different name.'); setBusy(false); return; }
      await choose(Number(j[0].lat), Number(j[0].lon), true);
    } catch {
      setHint('Search failed. Check your internet connection.');
      setBusy(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) { setHint('Location is not supported on this device.'); return; }
    setBusy(true); setHint(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => choose(pos.coords.latitude, pos.coords.longitude, true),
      () => { setBusy(false); setHint('Could not get your location. Allow location access or tap the map.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
            placeholder="Search area, e.g. G-9 Islamabad"
            className="w-full py-2.5 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <button type="button" onClick={search}
          className="px-3 rounded-xl bg-blue-600 text-white text-xs font-semibold active:scale-95">Go</button>
        <button type="button" onClick={locate} title="Use my location"
          className="px-3 rounded-xl bg-slate-100 text-slate-700 active:scale-95 flex items-center">
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>
      <div className="relative z-0 rounded-2xl overflow-hidden border-2 border-slate-200" style={{ isolation: 'isolate' }}>
        <div ref={box} style={{ height: 240, width: '100%' }} />
        {busy && (
          <div className="absolute top-2 right-2 z-[500] bg-white/90 rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow text-[11px] text-slate-600">
            <Loader2 className="w-3 h-3 animate-spin" /> Finding address…
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-red-500 mt-1.5">{hint}</p>}
    </div>
  );
}
