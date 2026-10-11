import { MapPin, Sun, Moon } from 'lucide-react';

interface Props {
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function Header({ darkMode, onToggleDark }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Official brand logo */}
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="CampusMove Logo"
            className="h-10 w-auto rounded-lg shadow-sm"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:ring-emerald-500/20 sm:flex">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Pune Metro · Aqua Line
            </span>
          </div>
          <button
            onClick={onToggleDark}
            aria-label="Toggle dark mode"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 transition hover:bg-slate-200 active:scale-90 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700/70 dark:hover:bg-slate-800"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-amber-400" strokeWidth={2.2} />
            ) : (
              <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
