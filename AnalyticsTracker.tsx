import { useState } from 'react';
import { BarChart3, Plus, TrendingDown, Target, Trophy, Clock } from 'lucide-react';
import type { DeparturePlan, CommuteLog } from '@/lib/data';

interface Props {
  plan: DeparturePlan | null;
  selectedRouteId: string;
  logs: CommuteLog[];
  onLog: (entry: CommuteLog) => void;
  baselineMinutes: number;
  onBaselineChange: (min: number) => void;
}

export default function AnalyticsTracker({ plan, selectedRouteId, logs, onLog, baselineMinutes, onBaselineChange }: Props) {
  const [baselineInput, setBaselineInput] = useState<string>(baselineMinutes ? String(baselineMinutes) : '');
  const [justLogged, setJustLogged] = useState(false);

  const totalSaved = logs.reduce((sum, l) => sum + l.savedMinutes, 0);
  const avgSaved = logs.length > 0 ? Math.round(totalSaved / logs.length) : 0;
  const goalPct = Math.min(100, Math.round((avgSaved / 15) * 100));

  const handleSetBaseline = () => {
    const val = parseInt(baselineInput, 10);
    if (!isNaN(val) && val > 0) onBaselineChange(val);
  };

  const handleLogToday = () => {
    if (!plan || baselineMinutes <= 0) return;
    const calc = plan.calculations.find((c) => c.route.id === selectedRouteId) ?? plan.calculations[0];
    if (!calc) return;
    const actualMinutes = calc.totalDynamicTime;
    const saved = baselineMinutes - actualMinutes;

    onLog({
      date: new Date().toISOString().split('T')[0],
      actualMinutes,
      savedMinutes: saved,
    });
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2500);
  };

  const currentRouteTime = plan?.calculations.find((c) => c.route.id === selectedRouteId)?.totalDynamicTime ?? 0;

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-lg shadow-indigo-500/5 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80 dark:backdrop-blur-md sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/15">
          <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Pilot Analytics Tracker</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Prove the 15-minute optimization goal.</p>
        </div>
      </div>

      {/* Baseline input */}
      <div className="mb-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-700/30">
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Clock className="h-3.5 w-3.5 text-slate-400" /> Self-reported baseline commute time (minutes)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={baselineInput}
            onChange={(e) => setBaselineInput(e.target.value)}
            placeholder="e.g. 75"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
          <button
            onClick={handleSetBaseline}
            className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 active:scale-95 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            Set
          </button>
        </div>
        {baselineMinutes > 0 && (
          <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Baseline: <span className="font-bold text-slate-700 dark:text-slate-200">{baselineMinutes} min</span>
            {' · '}Optimized: <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentRouteTime} min</span>
            {' · '}Saved: <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.max(0, baselineMinutes - currentRouteTime)} min</span>
          </p>
        )}
      </div>

      {/* Log button */}
      <button
        onClick={handleLogToday}
        disabled={!plan || baselineMinutes <= 0}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {justLogged ? 'Logged!' : "Log Today's Commute"}
      </button>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />} label="Total Saved" value={totalSaved} unit="min" accent="emerald" />
        <StatCard icon={<Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />} label="Avg / Trip" value={avgSaved} unit="min" accent="blue" />
        <StatCard icon={<Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />} label="Trips" value={logs.length} unit="" accent="amber" />
      </div>

      {/* Goal gauge */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>15-Minute Optimization Goal</span>
          <span className={goalPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
            {avgSaved}/15 min
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              goalPct >= 100
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                : 'bg-gradient-to-r from-blue-400 to-cyan-500'
            }`}
            style={{ width: `${Math.max(2, goalPct)}%` }}
          />
        </div>
        {goalPct >= 100 && (
          <p className="mt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Goal achieved! Saving {avgSaved} min per trip on average.
          </p>
        )}
      </div>

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700/50">
          <h4 className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">Recent Logs</h4>
          <div className="space-y-1.5">
            {logs.slice(-5).reverse().map((l, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] dark:bg-slate-700/30">
                <span className="font-medium text-slate-600 dark:text-slate-400">{l.date}</span>
                <span className="text-slate-500 dark:text-slate-500">{l.actualMinutes} min</span>
                <span className={`font-bold ${l.savedMinutes > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {l.savedMinutes > 0 ? '+' : ''}{l.savedMinutes} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const accentMap: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
};

function StatCard({ icon, label, value, unit, accent }: { icon: React.ReactNode; label: string; value: number; unit: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-3 text-center dark:border-slate-700/50 dark:bg-slate-700/30">
      <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${accentMap[accent]}`}>
        {icon}
      </div>
      <p className="text-lg font-extrabold text-slate-900 dark:text-white">
        {value}<span className="text-xs font-bold text-slate-400"> {unit}</span>
      </p>
      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
