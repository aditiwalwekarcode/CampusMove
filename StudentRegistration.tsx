import { ArrowUpRight, Sparkles } from 'lucide-react';

export default function StudentRegistration() {
  return (
    <section className="animate-slide-up overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm shadow-emerald-500/5 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900 dark:backdrop-blur-md sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
          <Sparkles className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Pilot Program</p>
      </div>

      <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
        Join the Exclusive Pilot
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        We&apos;re onboarding 200 Pune students to test smart routing. Save an average of 15+ minutes on your daily commute.
      </p>

      <a
        href="https://tally.so/r/Zj4lvv"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 hover:shadow-emerald-400/30 active:scale-[0.98]"
      >
        Apply for Pilot 🚀
        <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
      </a>
    </section>
  );
}
