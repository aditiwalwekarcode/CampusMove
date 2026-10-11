// ═══════════════════════════════════════════════════════════════════════════
// CampusMove — Pune Corridor Coordinates for Leaflet Map
// ═══════════════════════════════════════════════════════════════════════════
//
//  Coordinates are [lat, lng] pairs as expected by Leaflet.
//  The Wagholi → Deccan corridor represents the primary demo route:
//    1. Wagholi Stand (origin — 6-seater auto boarding point)
//    2. Ramwadi Metro Station (Aqua Line eastern terminus)
//    3. Civil Court Interchange (Aqua Line → future Purple Line transfer)
//    4. Deccan Gymkhana (surface exit — last-mile walk begins)
//    5. DES Pune University Gate (final campus destination)
// ═══════════════════════════════════════════════════════════════════════════

// ── Waypoint type ────────────────────────────────────────────────────────────
export interface Waypoint {
  name: string;
  lat: number;
  lng: number;
  leg: 'feeder' | 'metro' | 'walk';
  description: string;
}

// ── Wagholi → Deccan corridor waypoints ──────────────────────────────────────
// These coordinates follow the actual Aqua Line alignment and road network.
export const WAGHOLI_DECCAN_WAYPOINTS: Waypoint[] = [
  {
    name: 'Wagholi Stand',
    lat: 18.5679, lng: 73.9825,
    leg: 'feeder',
    description: '6-Seater auto boarding point — fill-up wait ~10 min',
  },
  {
    name: 'Ramwadi Metro',
    lat: 18.5684, lng: 73.9370,
    leg: 'feeder',
    description: 'Aqua Line eastern terminus — interchange to metro',
  },
  {
    name: 'Civil Court Interchange',
    lat: 18.5308, lng: 73.8475,
    leg: 'metro',
    description: 'Aqua Line central station — transfer point',
  },
  {
    name: 'Deccan Gymkhana',
    lat: 18.5160, lng: 73.8320,
    leg: 'walk',
    description: 'Surface exit — last-mile walk to campus begins',
  },
  {
    name: 'DES Pune University Gate',
    lat: 18.5120, lng: 73.8260,
    leg: 'walk',
    description: 'Final destination — campus gate',
  },
];

// ── Default map center: Pune city center ─────────────────────────────────────
export const PUNE_CENTER: [number, number] = [18.5204, 73.8567];
export const DEFAULT_ZOOM = 12;

// ── Helper: extract coordinates array from waypoints ─────────────────────────
export function waypointsToLatLng(waypoints: Waypoint[]): [number, number][] {
  return waypoints.map((w) => [w.lat, w.lng]);
}

// ── Helper: segment waypoints by leg type ────────────────────────────────────
// Returns arrays of [lat, lng] pairs grouped by leg type for polyline rendering.
export function getLegSegments(waypoints: Waypoint[]): {
  feeder: [number, number][];
  metro: [number, number][];
  walk: [number, number][];
} {
  const feeder: [number, number][] = [];
  const metro: [number, number][] = [];
  const walk: [number, number][] = [];

  let currentLeg: string | null = null;
  let prevPoint: [number, number] | null = null;

  for (const wp of waypoints) {
    const point: [number, number] = [wp.lat, wp.lng];
    if (prevPoint && currentLeg === wp.leg) {
      // Same leg — add the segment to the current leg array.
      if (wp.leg === 'feeder') feeder.push(prevPoint, point);
      else if (wp.leg === 'metro') metro.push(prevPoint, point);
      else walk.push(prevPoint, point);
    } else if (prevPoint && currentLeg !== wp.leg) {
      // Leg transition — bridge the gap with the new leg.
      if (wp.leg === 'feeder') feeder.push(prevPoint, point);
      else if (wp.leg === 'metro') metro.push(prevPoint, point);
      else walk.push(prevPoint, point);
    }
    currentLeg = wp.leg;
    prevPoint = point;
  }

  return { feeder, metro, walk };
}

// ── Helper: linear interpolation between two coordinates ─────────────────────
// Given two [lat, lng] points and a fraction t (0→1), returns the interpolated
// point. Used by the simulation loop to move the marker smoothly.
export function lerpLatLng(
  a: [number, number],
  b: [number, number],
  t: number
): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ── Helper: haversine distance between two coordinates (in km) ───────────────
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ── Helper: total distance of a coordinate path (in km) ──────────────────────
export function totalPathDistance(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1], points[i]);
  }
  return total;
}
