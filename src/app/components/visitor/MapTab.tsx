'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button } from '../ui/common';
import { Navigation, Clock, LocateFixed, MapPinOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { LiveSubscription } from '../../lib/api';
import { to12h } from '../../lib/api';
import { todaysOccurrences, dashboardGroupOf, deliveryKey } from '../../lib/schedule';
import type { DeliveryMap } from '../../lib/schedule';

interface Props {
  subscriptions: LiveSubscription[];
  deliveries?: DeliveryMap;
  focusSubId?: number | null;    // set by the dashboard's Navigate button
  fallbackLat?: number | null;   // provider's saved address (used until GPS answers)
  fallbackLng?: number | null;
}

const DEFAULT_CENTER: [number, number] = [33.6844, 73.0479]; // Islamabad

type LatLng = [number, number];
interface Stop {
  key: string;
  name: string;
  address: string;
  time: string;
  lat: number;
  lng: number;
  focus: boolean;
}

// straight-line distance in km (Haversine)
function haversineKm(a: LatLng, b: LatLng) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const pinHtml = (color: string, label: string) =>
  `<div style="position:relative;width:34px;height:42px">` +
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 32 40">` +
  `<path d="M16 0C7.2 0 0 7 0 15.6 0 27 16 40 16 40s16-13 16-24.4C32 7 24.8 0 16 0z" fill="${color}" stroke="#fff" stroke-width="2"/></svg>` +
  `<span style="position:absolute;top:7px;left:0;width:34px;text-align:center;color:#fff;font:700 13px system-ui">${label}</span></div>`;

const ME_HTML =
  `<div style="position:relative;width:22px;height:22px">` +
  `<span style="position:absolute;inset:-9px;border-radius:50%;background:rgba(37,99,235,.25)"></span>` +
  `<span style="position:absolute;inset:0;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></span></div>`;

const NO_DELIVERIES: DeliveryMap = {};

export const VisitorMap: React.FC<Props> = ({ subscriptions, deliveries = NO_DELIVERIES, focusSubId = null, fallbackLat = null, fallbackLng = null }) => {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const layersRef = useRef<{ stops: any[]; me: any; route: any }>({ stops: [], me: null, route: null });
  const [mapReady, setMapReady] = useState(false);
  const [me, setMe] = useState<LatLng | null>(fallbackLat != null && fallbackLng != null ? [fallbackLat, fallbackLng] : null);
  const [gpsState, setGpsState] = useState<'asking' | 'live' | 'denied'>('asking');
  const [route, setRoute] = useState<{ points: LatLng[]; km: number; mins: number | null } | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // ── today's stops (residents with a saved map location) ─────────────────────
  const { stops, missing } = useMemo(() => {
    // services that are not completed yet
    const today = todaysOccurrences(subscriptions, now).filter(o => !deliveries[deliveryKey(o.sub.dbId, o.date)]?.completedAt);
    const focusOcc =
      (focusSubId != null ? today.find(o => o.sub.dbId === focusSubId) : undefined) ??
      today.find(o => dashboardGroupOf(o, now) === 'pending') ??
      today.find(o => dashboardGroupOf(o, now) === 'delayed') ??
      today.find(o => dashboardGroupOf(o, now) === 'upcoming');
    let source = today;
    if (source.length === 0) {
      // nothing today -> show every resident so the map is never empty
      const seen = new Set<string>();
      source = subscriptions
        .filter(s => { if (seen.has(s.residentId)) return false; seen.add(s.residentId); return true; })
        .map(s => ({ key: s.id, date: '', dayName: '', from: s.from, to: s.to, sub: s }));
    }
    const list: Stop[] = [];
    let miss = 0;
    for (const o of source) {
      if (o.sub.residentLat == null || o.sub.residentLng == null) { miss++; continue; }
      list.push({
        key: o.key,
        name: o.sub.residentName,
        address: o.sub.residentAddress,
        time: `${to12h(o.from)} – ${to12h(o.to)}`,
        lat: o.sub.residentLat,
        lng: o.sub.residentLng,
        focus: !!focusOcc && o.key === focusOcc.key,
      });
    }
    if (!list.some(s => s.focus) && list.length > 0) list[0].focus = true;
    return { stops: list, missing: miss };
  }, [subscriptions, deliveries, focusSubId, now]);

  const focus = stops.find(s => s.focus) ?? null;

  // ── create the map once ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !box.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(box.current, { zoomControl: false, attributionControl: true }).setView(DEFAULT_CENTER, 13);
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      // the container is inside an animated page -> make sure Leaflet knows its real size
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(box.current);
      setTimeout(() => map.invalidateSize(), 300);
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      layersRef.current = { stops: [], me: null, route: null };
      setMapReady(false);
    };
  }, []);

  // ── live GPS of the provider ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGpsState('denied'); return; }
    const id = navigator.geolocation.watchPosition(
      pos => { setMe([pos.coords.latitude, pos.coords.longitude]); setGpsState('live'); },
      () => setGpsState('denied'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── draw resident pins ──────────────────────────────────────────────────────
  useEffect(() => {
    const L = leafletRef.current; const map = mapRef.current;
    if (!mapReady || !L || !map) return;
    layersRef.current.stops.forEach(m => m.remove());
    layersRef.current.stops = stops.map((s, i) => {
      const icon = L.divIcon({ html: pinHtml(s.focus ? '#ef4444' : '#64748b', String(i + 1)), className: '', iconSize: [34, 42], iconAnchor: [17, 42], popupAnchor: [0, -38] });
      return L.marker([s.lat, s.lng], { icon, zIndexOffset: s.focus ? 1000 : 0 })
        .bindPopup(`<b>${s.name}</b><br/>${s.time}<br/><span style="color:#64748b">${s.address}</span>`)
        .addTo(map);
    });
  }, [mapReady, stops]);

  // ── draw "me" ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const L = leafletRef.current; const map = mapRef.current;
    if (!mapReady || !L || !map || !me) return;
    if (!layersRef.current.me) {
      const icon = L.divIcon({ html: ME_HTML, className: '', iconSize: [22, 22], iconAnchor: [11, 11] });
      layersRef.current.me = L.marker(me, { icon, zIndexOffset: 2000 }).addTo(map);
    } else {
      layersRef.current.me.setLatLng(me);
    }
  }, [mapReady, me]);

  // ── route me -> focus (real road route; straight line if the route service is down) ──
  const meKey = me ? `${me[0].toFixed(3)},${me[1].toFixed(3)}` : '';   // refetch only when he moved ~100 m
  useEffect(() => {
    if (!me || !focus) { setRoute(null); return; }
    let cancelled = false;
    const straight: LatLng[] = [me, [focus.lat, focus.lng]];
    const km = haversineKm(me, [focus.lat, focus.lng]);
    setRoute({ points: straight, km, mins: null });
    (async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${me[1]},${me[0]};${focus.lng},${focus.lat}?overview=full&geometries=geojson`;
        const r = await fetch(url);
        const j = await r.json();
        const best = j.routes?.[0];
        if (!cancelled && best) {
          setRoute({
            points: best.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as LatLng),
            km: best.distance / 1000,
            mins: Math.max(1, Math.round(best.duration / 60)),
          });
        }
      } catch { /* keep the straight line */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meKey, focus?.key, focus?.lat, focus?.lng]);

  useEffect(() => {
    const L = leafletRef.current; const map = mapRef.current;
    if (!mapReady || !L || !map) return;
    layersRef.current.route?.remove();
    layersRef.current.route = null;
    if (route) {
      layersRef.current.route = L.polyline(route.points, { color: '#2563eb', weight: 5, opacity: 0.85, dashArray: route.mins == null ? '8 8' : undefined }).addTo(map);
    }
  }, [mapReady, route]);

  // ── fit everything in view (when pins change, not on every GPS tick) ────────
  const stopsKey = stops.map(s => s.key).join('|');
  const fitted = useRef('');
  useEffect(() => {
    const L = leafletRef.current; const map = mapRef.current;
    if (!mapReady || !L || !map) return;
    const pts: LatLng[] = stops.map(s => [s.lat, s.lng]);
    if (me) pts.push(me);
    if (pts.length === 0) return;
    const sig = stopsKey + (me ? 'me' : '');
    if (fitted.current === sig) return;
    fitted.current = sig;
    if (pts.length === 1) map.setView(pts[0], 15);
    else map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
  }, [mapReady, stopsKey, me, stops]);

  const recenter = () => {
    const L = leafletRef.current; const map = mapRef.current;
    if (!L || !map) return;
    if (me) map.setView(me, Math.max(map.getZoom(), 16));
    else if (focus) map.setView([focus.lat, focus.lng], 16);
  };

  const openNavigation = () => {
    if (!focus) return;
    const origin = me ? `&origin=${me[0]},${me[1]}` : '';
    window.open(`https://www.google.com/maps/dir/?api=1${origin}&destination=${focus.lat},${focus.lng}&travelmode=driving`, '_blank', 'noopener');
  };

  return (
    <div className="w-full relative overflow-hidden bg-slate-200" style={{ height: 'calc(100dvh - 80px)', minHeight: 420 }}>
      <div ref={box} className="absolute inset-0 z-0" />
      {!mapReady && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-slate-100">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Top status bar */}
      <div className="absolute top-4 left-4 right-16 z-[500]">
        <Card className="bg-white/95 backdrop-blur-md shadow-lg border-0 p-3 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${gpsState === 'live' ? 'bg-green-500 animate-pulse' : gpsState === 'asking' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`} />
          <span className="text-xs font-semibold text-slate-700">
            {gpsState === 'live' ? 'Live location active' : gpsState === 'asking' ? 'Finding your location…' : me ? 'GPS off — showing your saved address' : 'Location unavailable — allow location access'}
          </span>
        </Card>
      </div>

      {/* Recenter */}
      <button onClick={recenter} className="absolute top-[88px] right-[10px] z-[500] w-[34px] h-[34px] bg-white rounded-md shadow border border-slate-300 flex items-center justify-center hover:bg-slate-50" title="My location">
        <LocateFixed className="w-4 h-4 text-slate-700" />
      </button>

      {/* Nothing to show */}
      {stops.length === 0 && (
        <div className="absolute bottom-24 left-4 right-4 z-[500]">
          <Card className="shadow-xl border-0 p-5 bg-white text-center">
            <MapPinOff className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-800 text-sm">{subscriptions.length === 0 ? 'No services yet' : 'No resident locations to show'}</p>
            <p className="text-xs text-slate-500 mt-1">
              {subscriptions.length === 0
                ? 'Accepted requests will appear on the map.'
                : `${missing} resident${missing === 1 ? '' : 's'} did not save a map location.`}
            </p>
          </Card>
        </div>
      )}

      {/* Bottom route card */}
      {focus && (
        <div className="absolute bottom-4 left-4 right-4 z-[500]">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-2xl border-0 overflow-hidden">
              <div className="bg-blue-600 px-4 py-2.5 flex justify-between items-center text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <Navigation className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-semibold truncate">Next: {focus.name}</span>
                </div>
                {route?.mins != null && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full shrink-0">{route.mins} min</span>}
              </div>
              <div className="p-4 bg-white">
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 truncate">{focus.address}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{focus.time}</span>
                    </div>
                  </div>
                  {route && (
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-bold text-blue-600">{route.km < 10 ? route.km.toFixed(1) : Math.round(route.km)}</span>
                      <span className="text-sm text-slate-400 ml-1">km</span>
                    </div>
                  )}
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={openNavigation}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Start Navigation
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};
