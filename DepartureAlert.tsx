import {
  AlarmClock, Clock, TrendingDown, Flame, Footprints, Bus, Train,
  ArrowRight, Users, CircleDot,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { DeparturePlan, RouteCalculation } from '@/lib/data';

interface Props {
  plan: DeparturePlan;
  selectedRouteId: string;
  liveMinutesRemaining: number;
}

export default function DepartureAlert({ plan, selectedRouteId, liveMinutesRemaining }: Props) {
  const calc = plan.calculations.find((c) => c.route.id === selectedRouteId) ?? plan.calculations[0];
  if (!calc) return null;

  const isUrgent = liveMinutesRemaining <= 15 && liveMinutesRemaining > 0;
  const hasLeft = liveMinutesRemaining <= 0;
  const isMulti = calc.route.type === 'multi';

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-lg shadow-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-900">
      {/* Alert banner */}
      <div
        className={`px-5 py-6 sm:px-8 ${
          hasLeft
            ? 'bg-gradient-to-r from-slate-700 to-slate-900'
            : isUrgent
              ? 'bg-gradient-to-r from-red-500 to-orange-600 animate-pulse-slow'
              : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlarmClock className="mt-1 h-7 w-7 shrink-0 text-white" strokeWidth={2.5} />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Dynamic Departure Alert
                </p>
                {calc.isPeakHour && (
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase text-white">
                    <Flame className="h-3 w-3" /> {calc.peakLabel}
                  </span>
                )}
              </div>
              <p className="mt-1 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                {calc.leaveByTime}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/90">
                Leave {plan.nodeName} → campus by {plan.classStartTime}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            {!hasLeft && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Time Remaining
                </p>
                <p className="text-3xl font-black tabular-nums text-white sm:text-4xl">
                  {liveMinutesRemaining}
                </p>
                <p className="text-[11px] font-semibold text-white/80">minutes</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body: timeline + summary */}
      <div className="px-5 py-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Journey Breakdown — {calc.route.name}
          </h3>
          {calc.isPeakHour && (
            <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
              <Flame className="h-3 w-3" /> 1.5× Traffic
            </span>
          )}
        </div>

        {/* Moovit-style vertical timeline */}
        <DepartureTimeline calc={calc} isMulti={isMulti} />

        {/* Total + fare summary */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Total Dynamic Commute
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {calc.totalDynamicTime} <span className="text-sm font-bold text-slate-500">min</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {calc.route.costText ?? `₹${calc.route.fare} Total Fare`}
            </span>
          </div>
        </div>

        {/* Net time saved */}
        {plan.netTimeSaved > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
            <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Multi-Modal saves {plan.netTimeSaved} min vs Direct Route
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Moovit-Style Vertical Timeline for Departure Alert ───────────────────────

function DepartureTimeline({ calc, isMulti }: { calc: RouteCalculation; isMulti: boolean }) {
  const route = calc.route;
  const isSixSeater = calc.usesSixSeater;

  interface Leg {
    icon: ReactNode;
    label: string;
    duration: string;
    note?: string;
    isHighlight?: boolean;
    iconBg: string;
  }

  const legs: Leg[] = [];

  if (isMulti) {
    legs.push({
      icon: isSixSeater ? <Users className="h-4 w-4" /> : <Bus className="h-4 w-4" />,
      label: isSixSeater ? '6-Seater Fill-Up Wait' : 'Feeder Wait',
      duration: `${isSixSeater ? calc.fillUpWaitTime : calc.feederWaitTime} min`,
      note: isSixSeater
        ? `Fill-up at Auto Stand`
        : `Avg wait (${route.feederFrequencyMins} min frequency / 2)`,
      iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    });
    legs.push({
      icon: <Train className="h-4 w-4" />,
      label: 'Feeder + Metro Transit',
      duration: `${calc.baseTransitTime} min`,
      note: 'Combined in-vehicle time',
      iconBg: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
    });
    legs.push({
      icon: <ArrowRight className="h-4 w-4" />,
      label: 'Transfer / Interchange',
      duration: `${calc.transferTime} min`,
      note: route.interchangeStation
        ? `${calc.transferTime} min interchange at ${route.interchangeStation}`
        : `Includes ${calc.transferTime} min interchange`,
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    });
    legs.push({
      icon: <Train className="h-4 w-4" />,
      label: 'Metro Wait',
      duration: `${calc.metroWaitTime} min`,
      note: `Avg wait (${route.metroFrequencyMins} min headway / 2)`,
      iconBg: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
    });
    if (calc.adjustedTrafficBuffer > 0) {
      legs.push({
        icon: <Flame className="h-4 w-4" />,
        label: 'Traffic Buffer',
        duration: `${calc.adjustedTrafficBuffer} min${calc.isPeakHour ? ' (1.5× peak)' : ''}`,
        note: calc.isPeakHour ? 'Peak multiplier applied' : 'Normal variability',
        isHighlight: calc.isPeakHour,
        iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
      });
    }
  } else {
    legs.push({
      icon: <Bus className="h-4 w-4" />,
      label: 'Bus Wait',
      duration: `${calc.busWaitTime} min`,
      note: `Avg wait (${route.frequencyMins} min frequency / 2)`,
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    });
    legs.push({
      icon: <Bus className="h-4 w-4" />,
      label: 'Bus Transit Time',
      duration: `${calc.baseTransitTime} min`,
      note: 'In-vehicle travel time',
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    });
    if (calc.adjustedTrafficBuffer > 0) {
      legs.push({
        icon: <Flame className="h-4 w-4" />,
        label: 'Traffic Buffer',
        duration: `${calc.adjustedTrafficBuffer} min${calc.isPeakHour ? ' (1.5× peak)' : ''}`,
        note: calc.isPeakHour ? 'Peak multiplier applied' : 'Normal variability',
        isHighlight: calc.isPeakHour,
        iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
      });
    }
  }

  legs.push({
    icon: <Footprints className="h-4 w-4" />,
    label: 'Last-Mile Walk',
    duration: `${calc.lastMileWalkTime} min`,
    note: `${route.lastMileDistanceKm} km × 15 min/km`,
    iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  });

  return (
    <div className="relative pl-2">
      {/* Dashed vertical line */}
      <div className="absolute bottom-4 left-[22px] top-4 border-l-2 border-dashed border-slate-300 dark:border-slate-600" />

      <div className="space-y-4">
        {legs.map((leg, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${leg.iconBg}`}>
              {leg.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold ${leg.isHighlight ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {leg.label}
              </p>
              {leg.note && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{leg.note}</p>
              )}
            </div>
            <span className={`shrink-0 text-sm font-bold ${leg.isHighlight ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {leg.duration}
            </span>
          </div>
        ))}

        {/* Endpoint marker */}
        <div className="flex items-center gap-3">
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 ring-4 ring-white dark:bg-slate-200 dark:ring-slate-900">
            <CircleDot className="h-4 w-4 text-white dark:text-slate-800" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white">Arrive at Campus</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Total: {calc.totalDynamicTime} min</p>
          </div>
        </div>
      </div>
    </div>
  );
}
