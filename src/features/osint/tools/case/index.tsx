/**
 * OSINT Case. case investigasi lokal (localStorage) + export/import JSON.
 */

import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  ErrorAlert, Notice, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { exportJson, nowIso } from '../../utils/shared';
import { cn } from '../../../../lib/utils';
import type { ComponentType } from 'react';

interface CaseTimelineEvent {
  id: string;
  timestamp: string;
  text: string;
}

interface OsintCase {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  iocs: string[];
  notes: string[];
  sources: { title: string; url: string }[];
  timeline: CaseTimelineEvent[];
}

const CASES_KEY = 'osint-cases';

function readCases(): OsintCase[] {
  try {
    const raw = window.localStorage.getItem(CASES_KEY);
    return raw ? (JSON.parse(raw) as OsintCase[]) : [];
  } catch {
    return [];
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function CaseTool() {
  const [cases, setCases] = useState<OsintCase[]>(readCases);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newIoc, setNewIoc] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newEvent, setNewEvent] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(CASES_KEY, JSON.stringify(cases));
    } catch {
      /* abaikan */
    }
  }, [cases]);

  const active = cases.find((c) => c.id === activeId) ?? null;

  const createCase = () => {
    const now = nowIso();
    const c: OsintCase = {
      id: uid(),
      title: 'Case baru',
      description: '',
      createdAt: now,
      updatedAt: now,
      iocs: [],
      notes: [],
      sources: [],
      timeline: [],
    };
    setCases((prev) => [c, ...prev]);
    setActiveId(c.id);
  };

  const update = (patch: Partial<OsintCase>) => {
    if (!active) return;
    setCases((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, ...patch, updatedAt: nowIso() } : c))
    );
  };

  const deleteCase = (id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const exportCase = () => {
    if (!active) return;
    exportJson(active, `osint-case-${active.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`);
  };

  const importCase = (fileText: string) => {
    try {
      const parsed = JSON.parse(fileText) as Partial<OsintCase>;
      if (!parsed.title) throw new Error('JSON harus memiliki field "title".');
      const c: OsintCase = {
        id: parsed.id ?? uid(),
        title: String(parsed.title),
        description: String(parsed.description ?? ''),
        createdAt: parsed.createdAt ?? nowIso(),
        updatedAt: nowIso(),
        iocs: Array.isArray(parsed.iocs) ? parsed.iocs.map(String) : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes.map(String) : [],
        sources: Array.isArray(parsed.sources) ? parsed.sources.map((s) => ({ title: String((s as { title?: unknown }).title ?? ''), url: String((s as { url?: unknown }).url ?? '') })) : [],
        timeline: Array.isArray(parsed.timeline) ? parsed.timeline.map((t) => ({ id: uid(), timestamp: String((t as { timestamp?: unknown }).timestamp ?? ''), text: String((t as { text?: unknown }).text ?? '') })) : [],
      };
      setCases((prev) => [c, ...prev]);
      setActiveId(c.id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File case tidak valid.');
    }
  };

  return (
    <div className="space-y-4">
      <Notice tone="info">
        Case disimpan hanya di localStorage browser (privacy: LOCAL). Tidak ada autentikasi, database, atau backend.
      </Notice>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={createCase}>+ Case baru</Button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500">
          📥 Import Case JSON
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void f.text().then(importCase);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        {/* Daftar case */}
        <Panel title={`Cases (${cases.length})`}>
          {cases.length === 0 && <p className="text-sm text-slate-500">Belum ada case.</p>}
          <div className="space-y-1.5">
            {cases.map((c) => (
              <div key={c.id} className={cn('rounded-lg border px-3 py-2 transition-colors', c.id === activeId ? 'border-accent-500/50 bg-accent-500/10' : 'border-slate-800 bg-slate-900/40')}>
                <button onClick={() => setActiveId(c.id)} className="w-full text-left">
                  <p className="truncate text-sm font-medium text-slate-200">{c.title}</p>
                  <p className="text-[10px] text-slate-600">
                    {c.iocs.length} IOC · {c.notes.length} notes · upd {c.updatedAt.slice(0, 10)}
                  </p>
                </button>
                <button onClick={() => deleteCase(c.id)} className="mt-1 text-[10px] text-slate-600 transition-colors hover:text-red-300">
                  hapus
                </button>
              </div>
            ))}
          </div>
        </Panel>

        {/* Detail case aktif */}
        {active ? (
          <div className="space-y-4">
            <Panel title="Case" action={<Button type="button" variant="secondary" size="sm" onClick={exportCase}>Export Case JSON</Button>}>
              <div className="space-y-3">
                <div>
                  <label htmlFor="case-title" className="mb-1 block text-xs text-slate-400">Title</label>
                  <input
                    id="case-title"
                    value={active.title}
                    onChange={(e) => update({ title: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="case-desc" className="mb-1 block text-xs text-slate-400">Description</label>
                  <textarea
                    id="case-desc"
                    value={active.description}
                    onChange={(e) => update({ description: e.target.value })}
                    rows={3}
                    className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-600">
                  Created {active.createdAt.replace('T', ' ').slice(0, 19)} · Updated {active.updatedAt.replace('T', ' ').slice(0, 19)}
                </p>
              </div>
            </Panel>

            <Panel title={`IOC (${active.iocs.length})`}>
              <div className="flex gap-2">
                <input
                  value={newIoc}
                  onChange={(e) => setNewIoc(e.target.value)}
                  placeholder="contoh: evil.example.com"
                  aria-label="Tambah IOC"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (newIoc.trim()) {
                      update({ iocs: [...active.iocs, newIoc.trim()] });
                      setNewIoc('');
                    }
                  }}
                >
                  + IOC
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {active.iocs.map((ioc, i) => (
                  <span key={i} className="group inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-[11px] text-red-200">
                    {ioc}
                    <button
                      onClick={() => update({ iocs: active.iocs.filter((_, j) => j !== i) })}
                      aria-label={`Hapus ${ioc}`}
                      className="text-red-400/60 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </Panel>

            <Panel title={`Notes (${active.notes.length})`}>
              <div className="flex gap-2">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Catatan investigasi…"
                  aria-label="Tambah note"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (newNote.trim()) {
                      update({ notes: [...active.notes, newNote.trim()] });
                      setNewNote('');
                    }
                  }}
                >
                  + Note
                </Button>
              </div>
              <ul className="mt-2 space-y-1">
                {active.notes.map((n, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 rounded border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-sm text-slate-300">
                    <span className="min-w-0 flex-1 break-all">{n}</span>
                    <button onClick={() => update({ notes: active.notes.filter((_, j) => j !== i) })} className="text-xs text-slate-600 hover:text-red-300" aria-label="Hapus note">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title={`Sources (${active.sources.length})`}>
              <div className="flex gap-2">
                <input
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="URL sumber…"
                  aria-label="Tambah sumber"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (newSource.trim()) {
                      update({ sources: [...active.sources, { title: new URL(newSource.startsWith('http') ? newSource : `https://${newSource}`).hostname, url: newSource.startsWith('http') ? newSource : `https://${newSource}` }] });
                      setNewSource('');
                    }
                  }}
                >
                  + Source
                </Button>
              </div>
              <ul className="mt-2 space-y-1">
                {active.sources.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900/40 px-3 py-1.5">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-xs text-accent-400 hover:text-accent-300">
                      {s.title}. {s.url} ↗
                    </a>
                    <button onClick={() => update({ sources: active.sources.filter((_, j) => j !== i) })} className="text-xs text-slate-600 hover:text-red-300" aria-label="Hapus sumber">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title={`Timeline events (${active.timeline.length})`}>
              <div className="flex gap-2">
                <input
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  placeholder="Event (timestamp opsional diawal: 2026-08-13 10:20:00 …)"
                  aria-label="Tambah event timeline"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (newEvent.trim()) {
                      const m = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?)\s*(.*)$/.exec(newEvent.trim());
                      update({
                        timeline: [
                          ...active.timeline,
                          {
                            id: uid(),
                            timestamp: m ? new Date(m[1].replace(' ', 'T')).toISOString() : '',
                            text: m ? m[2] : newEvent.trim(),
                          },
                        ],
                      });
                      setNewEvent('');
                    }
                  }}
                >
                  + Event
                </Button>
              </div>
              <ul className="mt-2 space-y-1">
                {[...active.timeline].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1)).map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-2 rounded border border-slate-800 bg-slate-900/40 px-3 py-1.5">
                    <div className="min-w-0">
                      {e.timestamp && <p className="font-mono text-[11px] text-emerald-300">{e.timestamp.replace('T', ' ').slice(0, 19)}</p>}
                      <p className="break-all text-sm text-slate-300">{e.text}</p>
                    </div>
                    <button onClick={() => update({ timeline: active.timeline.filter((x) => x.id !== e.id) })} className="text-xs text-slate-600 hover:text-red-300" aria-label="Hapus event">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ) : (
          <Panel title="Detail">
            <p className="text-sm text-slate-500">Pilih atau buat case untuk mulai mengelola investigasi lokal.</p>
          </Panel>
        )}
      </div>

      <ToolNotes
        notes={[
          { title: 'What is this?', content: 'Case investigasi lokal: title, deskripsi, IOC, notes, sources, timeline events.' },
          { title: 'How to use', content: 'Buat case → isi detail → tambah IOC/notes/sources/events. Export/Import JSON untuk menyimpan atau memindahkan investigasi.' },
          { title: 'Input', content: 'Form lokal.' },
          { title: 'Output', content: 'Case tersimpan di localStorage + export JSON.' },
          { title: 'Notes', content: 'Tanpa autentikasi/database/backend. Jangan simpan secret/password di case.' },
        ]}
      />
    </div>
  );
}

export const tools: Record<string, ComponentType> = { case: CaseTool };
export default CaseTool;
