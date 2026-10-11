// ═══════════════════════════════════════════════════════════════════════════
// CampusMove v3 — Real Pune Transit Data & Adult Fares
// ═══════════════════════════════════════════════════════════════════════════
//
//  CHANGES FROM v2:
//  - Uses real PMPPL bus frequencies and Pune Metro headways.
//  - All fares are STANDARD ADULT fares (no student concessions).
//  - Multi-modal routes include feeder frequency, metro frequency,
//    and a transferTimeMins interchange window.
//  - The routing engine uses these to compute realistic wait times.
// ═══════════════════════════════════════════════════════════════════════════

// ── Section 1: College list ──────────────────────────────────────────────────
export const COLLEGES: string[] = [
  'AISSMS College of Engineering',
  'Ajeenkya DY Patil University (ADYPU)',
  'Armed Forces Medical College (AFMC)',
  'Army Institute of Technology (AIT)',
  'BJ Government Medical College',
  'Bharati Vidyapeeth (BVDU)',
  'Brihan Maharashtra College of Commerce (BMCC)',
  'COEP Technological University',
  'Cummins College',
  'D.Y. Patil College of Engineering (Akurdi)',
  'DES Pune University (DESPU)',
  'FLAME University',
  'Fergusson University',
  'GH Raisoni College of Engineering and Management',
  'Genba Sopanrao Moze College of Engineering',
  'ILS Law College',
  'Indira Group of Institutes',
  'Intellipaat School of Technology',
  'JSPM Wagholi Campus',
  'Lexicon Management Institute of Leadership and Excellence',
  'MES Abasaheb Garware College',
  'MIT Academy of Engineering (Alandi)',
  'MIT-WPU',
  'Modern College of Arts, Science and Commerce',
  'Ness Wadia College of Commerce',
  'Nowrosjee Wadia College',
  'PICT',
  'Pimpri Chinchwad College of Engineering (PCCOE)',
  'Sinhgad College of Engineering (SCOE)',
  'Sir Parashurambhau (SP) College',
  "St. Mira's College for Girls",
  'Symbiosis College of Arts and Commerce (SCAC)',
  'Symbiosis Institute of Design (SID)',
  'Symbiosis International University (SIU)',
  'VIT Pune',
  'Vishwakarma Institute of Information Technology (VIIT)',
];

// ── Section 2: Walking pace constant ─────────────────────────────────────────
// Average student walking pace: 15 minutes per kilometre.
export const WALKING_PACE_MIN_PER_KM = 15;

// ── Section 3: Peak-hour windows ────────────────────────────────────────────
// Pune's traffic peaks are roughly 08:00–10:30 (morning rush) and
// 17:00–19:30 (evening rush).  During these windows the trafficBuffer
// is multiplied by PEAK_MULTIPLIER (1.5×).
export const PEAK_MORNING_START = 8 * 60;       // 08:00 → 480 min
export const PEAK_MORNING_END = 10 * 60 + 30;   // 10:30 → 630 min
export const PEAK_EVENING_START = 17 * 60;      // 17:00 → 1020 min
export const PEAK_EVENING_END = 19 * 60 + 30;   // 19:30 → 1170 min
export const PEAK_MULTIPLIER = 1.5;

// ── Section 4: Route option type ────────────────────────────────────────────
// Each route option now includes frequency-based fields for wait-time math.
//
// Single-mode fields:
//   frequencyMins       — bus arrival interval (e.g. every 15 min)
//
// Multi-modal fields:
//   feederFrequencyMins — feeder bus/auto arrival interval
//   metroFrequencyMins  — Pune Metro Aqua/Purple Line headway (7.5 min)
//   transferTimeMins    — interchange walking time between feeder and metro
//
// Common fields:
//   baseTransitTime     — ideal in-vehicle travel time with zero traffic (min)
//   trafficBuffer       — extra minutes for traffic variability (min)
//   fare                — standard adult fare in ₹ (numeric)
//   lastMileDistanceKm  — distance from final transit stop to campus gate (km)
export interface RouteOption {
  id: string;
  type: 'single' | 'multi';
  name: string;
  baseTransitTime: number;
  trafficBuffer: number;
  fare: number;
  costText?: string;          // human-readable fare string (e.g. "₹30 (Standard Metro Fare)")
  transitTimeVaries?: boolean; // true if road traffic can extend transit time
  interchangeStation?: string; // name of the transfer station (e.g. "Civil Court")
  lastMileDistanceKm: number;
  // Single-mode: bus frequency.
  frequencyMins?: number;
  // Multi-modal: feeder + metro frequencies and transfer window.
  feederFrequencyMins?: number;
  metroFrequencyMins?: number;
  transferTimeMins?: number;
  // 6-Seater Shared Auto: fill-up staging time at the auto stand.
  // Unlike scheduled buses, 6-seater autos depart only when all seats
  // are filled.  This is a fixed wait (8–12 min) rather than a frequency.
  // When present, it REPLACES calculateWaitTime(feederFrequencyMins).
  fillUpWaitTimeMins?: number;
}

// ── Section 5: Transit node type ────────────────────────────────────────────
export interface TransitNode {
  id: string;
  name: string;
  routes: RouteOption[];
  cabBenchmark: string;
}

// ── Section 6: TRANSIT_NODES — real Pune transit data ────────────────────────
// Frequencies are based on actual PMPPL schedules and Pune Metro headways.
// Fares are standard adult fares (no student concessions).
// Metro headway = 7.5 minutes (Aqua Line / Purple Line actual frequency).
//
// MULTI-MODAL TIME FORMULA (computed in routingEngine.ts):
//   totalDynamicTime =
//     feederWait          (feederFrequencyMins / 2, rounded)
//   + feederTransit       (baseTransitTime, with peak multiplier on trafficBuffer)
//   + transferWindow      (transferTimeMins)
//   + metroWait           (metroFrequencyMins / 2, rounded)
//   + metroTransit        (included in baseTransitTime for multi routes)
//   + lastMileWalk        (lastMileDistanceKm × WALKING_PACE_MIN_PER_KM)
//
// Note: For multi routes, baseTransitTime represents the combined
// in-vehicle time (feeder + metro).  The trafficBuffer represents
// the road-based feeder leg's traffic variability — the metro portion
// is grade-separated and unaffected by traffic.
export const TRANSIT_NODES: TransitNode[] = [
  {
    id: 'wagholi',
    name: 'Wagholi / Bakori Road',
    routes: [
      {
        id: 'wagholi_direct', type: 'single',
        name: 'Direct PMPML (Route 98/163)',
        transitTimeVaries: true,
        baseTransitTime: 65, trafficBuffer: 25, frequencyMins: 15,
        fare: 50, costText: '₹50 (Direct PMPML Bus Fare)', lastMileDistanceKm: 0.5,
      },
      {
        id: 'wagholi_multimodal', type: 'multi',
        name: 'PMPML Feeder + Aqua Line',
        baseTransitTime: 18, trafficBuffer: 30,
        feederFrequencyMins: 10, metroFrequencyMins: 7.5, transferTimeMins: 4,
        interchangeStation: 'Ramwadi',
        fare: 55, costText: '₹55 (₹25 Bus + ₹30 Metro)', lastMileDistanceKm: 0.5,
      },
      {
        id: 'wagholi_6seater_metro', type: 'multi',
        name: '6-Seater Auto + Aqua Line',
        baseTransitTime: 18, trafficBuffer: 30,
        fillUpWaitTimeMins: 10, metroFrequencyMins: 7.5, transferTimeMins: 4,
        interchangeStation: 'Ramwadi',
        fare: 65, costText: '₹65 (₹35 6-Seater + ₹30 Metro)', lastMileDistanceKm: 0.5,
      },
    ],
    cabBenchmark: '₹350+ Surge',
  },
  {
    id: 'kharadi',
    name: 'Kharadi',
    routes: [
      {
        id: 'kharadi_direct', type: 'single',
        name: 'Direct PMPML (Route 151)',
        baseTransitTime: 60, trafficBuffer: 22, frequencyMins: 12,
        fare: 25, lastMileDistanceKm: 0.4,
      },
      {
        id: 'kharadi_multimodal', type: 'multi',
        name: 'Auto Feeder + Aqua Line',
        baseTransitTime: 14, trafficBuffer: 28,
        feederFrequencyMins: 7, metroFrequencyMins: 7.5, transferTimeMins: 4,
        fare: 45, lastMileDistanceKm: 0.4,
      },
    ],
    cabBenchmark: '₹320+ Surge',
  },
  {
    id: 'viman-nagar',
    name: 'Viman Nagar',
    routes: [
      {
        id: 'viman_direct', type: 'single',
        name: 'Direct PMPML (Route 24)',
        baseTransitTime: 42, trafficBuffer: 15, frequencyMins: 10,
        fare: 20, lastMileDistanceKm: 0.6,
      },
      {
        id: 'viman_multimodal', type: 'multi',
        name: 'Walk + Aqua Line',
        baseTransitTime: 18, trafficBuffer: 5,
        feederFrequencyMins: 15, metroFrequencyMins: 7.5, transferTimeMins: 2,
        fare: 30, lastMileDistanceKm: 0.6,
      },
    ],
    cabBenchmark: '₹220+ Surge',
  },
  {
    id: 'pcmc',
    name: 'PCMC Area',
    routes: [
      {
        id: 'pcmc_multimodal', type: 'multi',
        name: 'Purple Line + Aqua Line',
        baseTransitTime: 30, trafficBuffer: 0,
        metroFrequencyMins: 7.5, transferTimeMins: 5,
        interchangeStation: 'Civil Court',
        fare: 35, lastMileDistanceKm: 0.8,
      },
    ],
    cabBenchmark: '₹380+ Surge',
  },
  {
    id: 'kothrud',
    name: 'Kothrud',
    routes: [
      {
        id: 'kothrud_direct', type: 'single',
        name: 'Direct PMPML (Route 81)',
        baseTransitTime: 48, trafficBuffer: 15, frequencyMins: 10,
        fare: 20, lastMileDistanceKm: 0.3,
      },
      {
        id: 'kothrud_multimodal', type: 'multi',
        name: 'PMPML Feeder + Aqua Line',
        baseTransitTime: 10, trafficBuffer: 20,
        feederFrequencyMins: 10, metroFrequencyMins: 7.5, transferTimeMins: 3,
        fare: 35, lastMileDistanceKm: 0.3,
      },
    ],
    cabBenchmark: '₹250+ Surge',
  },
  {
    id: 'deccan-gymkhana',
    name: 'Deccan Gymkhana',
    routes: [
      {
        id: 'deccan_direct', type: 'single',
        name: 'Direct PMPML (Route 12)',
        baseTransitTime: 28, trafficBuffer: 10, frequencyMins: 8,
        fare: 15, lastMileDistanceKm: 0.2,
      },
      {
        id: 'deccan_multimodal', type: 'multi',
        name: 'Walk + Aqua Line',
        baseTransitTime: 6, trafficBuffer: 5,
        feederFrequencyMins: 15, metroFrequencyMins: 7.5, transferTimeMins: 2,
        fare: 25, lastMileDistanceKm: 0.2,
      },
    ],
    cabBenchmark: '₹180+ Surge',
  },
  {
    id: 'shivajinagar',
    name: 'Shivajinagar',
    routes: [
      {
        id: 'shivaji_direct', type: 'single',
        name: 'Direct PMPML (Route 5)',
        baseTransitTime: 22, trafficBuffer: 12, frequencyMins: 8,
        fare: 15, lastMileDistanceKm: 0.2,
      },
      {
        id: 'shivaji_multimodal', type: 'multi',
        name: 'Walk + Aqua Line',
        baseTransitTime: 8, trafficBuffer: 3,
        feederFrequencyMins: 15, metroFrequencyMins: 7.5, transferTimeMins: 2,
        fare: 25, lastMileDistanceKm: 0.2,
      },
    ],
    cabBenchmark: '₹150+ Surge',
  },
  {
    id: 'hinjawadi',
    name: 'Hinjawadi Phase 3',
    routes: [
      {
        id: 'hinjawadi_direct', type: 'single',
        name: 'Direct PMPML Bus',
        baseTransitTime: 83, trafficBuffer: 35, frequencyMins: 20,
        fare: 50, costText: '₹50 (Direct Bus Fare)', lastMileDistanceKm: 1.2,
      },
      {
        id: 'hinja_multimodal', type: 'multi',
        name: 'Bus Feeder + Aqua Line',
        baseTransitTime: 16, trafficBuffer: 35,
        feederFrequencyMins: 12, metroFrequencyMins: 7.5, transferTimeMins: 5,
        fare: 40, lastMileDistanceKm: 0.5,
      },
    ],
    cabBenchmark: '₹650 - ₹800+ (High Surge Pricing)',
  },
  {
    id: 'wakad',
    name: 'Wakad',
    routes: [
      {
        id: 'wakad_direct', type: 'single',
        name: 'Direct PMPML (Route 71)',
        baseTransitTime: 55, trafficBuffer: 20, frequencyMins: 12,
        fare: 25, lastMileDistanceKm: 0.4,
      },
      {
        id: 'wakad_multimodal', type: 'multi',
        name: 'Auto Feeder + Aqua Line',
        baseTransitTime: 14, trafficBuffer: 28,
        feederFrequencyMins: 7, metroFrequencyMins: 7.5, transferTimeMins: 4,
        fare: 40, lastMileDistanceKm: 0.4,
      },
    ],
    cabBenchmark: '₹300+ Surge',
  },
  {
    id: 'baner',
    name: 'Baner',
    routes: [
      {
        id: 'baner_direct', type: 'single',
        name: 'Direct PMPML (Route 42)',
        baseTransitTime: 38, trafficBuffer: 15, frequencyMins: 10,
        fare: 20, lastMileDistanceKm: 0.3,
      },
      {
        id: 'baner_multimodal', type: 'multi',
        name: 'Bus Feeder + Aqua Line',
        baseTransitTime: 12, trafficBuffer: 18,
        feederFrequencyMins: 10, metroFrequencyMins: 7.5, transferTimeMins: 3,
        fare: 35, lastMileDistanceKm: 0.3,
      },
    ],
    cabBenchmark: '₹230+ Surge',
  },
  {
    id: 'katraj',
    name: 'Katraj / Dhankawadi',
    routes: [
      {
        id: 'katraj_direct', type: 'single',
        name: 'Direct PMPML Bus',
        baseTransitTime: 55, trafficBuffer: 20, frequencyMins: 10,
        fare: 20, lastMileDistanceKm: 1.2,
      },
      {
        id: 'katraj_multimodal', type: 'multi',
        name: 'Shared Auto + Metro',
        baseTransitTime: 15, trafficBuffer: 25,
        feederFrequencyMins: 5, metroFrequencyMins: 7.5, transferTimeMins: 3,
        fare: 45, lastMileDistanceKm: 1.2,
      },
    ],
    cabBenchmark: '₹280+ Surge',
  },
  {
    id: 'hadapsar',
    name: 'Hadapsar',
    routes: [
      {
        id: 'hadap_direct', type: 'single',
        name: 'Direct PMPML (Route 65)',
        baseTransitTime: 52, trafficBuffer: 20, frequencyMins: 12,
        fare: 25, lastMileDistanceKm: 0.5,
      },
      {
        id: 'hadap_multimodal', type: 'multi',
        name: 'Auto Feeder + Aqua Line',
        baseTransitTime: 12, trafficBuffer: 26,
        feederFrequencyMins: 7, metroFrequencyMins: 7.5, transferTimeMins: 4,
        fare: 45, lastMileDistanceKm: 0.5,
      },
    ],
    cabBenchmark: '₹290+ Surge',
  },
  {
    id: 'kalyani-nagar',
    name: 'Kalyani Nagar',
    routes: [
      {
        id: 'kalyani_direct', type: 'single',
        name: 'Direct PMPML (Route 24A)',
        baseTransitTime: 32, trafficBuffer: 12, frequencyMins: 10,
        fare: 20, lastMileDistanceKm: 0.3,
      },
      {
        id: 'kalyani_multimodal', type: 'multi',
        name: 'Walk + Aqua Line',
        baseTransitTime: 8, trafficBuffer: 5,
        feederFrequencyMins: 15, metroFrequencyMins: 7.5, transferTimeMins: 2,
        fare: 25, lastMileDistanceKm: 0.3,
      },
    ],
    cabBenchmark: '₹190+ Surge',
  },
  {
    id: 'camp',
    name: 'Camp',
    routes: [
      {
        id: 'camp_direct', type: 'single',
        name: 'Direct PMPML (Route 1)',
        baseTransitTime: 28, trafficBuffer: 10, frequencyMins: 8,
        fare: 15, lastMileDistanceKm: 0.2,
      },
      {
        id: 'camp_multimodal', type: 'multi',
        name: 'Walk + Aqua Line',
        baseTransitTime: 12, trafficBuffer: 3,
        feederFrequencyMins: 15, metroFrequencyMins: 7.5, transferTimeMins: 2,
        fare: 25, lastMileDistanceKm: 0.2,
      },
    ],
    cabBenchmark: '₹170+ Surge',
  },
  {
    id: 'pimpri',
    name: 'Pimpri',
    routes: [
      {
        id: 'pimpri_direct', type: 'single',
        name: 'Direct PMPML (Route 34)',
        baseTransitTime: 48, trafficBuffer: 18, frequencyMins: 12,
        fare: 25, lastMileDistanceKm: 0.4,
      },
      {
        id: 'pimpri_multimodal', type: 'multi',
        name: 'Purple Line + Aqua Line',
        baseTransitTime: 10, trafficBuffer: 5,
        feederFrequencyMins: 7.5, metroFrequencyMins: 7.5, transferTimeMins: 5,
        fare: 35, lastMileDistanceKm: 0.4,
      },
    ],
    cabBenchmark: '₹260+ Surge',
  },
  {
    id: 'aundh',
    name: 'Aundh',
    routes: [
      {
        id: 'aundh_direct', type: 'single',
        name: 'Direct PMPML (Route 27)',
        baseTransitTime: 36, trafficBuffer: 14, frequencyMins: 10,
        fare: 20, lastMileDistanceKm: 0.3,
      },
      {
        id: 'aundh_multimodal', type: 'multi',
        name: 'Auto Feeder + Aqua Line',
        baseTransitTime: 10, trafficBuffer: 16,
        feederFrequencyMins: 7, metroFrequencyMins: 7.5, transferTimeMins: 3,
        fare: 35, lastMileDistanceKm: 0.3,
      },
    ],
    cabBenchmark: '₹210+ Surge',
  },
  {
    id: 'bavdhan',
    name: 'Bavdhan',
    routes: [
      {
        id: 'bavdhan_direct', type: 'single',
        name: 'Direct PMPML (Route 62)',
        baseTransitTime: 44, trafficBuffer: 16, frequencyMins: 12,
        fare: 20, lastMileDistanceKm: 0.4,
      },
      {
        id: 'bavdhan_multimodal', type: 'multi',
        name: 'Bus Feeder + Aqua Line',
        baseTransitTime: 12, trafficBuffer: 20,
        feederFrequencyMins: 10, metroFrequencyMins: 7.5, transferTimeMins: 3,
        fare: 35, lastMileDistanceKm: 0.4,
      },
    ],
    cabBenchmark: '₹240+ Surge',
  },
  {
    id: 'swargate',
    name: 'Swargate',
    routes: [
      {
        id: 'swargate_direct', type: 'single',
        name: 'Direct PMPML (Route 3)',
        baseTransitTime: 32, trafficBuffer: 12, frequencyMins: 8,
        fare: 15, lastMileDistanceKm: 0.2,
      },
      {
        id: 'swargate_multimodal', type: 'multi',
        name: 'Walk + Aqua Line',
        baseTransitTime: 6, trafficBuffer: 5,
        feederFrequencyMins: 15, metroFrequencyMins: 7.5, transferTimeMins: 2,
        fare: 25, lastMileDistanceKm: 0.2,
      },
    ],
    cabBenchmark: '₹200+ Surge',
  },
];

// ── Section 7: Type definitions ──────────────────────────────────────────────
export interface StudentProfile {
  name: string;
  email: string;
  college: string;
  startingHub: string;       // TransitNode.id
  classStartTime: string;    // "HH:MM" 24-hr format, default "08:30"
}

// Detailed per-leg breakdown for a route calculation.
export interface RouteCalculation {
  route: RouteOption;
  // Wait times (computed from frequencies or fill-up staging).
  feederWaitTime: number;    // feederFrequencyMins / 2, OR fillUpWaitTimeMins if present
  metroWaitTime: number;     // metroFrequencyMins / 2 (rounded)
  busWaitTime: number;       // frequencyMins / 2 (rounded, for single-mode)
  // True if this route uses a 6-seater shared auto (fill-up wait instead of frequency).
  usesSixSeater: boolean;
  fillUpWaitTime: number;    // fillUpWaitTimeMins (0 if not a 6-seater route)
  // Transit times.
  baseTransitTime: number;              // unchanged ideal time
  adjustedTrafficBuffer: number;        // trafficBuffer × (1.5 if peak, else 1.0)
  transferTime: number;                 // transferTimeMins (multi only)
  lastMileWalkTime: number;             // lastMileDistanceKm × WALKING_PACE_MIN_PER_KM
  // Total.
  totalDynamicTime: number;             // full door-to-campus time
  leaveByTime: string;                  // classStartTime − totalDynamicTime
  // Metadata.
  isPeakHour: boolean;
  peakLabel: string;
}

export interface DeparturePlan {
  classStartTime: string;
  calculations: RouteCalculation[];
  netTimeSaved: number;      // single.totalDynamicTime − multi.totalDynamicTime
  cabBenchmark: string;
  nodeName: string;
}

export interface CommuteLog {
  date: string;
  actualMinutes: number;
  savedMinutes: number;
}
