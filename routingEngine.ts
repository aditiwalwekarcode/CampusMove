// ═══════════════════════════════════════════════════════════════════════════
// CampusMove v3 — Dynamic Routing Engine with Real Wait-Time Math
// ═══════════════════════════════════════════════════════════════════════════
//
//  DYNAMIC WAIT-TIME MATH (for your B.Tech notes):
//  ─────────────────────────────────────────────────────────────────────────
//
//  1. WAIT-TIME HELPER: calculateWaitTime(frequency)
//     When you arrive at a bus stop or metro platform at a random time,
//     the AVERAGE wait until the next vehicle arrives is HALF the headway
//     (frequency).  This is because, on average, you arrive at the midpoint
//     between two consecutive departures.
//
//       averageWait = frequency / 2
//
//     Example: If buses come every 15 minutes, the average wait is 7.5 min.
//     We round to the nearest integer for display.
//
//  2. MULTI-MODAL TOTAL TIME:
//     The multi-modal commute has more legs than single-mode:
//
//       totalDynamicTime =
//         + feederWaitTime       (feederFrequencyMins / 2)
//         + baseTransitTime      (combined feeder + metro in-vehicle time)
//         + adjustedTrafficBuffer (trafficBuffer × peak multiplier)
//         + transferTime         (transferTimeMins — walking between stops)
//         + metroWaitTime        (metroFrequencyMins / 2)
//         + lastMileWalkTime     (lastMileDistanceKm × 15 min/km)
//
//     The transferTimeMins represents the real interchange window at the
//     transfer station (e.g. 5 min at Civil Court for Purple→Aqua).
//     transitTimeVaries on single-mode routes flags that traffic can
//     extend the baseTransitTime — the trafficBuffer captures this.
//
//     Note: baseTransitTime for multi routes already includes BOTH the
//     feeder ride and the metro ride.  The trafficBuffer represents only
//     the road-based feeder leg's variability (metros are grade-separated).
//     The metroWaitTime is added separately because you must wait for the
//     metro after completing the transfer walk.
//
//  3. SINGLE-MODE TOTAL TIME:
//       totalDynamicTime =
//         + busWaitTime          (frequencyMins / 2)
//         + baseTransitTime      (bus in-vehicle time)
//         + adjustedTrafficBuffer (trafficBuffer × peak multiplier)
//         + lastMileWalkTime     (lastMileDistanceKm × 15 min/km)
//
//  4. BACKWARD PLANNING:
//       leaveByTime = classStartTime − totalDynamicTime
//
//  5. PEAK-HOUR MULTIPLIER:
//     If classStartTime is between 08:00–10:30 or 17:00–19:30,
//     trafficBuffer is multiplied by 1.5×.  baseTransitTime and
//     frequencies are NOT affected.
// ═══════════════════════════════════════════════════════════════════════════

import {
  WALKING_PACE_MIN_PER_KM,
  PEAK_MORNING_START,
  PEAK_MORNING_END,
  PEAK_EVENING_START,
  PEAK_EVENING_END,
  PEAK_MULTIPLIER,
  TRANSIT_NODES,
  type StudentProfile,
  type RouteOption,
  type RouteCalculation,
  type DeparturePlan,
  type TransitNode,
} from './data';

// ── Utility: convert "HH:MM" → minutes from midnight ────────────────────────
function timeStrToMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ── Utility: minutes → "HH:MM AM/PM" ────────────────────────────────────────
function minToTimeStr(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ── Core helper: calculate average wait time from frequency ──────────────────
// The average wait = frequency / 2, because on average you arrive at the
// midpoint between two departures.  We round to the nearest whole minute.
//
// Example: calculateWaitTime(15) → 8 (rounded from 7.5)
//          calculateWaitTime(7.5) → 4 (rounded from 3.75)
export function calculateWaitTime(frequency: number): number {
  return Math.round(frequency / 2);
}

// ── Utility: check if a time falls in peak hours ────────────────────────────
function checkPeakHour(timeMin: number): { isPeak: boolean; label: string } {
  if (timeMin >= PEAK_MORNING_START && timeMin <= PEAK_MORNING_END) {
    return { isPeak: true, label: 'Morning Peak' };
  }
  if (timeMin >= PEAK_EVENING_START && timeMin <= PEAK_EVENING_END) {
    return { isPeak: true, label: 'Evening Peak' };
  }
  return { isPeak: false, label: 'Off-Peak' };
}

// ── Core: calculate a single route's dynamic time ───────────────────────────
function calculateRoute(
  route: RouteOption,
  classStartMin: number,
  isPeak: boolean
): RouteCalculation {
  const peak = checkPeakHour(classStartMin);

  // Step 1 — Adjust traffic buffer for peak hours.
  // Only trafficBuffer is multiplied; baseTransitTime and frequencies are NOT.
  const adjustedTrafficBuffer = isPeak
    ? Math.round(route.trafficBuffer * PEAK_MULTIPLIER)
    : route.trafficBuffer;

  // Step 2 — Calculate last-mile walking time.
  // lastMileWalkTime = round(lastMileDistanceKm × WALKING_PACE_MIN_PER_KM)
  const lastMileWalkTime = Math.round(route.lastMileDistanceKm * WALKING_PACE_MIN_PER_KM);

  // Step 3 — Calculate wait times based on route type.
  let feederWaitTime = 0;
  let metroWaitTime = 0;
  let busWaitTime = 0;
  let transferTime = 0;

  // Detect 6-seater shared auto routes: these use a fixed fill-up wait
  // time instead of a frequency-based wait.
  const usesSixSeater = route.fillUpWaitTimeMins !== undefined;
  let fillUpWaitTime = 0;

  if (route.type === 'multi') {
    // Multi-modal: feeder wait + transfer + metro wait.
    //
    // If the route uses a 6-seater shared auto (fillUpWaitTimeMins is set),
    // the feeder wait is the FIXED fill-up staging time — not half a
    // frequency.  This is because 6-seaters don't run on a schedule;
    // they wait at the auto stand until all 6 seats are filled, then
    // depart.  The wait is typically 8–12 minutes.
    //
    // Otherwise, feederWaitTime = feederFrequencyMins / 2 (average wait).
    if (usesSixSeater) {
      feederWaitTime = route.fillUpWaitTimeMins ?? 0;
      fillUpWaitTime = feederWaitTime;
    } else {
      feederWaitTime = route.feederFrequencyMins ? calculateWaitTime(route.feederFrequencyMins) : 0;
    }
    // metroWaitTime = metroFrequencyMins / 2 (average wait at metro platform)
    metroWaitTime = route.metroFrequencyMins ? calculateWaitTime(route.metroFrequencyMins) : 0;
    // transferTime = transferTimeMins (walking between feeder stop and metro platform)
    transferTime = route.transferTimeMins ?? 0;
  } else {
    // Single-mode: just the bus wait.
    // busWaitTime = frequencyMins / 2 (average wait at the bus stop)
    busWaitTime = route.frequencyMins ? calculateWaitTime(route.frequencyMins) : 0;
  }

  // Step 4 — Total dynamic commute time.
  //
  // MULTI-MODAL formula:
  //   feederWait + baseTransitTime + adjustedTrafficBuffer
  //   + transferTime + metroWait + lastMileWalk
  //
  // SINGLE-MODE formula:
  //   busWait + baseTransitTime + adjustedTrafficBuffer + lastMileWalk
  //
  // Note: For multi routes, baseTransitTime includes BOTH the feeder
  // in-vehicle time and the metro in-vehicle time.  The trafficBuffer
  // accounts only for the road-based feeder leg's traffic variability.
  // The metroWait is added separately because the student waits for the
  // metro AFTER completing the transfer walk.
  const totalDynamicTime = route.type === 'multi'
    ? feederWaitTime + route.baseTransitTime + adjustedTrafficBuffer + transferTime + metroWaitTime + lastMileWalkTime
    : busWaitTime + route.baseTransitTime + adjustedTrafficBuffer + lastMileWalkTime;

  // Step 5 — Backward planning: subtract total from class start time.
  const leaveByMin = classStartMin - totalDynamicTime;

  return {
    route,
    feederWaitTime,
    metroWaitTime,
    busWaitTime,
    usesSixSeater,
    fillUpWaitTime,
    baseTransitTime: route.baseTransitTime,
    adjustedTrafficBuffer,
    transferTime,
    lastMileWalkTime,
    totalDynamicTime,
    leaveByTime: minToTimeStr(leaveByMin),
    isPeakHour: peak.isPeak,
    peakLabel: peak.label,
  };
}

// ── Core: build the full departure plan ──────────────────────────────────────
export function calculateDeparturePlan(profile: StudentProfile): DeparturePlan | null {
  if (!profile.classStartTime || !profile.startingHub) return null;

  const node: TransitNode | undefined = TRANSIT_NODES.find((n) => n.id === profile.startingHub);
  if (!node) return null;

  const classStartMin = timeStrToMin(profile.classStartTime);
  const peak = checkPeakHour(classStartMin);

  const calculations = node.routes.map((route) =>
    calculateRoute(route, classStartMin, peak.isPeak)
  );

  const singleCalc = calculations.find((c) => c.route.type === 'single');
  const multiCalcs = calculations.filter((c) => c.route.type === 'multi');
  // The fastest multi route gives the best net time saved.
  const fastestMulti = multiCalcs.length > 0
    ? multiCalcs.reduce((best, c) => c.totalDynamicTime < best.totalDynamicTime ? c : best)
    : undefined;

  // Net time saved = single total − fastest multi total.
  const netTimeSaved = singleCalc && fastestMulti
    ? singleCalc.totalDynamicTime - fastestMulti.totalDynamicTime
    : 0;

  return {
    classStartTime: minToTimeStr(classStartMin),
    calculations,
    netTimeSaved,
    cabBenchmark: node.cabBenchmark,
    nodeName: node.name,
  };
}

// ── Utility: live minutes remaining ──────────────────────────────────────────
export function getLiveMinutesRemaining(leaveByTimeStr: string): number {
  const timePart = leaveByTimeStr.split(' ')[0];
  const ampm = leaveByTimeStr.split(' ')[1];
  const [h, m] = timePart.split(':').map(Number);
  let h24 = h;
  if (ampm === 'PM' && h !== 12) h24 = h + 12;
  if (ampm === 'AM' && h === 12) h24 = 0;
  const leaveMin = h24 * 60 + m;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return leaveMin - nowMin;
}
