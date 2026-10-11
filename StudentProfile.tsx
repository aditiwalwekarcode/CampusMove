import { User, Mail, GraduationCap, MapPin, Clock, AlertCircle, Flame } from 'lucide-react';
import { COLLEGES, TRANSIT_NODES, type StudentProfile as Profile } from '@/lib/data';

interface Props {
  profile: Profile;
  onChange: (p: Profile) => void;
  emailError: string;
}

export default function StudentProfileForm({ profile, onChange, emailError }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm shadow-indigo-500/5 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900 dark:backdrop-blur-md sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/15">
          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Student Profile & Timetable</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Set your details so we can plan your commute.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Name */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <User className="h-3.5 w-3.5 text-slate-400" /> Name
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => onChange({ ...profile, name: e.target.value })}
            placeholder="e.g. Aarav Sharma"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Mail className="h-3.5 w-3.5 text-slate-400" /> College Email
          </label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => onChange({ ...profile, email: e.target.value })}
            placeholder="e.g., aditi@despu.edu.in"
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 dark:bg-slate-700/50 dark:text-white dark:placeholder:text-slate-500 ${
              emailError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-600'
            }`}
          />
          {emailError && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-500">
              <AlertCircle className="h-3 w-3" /> {emailError}
            </p>
          )}
        </div>

        {/* College */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> College
          </label>
          <select
            value={profile.college}
            onChange={(e) => onChange({ ...profile, college: e.target.value })}
            className="max-h-60 w-full overflow-y-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white" value="">Select your college…</option>
            {COLLEGES.map((c) => (
              <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white" key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Starting Hub */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-slate-400" /> Starting Point (Hub)
          </label>
          <select
            value={profile.startingHub}
            onChange={(e) => onChange({ ...profile, startingHub: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white" value="">Select your starting hub…</option>
            {TRANSIT_NODES.map((n) => (
              <option className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white" key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </div>

        {/* Class Start Time */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Clock className="h-3.5 w-3.5 text-slate-400" /> Daily Class Start Time
          </label>
          <input
            type="time"
            value={profile.classStartTime}
            onChange={(e) => onChange({ ...profile, classStartTime: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white"
          />
        </div>

        {/* Peak hour info */}
        <div className="flex items-end">
          <div className="flex w-full items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 ring-1 ring-orange-200/60 dark:bg-orange-500/10 dark:ring-orange-500/20">
            <Flame className="h-4 w-4 shrink-0 text-orange-500" />
            <p className="text-[11px] font-medium text-orange-700 dark:text-orange-300">
              Classes between 08:00–10:30 or 17:00–19:30 trigger a 1.5× peak traffic multiplier.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
