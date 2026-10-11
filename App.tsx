import { useState, useEffect, useCallback } from 'react';
import type { StudentProfile, DeparturePlan, CommuteLog } from '@/lib/data';
import { calculateDeparturePlan, getLiveMinutesRemaining } from '@/lib/routingEngine';
import Header from '@/components/Header';
import StudentProfileForm from '@/components/StudentProfile';
import DepartureAlert from '@/components/DepartureAlert';
import MultiModalCards from '@/components/MultiModalCards';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import LiveTripTracker from '@/components/LiveTripTracker';
import { Gauge, Map as MapIcon } from 'lucide-react';
import StudentRegistration from '@/components/StudentRegistration';

const STORAGE_KEY = 'campusmove_state_v3';
const DARK_KEY = 'campusmove_dark';

interface PersistedState {
  profile: StudentProfile;
  logs: CommuteLog[];
  baselineMinutes: number;
}

const defaultProfile: StudentProfile = {
  name: '',
  email: '',
  college: '',
  startingHub: '',
  classStartTime: '08:30',
};

function App() {
  const [profile, setProfile] = useState<StudentProfile>(defaultProfile);
  const [logs, setLogs] = useState<CommuteLog[]>([]);
  const [baselineMinutes, setBaselineMinutes] = useState<number>(0);
  const [plan, setPlan] = useState<DeparturePlan | null>(null);
  const [liveRemaining, setLiveRemaining] = useState<number>(0);
  const [now, setNow] = useState(new Date());
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [activeView, setActiveView] = useState<'comparison' | 'journey'>('comparison');

  // Load persisted state + dark mode
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: PersistedState = JSON.parse(raw);
        setProfile(parsed.profile ?? defaultProfile);
        setLogs(parsed.logs ?? []);
        setBaselineMinutes(parsed.baselineMinutes ?? 0);
      }
    } catch {
      // ignore
    }
    const stored = localStorage.getItem(DARK_KEY);
    // Default to dark mode unless the user has explicitly opted out.
    const isDark = stored !== 'false';
    setDarkMode(isDark);
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(DARK_KEY, String(darkMode));
  }, [darkMode]);

  // Persist state
  useEffect(() => {
    const state: PersistedState = { profile, logs, baselineMinutes };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [profile, logs, baselineMinutes]);

  // Recalculate plan
  useEffect(() => {
    setPlan(calculateDeparturePlan(profile));
  }, [profile]);

  // Live clock + countdown
  useEffect(() => {
    const tick = () => {
      setNow(new Date());
      if (plan) {
        const calc = plan.calculations.find((c) => c.route.id === selectedRouteId) ?? plan.calculations[0];
        if (calc) setLiveRemaining(getLiveMinutesRemaining(calc.leaveByTime));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [plan, selectedRouteId]);

  // Email validation — allow .edu.in, .ac.in, or .edu domains
  const emailError = (() => {
    if (!profile.email) return '';
    const lower = profile.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
      return 'Email must end with .edu.in or .ac.in';
    }
    if (!(lower.endsWith('.edu.in') || lower.endsWith('.ac.in') || lower.endsWith('.edu'))) {
      return 'Email must end with .edu.in or .ac.in';
    }
    return '';
  })();

  const handleLogCommute = useCallback((entry: CommuteLog) => {
    setLogs((prev) => [...prev, entry]);
  }, []);

  const toggleDark = useCallback(() => setDarkMode((prev) => !prev), []);

  const canShowPlan = plan !== null && profile.startingHub !== '' && profile.classStartTime !== '';
  const todayStr = now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  const clockStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  // Auto-select the fastest multi route when plan changes.
  useEffect(() => {
    if (plan) {
      const multiCalcs = plan.calculations.filter((c) => c.route.type === 'multi');
      const fastest = multiCalcs.length > 0
        ? multiCalcs.reduce((best, c) => c.totalDynamicTime < best.totalDynamicTime ? c : best)
        : plan.calculations[0];
      if (fastest) setSelectedRouteId(fastest.route.id);
    }
  }, [plan]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Header darkMode={darkMode} onToggleDark={toggleDark} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <img
          src="/banner.png"
          alt="CampusMove Cover Banner"
          className="mb-6 h-32 w-full rounded-2xl border border-slate-800/50 object-cover shadow-lg md:h-48"
        />

        {/* Live clock bar */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-300">{todayStr}</p>
          <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 shadow-sm ring-1 ring-slate-700/70 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-bold tabular-nums text-slate-200">{clockStr}</span>
          </div>
        </div>

        {/* Route toggle — one button per available route */}
        {canShowPlan && plan && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alert for:</span>
            {plan.calculations.map((c) => (
              <button
                key={c.route.id}
                onClick={() => setSelectedRouteId(c.route.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  selectedRouteId === c.route.id
                    ? c.route.type === 'multi'
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                      : 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                    : 'bg-white/70 text-slate-600 ring-1 ring-slate-200/60 backdrop-blur-sm dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/50'
                }`}
              >
                {c.usesSixSeater ? '6-Seater + Metro' : c.route.type === 'multi' ? 'Multi-Modal' : 'Single-Mode'}
              </button>
            ))}
          </div>
        )}

        {/* Desktop: 3-column grid. Mobile: top-pinned content + bottom-sheet route cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Top section: profile + departure alert (pinned on mobile) */}
          <div className="space-y-6 lg:col-span-2">
            <StudentProfileForm
              profile={profile}
              onChange={setProfile}
              emailError={emailError}
            />

            {canShowPlan && plan ? (
              <DepartureAlert
                plan={plan}
                selectedRouteId={selectedRouteId}
                liveMinutesRemaining={liveRemaining}
              />
            ) : (
              <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-10 text-center backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  Select a starting hub and class time to generate your departure alert.
                </p>
              </div>
            )}

            {canShowPlan && plan ? (
              <>
                {/* View tab toggle */}
                <div className="mb-1 flex items-center gap-2">
                  <button
                    onClick={() => setActiveView('comparison')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      activeView === 'comparison'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'bg-white/70 text-slate-600 ring-1 ring-slate-200/60 backdrop-blur-sm dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/50'
                    }`}
                  >
                    <Gauge className="h-3.5 w-3.5" /> Route Comparison
                  </button>
                  <button
                    onClick={() => setActiveView('journey')}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      activeView === 'journey'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                        : 'bg-white/70 text-slate-600 ring-1 ring-slate-200/60 backdrop-blur-sm dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/50'
                    }`}
                  >
                    <MapIcon className="h-3.5 w-3.5" /> Live Journey View
                  </button>
                </div>

                {/* Rapido-style bottom sheet on mobile, regular section on desktop */}
                {activeView === 'comparison' ? (
                  <div className="rounded-3xl bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:rounded-none lg:bg-transparent lg:shadow-none dark:bg-slate-900 lg:dark:bg-transparent">
                    <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 lg:hidden dark:bg-slate-700" />
                    <MultiModalCards plan={plan} />
                  </div>
                ) : (
                  <LiveTripTracker
                    selectedCalc={plan.calculations.find((c) => c.route.id === selectedRouteId) ?? plan.calculations[0] ?? null}
                    darkMode={darkMode}
                  />
                )}
              </>
            ) : null}
          </div>

          <div className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-20">
              <StudentRegistration />
              <AnalyticsTracker
                plan={plan}
                selectedRouteId={selectedRouteId}
                logs={logs}
                onLog={handleLogCommute}
                baselineMinutes={baselineMinutes}
                onBaselineChange={setBaselineMinutes}
              />
            </div>
          </div>
        </div>

        <footer className="mt-10 border-t border-slate-200/60 pt-6 text-center dark:border-slate-700/50">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            CampusMove · Pilot Build · Dynamic Multi-Modal Commute Engine with Real Pune Transit Data
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
