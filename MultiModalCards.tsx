import {
  Bus, Train, Car, Clock, IndianRupee, AlertTriangle, Zap, Footprints,
  TrendingDown, Gauge, ArrowRight, Users, CircleDot,
} from 'lucide-react';
import type { DeparturePlan, RouteCalculation } from '@/lib/data';
import type { ReactNode } from 'react';

interface Props {
  plan: DeparturePlan;
}

export default function MultiModalCards({ plan }: Props) {
  const singleCalc = plan.calculations.find((c) => c.route.type === 'single');
  const multiCalcs = plan.calculations.filter((c) => c.route.type === 'multi');
  if (multiCalcs.length === 0) return null;

  const recommended = multiCalcs.reduce((best, c) =>
    c.totalDynamicTime < best.totalDynamicTime ? c : best
  );
  const otherMulti = multiCalcs.filter((c) => c !== recommended);

  return (
    <section className="animate-slide-up space-y-4">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compare Commute Modes</h3>
      </div>

      {/* Bottom sheet on mobile, regular grid on desktop */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {singleCalc && (
          <RouteCard calc={singleCalc} variant="single" isRecommended={false} />
        )}
        <RouteCard
          calc={recommended}
          variant="multi"
          isRecommended={true}
          netTimeSaved={singleCalc ? singleCalc.totalDynamicTime - recommended.totalDynamicTime : undefined}
        />
        {otherMulti.map((calc) => (
          <RouteCard
            key={calc.route.id}
            calc={calc}
            variant="multi"
            isRecommended={false}
            netTimeSaved={singleCalc ? singleCalc.totalDynamicTime - calc.totalDynamicTime : undefined}
          />
        ))}
      </div>

      {/* Cab Benchmark Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50 to-orange-50 p-4 shadow-lg shadow-red-500/5 dark:border-red-500/20 dark:from-red-500/10 dark:to-orange-500/10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/20">
          <Car className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={2.2} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Direct Cab / Ride-Hail</p>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-400">
              Over Budget
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            {plan.cabBenchmark} at peak hours. Subject to surge pricing and unpredictable delays.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-extrabold text-red-600 dark:text-red-400">{plan.cabBenchmark}</p>
          <p className="text-[10px] font-semibold text-red-500/70">
            ~{Math.round((singleCalc?.totalDynamicTime ?? recommended.totalDynamicTime) * 1.4)}–{Math.round((singleCalc?.totalDynamicTime ?? recommended.totalDynamicTime) * 1.8)} min
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Route Card ───────────────────────────────────────────────────────────────

function RouteCard({
  calc,
  variant,
  isRecommended,
  netTimeSaved,
}: {
  calc: RouteCalculation;
  variant: 'single' | 'multi';
  isRecommended: boolean;
  netTimeSaved?: number;
}) {
  const isMulti = variant === 'multi';
  const route = calc.route;
  const isSixSeater = calc.usesSixSeater;

  const icon = isSixSeater ? (
    <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
  ) : isMulti ? (
    <Train className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <Bus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  );

  const accentColor = isMulti ? 'emerald' : 'blue';
  const accentBg = isMulti ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-blue-50 dark:bg-blue-500/15';
  const accentText = isMulti ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400';
  const accentFare = isMulti ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300';
  const accentFareBg = isMulti ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-blue-50 dark:bg-blue-500/10';

  const cardClass = isRecommended
    ? 'rounded-2xl border border-slate-200/60 bg-white p-5 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-50 dark:border-slate-700/50 dark:bg-slate-900 dark:ring-offset-slate-950 sm:p-6'
    : 'rounded-2xl border border-slate-200/60 bg-white p-5 shadow-lg shadow-indigo-500/5 dark:border-slate-700/50 dark:bg-slate-900 sm:p-6';

  return (
    <div className={`relative overflow-hidden ${cardClass}`}>
      {isRecommended && (
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
          <Zap className="h-3 w-3" /> Fastest
        </div>
      )}

      {/* Header: icon + route name LEFT, massive fare RIGHT */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accentBg}`}>
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {isSixSeater ? '6-Seater + Metro' : isMulti ? 'Multi-Modal' : 'Direct Bus'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{route.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-black leading-none ${accentFare}`}>
            ₹{route.fare}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {route.costText ?? 'Standard adult fare'}
          </p>
        </div>
      </div>

      {/* Time + Leave-by pill row */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-lg font-extrabold text-slate-900 dark:text-white">
            {calc.totalDynamicTime}
          </span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">min</span>
        </div>
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ${accentFareBg}`}>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Leave by</span>
          <span className={`text-lg font-extrabold ${accentText}`}>
            {calc.leaveByTime}
          </span>
        </div>
      </div>

      {/* Moovit-style vertical timeline */}
      <VerticalTimeline calc={calc} isMulti={isMulti} isSixSeater={isSixSeater} accentColor={accentColor} />

      {/* Net time saved / slower badges */}
      {isRecommended && netTimeSaved !== undefined && netTimeSaved > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
          <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Net Time Saved: {netTimeSaved} min
            </p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">vs. direct route</p>
          </div>
        </div>
      )}

      {!isRecommended && netTimeSaved !== undefined && netTimeSaved > 0 && (
        <div className="mt-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" /> {netTimeSaved} min slower than fastest
          </span>
        </div>
      )}

      {/* Full-width action button */}
      <button className={`mt-4 w-full rounded-xl py-4 text-center text-lg font-bold text-white transition active:scale-[0.98] ${
        isMulti
          ? 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500'
          : 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500'
      }`}>
        {isMulti ? 'Choose Multi-Modal Route' : 'Choose Direct Bus'}
      </button>
    </div>
  );
}

// ── Moovit-Style Vertical Timeline ───────────────────────────────────────────

interface TimelineLeg {
  icon: ReactNode;
  label: string;
  duration: string;
  note?: string;
  isHighlight?: boolean;
}

function VerticalTimeline({
  calc,
  isMulti,
  isSixSeater,
  accentColor,
}: {
  calc: RouteCalculation;
  isMulti: boolean;
  isSixSeater: boolean;
  accentColor: string;
}) {
  const route = calc.route;
  const legs: TimelineLeg[] = [];

  if (isMulti) {
    // Feeder / 6-seater wait
    legs.push({
      icon: isSixSeater ? <Users className="h-4 w-4" /> : <Bus className="h-4 w-4" />,
      label: isSixSeater ? '6-Seater fill-up wait' : 'Feeder wait',
      duration: `${isSixSeater ? calc.fillUpWaitTime : calc.feederWaitTime} min`,
      note: isSixSeater
        ? `Fill-up at Auto Stand`
        : `Avg wait (${route.feederFrequencyMins} min freq)`,
    });

    // Feeder + metro transit
    legs.push({
      icon: <Train className="h-4 w-4" />,
      label: 'Transit (feeder + metro)',
      duration: `${calc.baseTransitTime} min`,
      note: 'Combined in-vehicle time',
    });

    // Interchange
    legs.push({
      icon: <ArrowRight className="h-4 w-4" />,
      label: 'Interchange',
      duration: `${calc.transferTime} min`,
      note: route.interchangeStation ? `at ${route.interchangeStation}` : 'Transfer between stops',
    });

    // Metro wait
    legs.push({
      icon: <Train className="h-4 w-4" />,
      label: 'Metro wait',
      duration: `${calc.metroWaitTime} min`,
      note: `Avg wait (${route.metroFrequencyMins} min headway)`,
    });

    // Traffic buffer
    if (calc.adjustedTrafficBuffer > 0) {
      legs.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Traffic buffer',
        duration: `${calc.adjustedTrafficBuffer} min${calc.isPeakHour ? ' (1.5×)' : ''}`,
        note: calc.isPeakHour ? 'Peak multiplier applied' : 'Normal variability',
        isHighlight: calc.isPeakHour,
      });
    }
  } else {
    // Single-mode
    legs.push({
      icon: <Bus className="h-4 w-4" />,
      label: 'Bus wait',
      duration: `${calc.busWaitTime} min`,
      note: `Avg wait (${route.frequencyMins} min freq)`,
    });
    legs.push({
      icon: <Bus className="h-4 w-4" />,
      label: 'Bus transit',
      duration: `${calc.baseTransitTime} min`,
      note: 'In-vehicle travel time',
    });
    if (calc.adjustedTrafficBuffer > 0) {
      legs.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Traffic buffer',
        duration: `${calc.adjustedTrafficBuffer} min${calc.isPeakHour ? ' (1.5×)' : ''}`,
        note: calc.isPeakHour ? 'Peak multiplier applied' : 'Normal variability',
        isHighlight: calc.isPeakHour,
      });
    }
  }

  // Last-mile walk (always present)
  legs.push({
    icon: <Footprints className="h-4 w-4" />,
    label: 'Last-mile walk',
    duration: `${calc.lastMileWalkTime} min`,
    note: `${route.lastMileDistanceKm} km × 15 min/km`,
  });

  const iconBg = accentColor === 'emerald'
    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
    : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
  const highlightIconBg = 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';

  return (
    <div className="relative pl-2">
      {/* Dashed vertical line */}
      <div className="absolute bottom-4 left-[22px] top-4 border-l-2 border-dashed border-slate-300 dark:border-slate-600" />

      <div className="space-y-4">
        {legs.map((leg, i) => (
          <div key={i} className="flex items-center gap-3">
            {/* Icon circle on the dashed line */}
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${
              leg.isHighlight ? highlightIconBg : iconBg
            }`}>
              {leg.icon}
            </div>
            {/* Description */}
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold ${leg.isHighlight ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {leg.label}
              </p>
              {leg.note && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{leg.note}</p>
              )}
            </div>
            {/* Duration */}
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
