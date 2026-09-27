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
      <main data-surface="light" className="flex min-h-[100svh] items-center justify-center bg-ash px-5 text-obsidian">
        <motion.form
          onSubmit={load}
          className="w-full max-w-sm rounded-card bg-paper p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          <LogoMark className="h-12 w-12 text-obsidian" />
          <h1 className="type-heading mt-6 text-heading-sm">Council admin</h1>
          <p className="mt-2 text-body-sm text-graphite">Enter the admin password to read suggestions.</p>
          <label htmlFor="admin-password" className="mt-6 block text-body-sm">
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
            className="mt-1.5 block h-12 w-full rounded-nav border border-line-light bg-paper px-4 text-body focus:border-obsidian focus:outline-none"
          />
          {error && (
            <p role="alert" className="mt-3 text-body-sm text-danger-light">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || !password} className="pill-solid-light mt-6 w-full disabled:opacity-50">
            {loading ? 'Checking…' : 'Unlock'}
          </button>
          <a href="/" className="mt-5 flex min-h-[44px] items-center justify-center text-body-sm text-graphite hover:text-obsidian">
            Back to site
          </a>
        </motion.form>
      </main>
    );
  }

  return (
    <main data-surface="light" className="min-h-[100svh] bg-paper pb-20 text-obsidian">
      <header className="sticky top-0 z-20 border-b border-line-light bg-paper">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3">
            <LogoMark className="h-8 w-8 text-obsidian" />
            <span className="text-body font-medium">Suggestions</span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => load()} disabled={loading} className="pill-ghost min-h-[40px] px-4 text-body-sm">
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" onClick={() => exportCsv(visible)} disabled={visible.length === 0} className="pill-solid-light min-h-[40px] px-4 text-body-sm disabled:opacity-50">
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthed(false);
                setPassword('');
                setRows([]);
              }}
              className="hidden min-h-[40px] px-3 text-body-sm text-graphite hover:text-obsidian sm:block"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="container-x pt-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="type-heading text-[44px]">{rows.length} suggestions</h1>
            <p className="mt-1 text-body-sm text-graphite">Newest first. Only visible to the council.</p>
          </div>
          <input
            type="search"
            placeholder="Search text or name"
            aria-label="Search suggestions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-pill border border-line-light px-5 text-body-sm focus:border-obsidian focus:outline-none md:w-72"
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {[{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={filter === c.id}
              onClick={() => setFilter(c.id)}
              className={`relative isolate min-h-[40px] rounded-pill border px-4 text-body-sm transition-colors ${filter === c.id ? 'border-obsidian text-paper' : 'border-line-light text-graphite hover:text-obsidian'}`}
            >
              {filter === c.id && <motion.span layoutId="admin-filter" className="absolute inset-0 -z-10 rounded-pill bg-obsidian" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              {c.label} <span className="opacity-60">{counts[c.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-nav border border-danger-light/40 px-4 py-3 text-body-sm text-danger-light">
            {error}
          </p>
        )}

        <ul className="mt-8 border-t border-line-light">
          <AnimatePresence initial={false}>
            {visible.map((r) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="border-b border-line-light py-6"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-graphite">
                  <span className="rounded-pill border border-line-light px-3 py-0.5 text-obsidian">{categoryLabel(r.category)}</span>
                  <span>{formatDate(r.created_at)}</span>
                  <span>#{r.id}</span>
                  <span className="ml-auto">
                    {r.name || r.grade ? (
                      <>
                        {r.name || 'No name'}
                        {r.grade && <> · Grade {r.grade}</>}
                      </>
                    ) : (
                      'Anonymous'
                    )}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-body-lg">{r.text}</p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {visible.length === 0 && <p className="mt-16 text-center text-body text-graphite">No suggestions here yet.</p>}
      </div>
    </main>
  );
}
