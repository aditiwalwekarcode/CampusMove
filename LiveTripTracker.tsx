import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Play, Pause, MapPin, Navigation, Radio, Gauge, Clock, ArrowRight, Train, Bus, Users, Footprints, Zap } from 'lucide-react';
import type { RouteCalculation } from '@/lib/data';
import {
  WAGHOLI_DECCAN_WAYPOINTS,
  PUNE_CENTER,
  DEFAULT_ZOOM,
  waypointsToLatLng,
  getLegSegments,
  lerpLatLng,
  haversineKm,
  totalPathDistance,
  type Waypoint,
} from '@/lib/tripCoords';

interface Props {
  selectedCalc: RouteCalculation | null;
  darkMode: boolean;
}

// ── Custom vehicle marker icon (divIcon for dynamic styling) ──────────────────
function createVehicleIcon(isSixSeater: boolean): L.DivIcon {
  const bgColor = isSixSeater ? '#10b981' : '#3b82f6';
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `<div class="vehicle-marker-pulse" style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${bgColor}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; color: white; font-weight: bold;
    ">▶</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createStopIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-stop-marker',
    html: `<div style="
      width: 18px; height: 18px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    "></div><div style="
      position: absolute; top: 22px; left: 50%;
      transform: translateX(-50%); white-space: nowrap;
      font-size: 10px; font-weight: 700; color: #334155;
      background: rgba(255,255,255,0.9); padding: 1px 5px;
      border-radius: 3px; pointer-events: none;
    ">${label}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// ── Component to recenter map when route changes ──────────────────────────────
function MapRecenter({ center, waypoints }: { center: [number, number]; waypoints: Waypoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length > 0) {
      const coords = waypointsToLatLng(waypoints);
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [60, 60] });
    } else {
      map.setView(center, DEFAULT_ZOOM);
    }
  }, [map, center, waypoints]);
  return null;
}

export default function LiveTripTracker({ selectedCalc, darkMode }: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [trackingMode, setTrackingMode] = useState<'sim' | 'gps'>('sim');
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [progress, setProgress] = useState(0);       // 0 → 1
  const [currentLegIdx, setCurrentLegIdx] = useState(0);
  const [markerPos, setMarkerPos] = useState<[number, number]>(WAGHOLI_DECCAN_WAYPOINTS[0]
    ? [WAGHOLI_DECCAN_WAYPOINTS[0].lat, WAGHOLI_DECCAN_WAYPOINTS[0].lng]
    : PUNE_CENTER);
  const [gpsPos, setGpsPos] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState<string>('');

  // ── Refs ────────────────────────────────────────────────────────────────────
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  // ── Waypoints & path geometry ───────────────────────────────────────────────
  const waypoints = WAGHOLI_DECCAN_WAYPOINTS;
  const fullCoords = useMemo(() => waypointsToLatLng(waypoints), [waypoints]);
  const segments = useMemo(() => getLegSegments(waypoints), [waypoints]);
  const totalDistKm = useMemo(() => totalPathDistance(fullCoords), [fullCoords]);

  // ── Determine current leg based on progress ─────────────────────────────────
  // Each leg spans a portion of the total path. We find which leg the marker
  // is currently on based on the progress fraction.
  const legBoundaries = useMemo(() => {
    const boundaries: { start: number; end: number; leg: string; name: string }[] = [];
    let cumulative = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const segDist = haversineKm(fullCoords[i - 1], fullCoords[i]);
      const startF = cumulative / totalDistKm;
      cumulative += segDist;
      const endF = cumulative / totalDistKm;
      boundaries.push({
        start: startF,
        end: endF,
        leg: waypoints[i].leg,
        name: waypoints[i].name,
      });
    }
    return boundaries;
  }, [waypoints, fullCoords, totalDistKm]);

  // ── Interpolate marker position from progress fraction ──────────────────────
  const getPositionAtProgress = useCallback((frac: number): [number, number] => {
    if (fullCoords.length < 2) return PUNE_CENTER;
    let targetDist = frac * totalDistKm;
    let cumDist = 0;
    for (let i = 1; i < fullCoords.length; i++) {
      const segDist = haversineKm(fullCoords[i - 1], fullCoords[i]);
      if (cumDist + segDist >= targetDist) {
        const t = (targetDist - cumDist) / segDist;
        return lerpLatLng(fullCoords[i - 1], fullCoords[i], Math.min(1, Math.max(0, t)));
      }
      cumDist += segDist;
    }
    return fullCoords[fullCoords.length - 1];
  }, [fullCoords, totalDistKm]);

  // ── Determine current leg from progress ─────────────────────────────────────
  const currentLeg = useMemo(() => {
    for (let i = 0; i < legBoundaries.length; i++) {
      if (progress >= legBoundaries[i].start && progress < legBoundaries[i].end) {
        return { ...legBoundaries[i], idx: i };
      }
    }
    // If progress is at the end, return last leg
    if (legBoundaries.length > 0) {
      const last = legBoundaries[legBoundaries.length - 1];
      return { ...last, idx: legBoundaries.length - 1 };
    }
    return { start: 0, end: 1, leg: 'feeder', name: '', idx: 0 };
  }, [progress, legBoundaries]);

  // ── Simulation loop using requestAnimationFrame ─────────────────────────────
  // The marker moves along the path at a rate proportional to simSpeed.
  // Total simulation time = totalDynamicTime minutes; at 1x speed, 1 real
  // second = 1 simulated minute. At 5x, 1 real second = 5 simulated minutes.
  const totalSimMinutes = selectedCalc?.totalDynamicTime ?? 40;

  useEffect(() => {
    if (trackingMode !== 'sim' || !isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = now;

      // Progress increment: (simSpeed minutes per real second) / total minutes
      const inc = (simSpeed * dt) / totalSimMinutes;
      setProgress((prev) => {
        const next = prev + inc;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    // Cleanup: cancel the animation frame on unmount or when paused.
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [trackingMode, isPlaying, simSpeed, totalSimMinutes]);

  // ── Update marker position when progress changes (sim mode) ─────────────────
  useEffect(() => {
    if (trackingMode === 'sim') {
      setMarkerPos(getPositionAtProgress(progress));
      setCurrentLegIdx(currentLeg.idx);
    }
  }, [progress, trackingMode, getPositionAtProgress, currentLeg]);

  // ── GPS tracking: watchPosition ─────────────────────────────────────────────
  // When GPS mode is active, we use navigator.geolocation.watchPosition to
  // get real-time device coordinates. The marker follows the student's actual
  // location. The watch is cleaned up in the return function to prevent
  // memory leaks and battery drain when the component unmounts or the user
  // switches back to simulation mode.
  useEffect(() => {
    if (trackingMode !== 'gps') {
      // Clean up any existing GPS watch when not in GPS mode.
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by this browser');
      return;
    }

    setGpsError('');

    // Start watching position. enableHighAccuracy gives GPS-grade coords
    // (may drain battery faster). timeout prevents hanging if GPS is slow.
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsPos([latitude, longitude]);
        setMarkerPos([latitude, longitude]);
        setGpsError('');
      },
      (err) => {
        setGpsError(err.message || 'GPS access denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    // Cleanup function: clear the GPS watch to prevent memory leaks and
    // stop battery drain when component unmounts or mode switches.
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [trackingMode]);

  // ── Reset when switching modes ──────────────────────────────────────────────
  const handleModeSwitch = (mode: 'sim' | 'gps') => {
    setTrackingMode(mode);
    setIsPlaying(false);
    setProgress(0);
    if (mode === 'sim') {
      setMarkerPos(fullCoords[0] ?? PUNE_CENTER);
    }
  };

  const handlePlayPause = () => {
    if (progress >= 1) {
      setProgress(0);
      setMarkerPos(fullCoords[0] ?? PUNE_CENTER);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
    setMarkerPos(fullCoords[0] ?? PUNE_CENTER);
  };

  // ── Computed display values ─────────────────────────────────────────────────
  const isSixSeater = selectedCalc?.usesSixSeater ?? false;
  const remainingDistKm = totalDistKm * (1 - progress);
  const remainingMin = Math.max(0, Math.round(totalSimMinutes * (1 - progress)));
  const progressPct = Math.round(progress * 100);

  // Leg label and next action
  const legLabels: Record<string, string> = {
    feeder: isSixSeater ? '6-Seater Auto' : 'Feeder Bus',
    metro: 'Metro Aqua Line',
    walk: 'Walking to Campus',
  };
  const legIcons: Record<string, React.ReactNode> = {
    feeder: isSixSeater ? <Users className="h-3.5 w-3.5" /> : <Bus className="h-3.5 w-3.5" />,
    metro: <Train className="h-3.5 w-3.5" />,
    walk: <Footprints className="h-3.5 w-3.5" />,
  };

  const currentLegName = legLabels[currentLeg.leg] ?? 'In Transit';
  const nextWaypoint = waypoints[currentLeg.idx + 2] ?? waypoints[waypoints.length - 1];
  const nextAction = progress < 1
    ? `Arriving at ${nextWaypoint.name} in ${Math.max(1, Math.round(remainingMin * (1 - progress / (currentLeg.end || 1))))} mins — Prepare to alight`
    : 'Arrived at destination';

  // ── Vehicle icon ────────────────────────────────────────────────────────────
  const vehicleIcon = useMemo(() => createVehicleIcon(isSixSeater), [isSixSeater]);

  // ── Polyline colors ─────────────────────────────────────────────────────────
  const FEEDER_COLOR = '#f59e0b';    // Amber/Orange for road legs
  const METRO_COLOR = '#06b6d4';     // Cyan (Aqua Line)
  const WALK_COLOR = '#22c55e';      // Green for last-mile walk

  // ── Tile URL (CartoDB for dark mode compatibility) ──────────────────────────
  const tileUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div className="space-y-4">
      {/* ── Tracking mode toggle ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleModeSwitch('sim')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
            trackingMode === 'sim'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'bg-white/70 text-slate-600 ring-1 ring-slate-200/60 backdrop-blur-sm dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/50'
          }`}
        >
          <Gauge className="h-3.5 w-3.5" /> Simulate Trip
        </button>
        <button
          onClick={() => handleModeSwitch('gps')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
            trackingMode === 'gps'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
              : 'bg-white/70 text-slate-600 ring-1 ring-slate-200/60 backdrop-blur-sm dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/50'
          }`}
        >
          <Radio className="h-3.5 w-3.5" /> Live GPS
        </button>
      </div>

      {/* ── Map container with HUD overlay ───────────────────────────────────── */}
      <div className="relative h-[350px] w-full overflow-hidden rounded-2xl shadow-xl sm:h-[450px] md:h-[500px]">
        <MapContainer
          center={PUNE_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            url={tileUrl}
            attribution={tileAttribution}
          />

          {/* Polylines color-coded by transit mode */}
          {segments.feeder.length > 0 && (
            <Polyline
              positions={segments.feeder}
              pathOptions={{ color: FEEDER_COLOR, weight: 5, opacity: 0.85 }}
            />
          )}
          {segments.metro.length > 0 && (
            <Polyline
              positions={segments.metro}
              pathOptions={{ color: METRO_COLOR, weight: 5, opacity: 0.85 }}
            />
          )}
          {segments.walk.length > 0 && (
            <Polyline
              positions={segments.walk}
              pathOptions={{ color: WALK_COLOR, weight: 4, opacity: 0.7, dashArray: '8,6' }}
            />
          )}

          {/* Stop markers at each waypoint */}
          {waypoints.map((wp, idx) => {
            const color = wp.leg === 'feeder' ? FEEDER_COLOR : wp.leg === 'metro' ? METRO_COLOR : WALK_COLOR;
            return (
              <Marker
                key={idx}
                position={[wp.lat, wp.lng]}
                icon={createStopIcon(color, wp.name)}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{wp.name}</p>
                    <p className="text-slate-500">{wp.description}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Live moving vehicle marker */}
          <Marker position={markerPos} icon={vehicleIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{trackingMode === 'gps' ? 'Your Location (GPS)' : 'Vehicle (Simulated)'}</p>
                <p className="text-slate-500">
                  {currentLegName} · {progressPct}% complete
                </p>
              </div>
            </Popup>
          </Marker>

          {/* GPS accuracy marker if in GPS mode */}
          {trackingMode === 'gps' && gpsPos && (
            <Marker position={gpsPos} icon={L.divIcon({
              className: 'gps-accuracy-marker',
              html: '<div style="width:12px;height:12px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 0 0 4px rgba(16,185,129,0.2)"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            })} />
          )}

          <MapRecenter center={PUNE_CENTER} waypoints={waypoints} />
        </MapContainer>

        {/* ── Floating HUD overlay (glassmorphism) ─────────────────────────────── */}
        <div className="pointer-events-none absolute left-3 top-3 z-[1000] w-[min(290px,calc(100%-1.5rem))]">
          <div className="pointer-events-auto rounded-xl border border-white/40 bg-white/80 p-3 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80 dark:backdrop-blur-md">
            {/* Leg status badge */}
            <div className="mb-2 flex items-center gap-2">
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                currentLeg.leg === 'feeder'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                  : currentLeg.leg === 'metro'
                    ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              }`}>
                {legIcons[currentLeg.leg]}
                Leg {currentLeg.idx + 1}: {currentLegName}
              </span>
              {selectedCalc && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                  to {nextWaypoint.name}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <span>Trip Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(1, progressPct)}%` }}
                />
              </div>
            </div>

            {/* ETA + distance */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/60">
                <div className="flex items-center gap-1 text-[9px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <Clock className="h-3 w-3" /> ETA
                </div>
                <p className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {remainingMin}<span className="text-xs text-slate-500"> min</span>
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/60">
                <div className="flex items-center gap-1 text-[9px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <Navigation className="h-3 w-3" /> Distance
                </div>
                <p className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {remainingDistKm.toFixed(1)}<span className="text-xs text-slate-500"> km</span>
                </p>
              </div>
            </div>

            {/* Next action alert */}
            <div className="mt-2 rounded-lg bg-blue-50 px-2.5 py-1.5 dark:bg-blue-500/10">
              <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                <Zap className="mr-1 inline h-3 w-3" />
                {nextAction}
              </p>
            </div>
          </div>
        </div>

        {/* GPS error toast */}
        {trackingMode === 'gps' && gpsError && (
          <div className="absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-lg">
            GPS Error: {gpsError}
          </div>
        )}

        {/* Arrived toast */}
        {progress >= 1 && trackingMode === 'sim' && (
          <div className="absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg">
            Arrived at destination!
          </div>
        )}
      </div>

      {/* ── Simulation controls (below map) ────────────────────────────────────── */}
      {trackingMode === 'sim' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/60 bg-white/70 p-3 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
          <button
            onClick={handlePlayPause}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition active:scale-95 ${
              isPlaying ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? 'Pause' : progress >= 1 ? 'Replay' : 'Play'}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-300 active:scale-95 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            <MapPin className="h-4 w-4" /> Reset
          </button>

          {/* Speed slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Speed:</span>
            {[1, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setSimSpeed(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  simSpeed === s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Train className="h-3.5 w-3.5" />
            <span>Total: {totalSimMinutes} min · {totalDistKm.toFixed(1)} km</span>
          </div>
        </div>
      )}

      {/* ── GPS mode status ──────────────────────────────────────────────────── */}
      {trackingMode === 'gps' && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {gpsPos
              ? `Tracking live · ${gpsPos[0].toFixed(4)}, ${gpsPos[1].toFixed(4)}`
              : 'Waiting for GPS signal… Allow location access in your browser.'}
          </p>
        </div>
      )}
    </div>
  );
}
