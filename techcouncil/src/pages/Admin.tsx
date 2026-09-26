import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CATEGORIES, categoryLabel } from '@/data/categories';
import { LogoMark } from '@/components/brand/LogoMark';
import { EASE_OUT } from '@/lib/motion';

interface Suggestion {
  id: number;
  text: string;
  category: string;
  name: string | null;
  grade: string | null;
  created_at: string;
}

const CATEGORY_TONE: Record<string, string> = {
  network: 'bg-cyan/15 text-cyan-ink border-cyan/40',
  classroom: 'bg-orange/15 text-orange-ink border-orange/40',
  apps: 'bg-maroon/25 text-maroon-ink border-maroon/50',
  campus: 'bg-teal/20 text-teal-ink border-teal/50',
  other: 'bg-white/5 text-fog-200 border-white/15',
};

function csvCell(v: string | number | null) {
  const s = v === null ? '' : String(v);
  // Neutralise spreadsheet formulas and quote everything.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportCsv(rows: Suggestion[]) {
  const header = ['id', 'created_at', 'category', 'text', 'name', 'grade'];
  const lines = [header.join(','), ...rows.map((r) => [r.id, r.created_at, categoryLabel(r.category), r.text, r.name, r.grade].map(csvCell).join(','))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tis-tech-council-suggestions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = 'Suggestions · TIS Tech Council admin';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const load = async (e?: FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { suggestions?: Suggestion[]; error?: string };
      if (!res.ok || !data.suggestions) {
        setError(data.error ?? `Request failed (${res.status}).`);
        if (res.status === 401) setAuthed(false);
        return;
      }
      setRows(data.suggestions);
      setAuthed(true);
    } catch {
      setError('Couldn’t reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.category] = (c[r.category] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === 'all' || r.category === filter) &&
        (!q || r.text.toLowerCase().includes(q) || (r.name ?? '').toLowerCase().includes(q)),
    );
  }, [rows, filter, query]);

  if (!authed) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center px-4">
        <motion.form
          onSubmit={load}
          className="border rule bg-night-800 relative w-full max-w-sm rounded-[28px] p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          <LogoMark className="h-12 w-12 text-paper" />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-paper">Council admin</h1>
          <p className="mt-1 text-sm text-fog-300">Enter the admin password to read suggestions.</p>
          <label htmlFor="admin-password" className="mt-6 block text-xs font-medium text-fog-200">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 block h-11 w-full rounded-xl border border-white/10 bg-night/60 px-3.5 text-[16px] text-paper focus:border-orange-ink/60 focus:outline-none focus:ring-4 focus:ring-orange-ink/10"
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || !password} className="btn-primary mt-6 w-full disabled:opacity-60">
            {loading ? 'Checking…' : 'Unlock'}
          </button>
          <a href="/" className="mt-5 block text-center text-xs text-fog-300 hover:text-paper">
            ← Back to site
          </a>
        </motion.form>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] pb-20">
      <header className="sticky top-0 z-20 border-b rule bg-night/80 backdrop-blur-xl">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8 text-paper" />
            <span className="font-display font-semibold tracking-tight text-paper">Suggestions</span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => load()} disabled={loading} className="btn-secondary h-9 px-4 text-sm">
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" onClick={() => exportCsv(visible)} disabled={visible.length === 0} className="h-9 rounded-full bg-white px-4 text-sm font-semibold text-night disabled:opacity-50">
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthed(false);
                setPassword('');
                setRows([]);
              }}
              className="hidden h-9 rounded-full px-3 text-sm text-fog-300 hover:text-paper sm:block"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="container-x pt-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-paper">{rows.length} suggestions</h1>
            <p className="mt-1 text-sm text-fog-300">Newest first. Only visible to the council.</p>
          </div>
          <input
            type="search"
            placeholder="Search text or name…"
            aria-label="Search suggestions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-full border border-white/10 bg-night-800 px-4 text-sm text-paper placeholder:text-fog-400 focus:border-orange-ink/60 focus:outline-none md:w-72"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {[{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={filter === c.id}
              onClick={() => setFilter(c.id)}
              className={`relative isolate rounded-full border px-4 py-1.5 text-sm transition-colors ${filter === c.id ? 'border-transparent text-night' : 'border-white/10 text-fog-200 hover:text-paper'}`}
            >
              {filter === c.id && <motion.span layoutId="admin-filter" className="absolute inset-0 -z-10 rounded-full bg-white" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <span className="relative">
                {c.label} <span className="opacity-60">{counts[c.id] ?? 0}</span>
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <ul className="mt-8 grid gap-3">
          <AnimatePresence initial={false}>
            {visible.map((r) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="rounded-2xl border rule bg-night-800/70 p-5"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full border px-2.5 py-0.5 font-medium ${CATEGORY_TONE[r.category] ?? CATEGORY_TONE.other}`}>{categoryLabel(r.category)}</span>
                  <span className="font-mono text-fog-300">{formatDate(r.created_at)}</span>
                  <span className="font-mono text-fog-400">#{r.id}</span>
                  <span className="ml-auto text-fog-200">
                    {r.name || r.grade ? (
                      <>
                        {r.name || 'No name'}
                        {r.grade && <span className="text-fog-400"> · Grade {r.grade}</span>}
                      </>
                    ) : (
                      <span className="text-fog-400">Anonymous</span>
                    )}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-paper">{r.text}</p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {visible.length === 0 && <p className="mt-16 text-center text-fog-300">No suggestions here yet.</p>}
      </div>
    </main>
  );
}
