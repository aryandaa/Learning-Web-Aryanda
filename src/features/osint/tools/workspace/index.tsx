/**
 * OSINT Workspace. kumpulkan IOC dalam satu tempat (localStorage).
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { extractIocs, iocTypeLabel } from '../../utils/ioc';
import { exportJson, exportTxt } from '../../utils/shared';
import { cn } from '../../../../lib/utils';
import type { ComponentType } from 'react';

interface WorkspaceItem {
  id: string;
  value: string;
  type: string;
  tag?: string;
  addedAt: string;
}

const WS_KEY = 'osint-workspace';

const TYPE_COLORS: Record<string, string> = {
  ipv4: 'text-sky-300', ipv6: 'text-sky-300', domain: 'text-emerald-300',
  url: 'text-emerald-300', email: 'text-accent-300', 'hash-md5': 'text-amber-300',
  'hash-sha1': 'text-amber-300', 'hash-sha256': 'text-amber-300', cve: 'text-red-300',
  attack: 'text-red-300', username: 'text-amber-300', other: 'text-slate-400',
};

function readWs(): WorkspaceItem[] {
  try {
    const raw = window.localStorage.getItem(WS_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceItem[]) : [];
  } catch {
    return [];
  }
}

function WorkspaceTool() {
  const [items, setItems] = useState<WorkspaceItem[]>(readWs);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(WS_KEY, JSON.stringify(items.slice(0, 500)));
    } catch {
      /* abaikan */
    }
  }, [items]);

  const add = () => {
    setError(null);
    const lines = input.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setError('Masukkan minimal satu IOC (satu per baris).');
      return;
    }
    const iocs = extractIocs(lines.join('\n'));
    const list: WorkspaceItem[] = lines.map((line, i) => {
      const hit = iocs.find((x) => x.value === line);
      const isUsername = /^[a-zA-Z0-9._-]{2,30}$/.test(line) && !hit;
      return {
        id: `${Date.now()}-${i}`,
        value: line,
        type: hit ? hit.type : isUsername ? 'username' : 'other',
        addedAt: new Date().toISOString(),
      };
    });
    setItems((prev) => [...list, ...prev]);
    setInput('');
  };

  const remove = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));
  const setTag = (id: string, tag: string) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, tag } : x)));
  const clearAll = () => setItems([]);

  const exportRows = items.map((x) => ({ type: x.type, value: x.value, tag: x.tag ?? '' }));
  const grouped = useCallback(
    (type: string) => items.filter((x) => x.type === type),
    [items]
  );

  const groups: { type: string; label: string }[] = [
    { type: 'domain', label: 'Domains' },
    { type: 'url', label: 'URLs' },
    { type: 'ipv4', label: 'IPs' },
    { type: 'ipv6', label: 'IPv6' },
    { type: 'hash-md5', label: 'Hashes' },
    { type: 'hash-sha1', label: 'Hashes' },
    { type: 'hash-sha256', label: 'Hashes' },
    { type: 'email', label: 'Emails' },
    { type: 'username', label: 'Usernames' },
    { type: 'cve', label: 'CVE' },
    { type: 'attack', label: 'ATT&CK' },
    { type: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-4">
      <Notice tone="info">
        Workspace disimpan hanya di localStorage browser Anda (privacy: LOCAL). Tidak ada data dikirim ke server.
      </Notice>

      <Panel title="Tambah IOC">
        <LabeledTextarea
          id="osint-ws-input"
          label="Satu per baris (domain, IP, URL, hash, email, username…) atau tempel teks"
          value={input}
          onChange={setInput}
          rows={4}
          placeholder={'example.com\n192.168.1.1\nd41d8cd98f00b204e9800998ecf8427e'}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={add}>+ Tambah ke workspace</Button>
          <Button variant="ghost" onClick={clearAll}>Hapus semua</Button>
        </div>
      </Panel>

      <ErrorAlert message={error} />

      <Panel
        title={`Workspace (${items.length} item)`}
        action={
          <>
            <CopyButton text={items.map((x) => x.value).join('\n')} label="Copy all" />
            <Button type="button" variant="secondary" size="sm" onClick={() => exportJson(exportRows, 'workspace.json')}>JSON</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => exportTxt(items.map((x) => x.value).join('\n'), 'workspace.txt')}>TXT</Button>
          </>
        }
      >
        {items.length === 0 && <p className="text-sm text-slate-500">Workspace kosong. Tambahkan IOC di atas.</p>}
        <div className="space-y-4">
          {groups.map((g) => {
            const list = grouped(g.type);
            if (list.length === 0) return null;
            return (
              <div key={g.type + g.label}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.label} ({list.length})</p>
                <div className="space-y-1.5">
                  {list.map((x) => (
                    <div key={x.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5">
                      <code className={cn('min-w-0 flex-1 break-all font-mono text-xs', TYPE_COLORS[x.type] ?? 'text-slate-300')}>{x.value}</code>
                      <input
                        value={x.tag ?? ''}
                        onChange={(e) => setTag(x.id, e.target.value)}
                        placeholder="tag…"
                        aria-label={`Tag ${x.value}`}
                        className="h-7 w-24 rounded border border-slate-700 bg-slate-950/70 px-2 text-[11px] text-slate-300 placeholder:text-slate-600 focus:border-accent-500 focus:outline-none"
                      />
                      <CopyButton text={x.value} label="" className="h-7 w-7" />
                      <button
                        onClick={() => remove(x.id)}
                        aria-label={`Hapus ${x.value}`}
                        className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {items.length > 0 && (
          <p className="mt-3 text-xs text-slate-600">
            Tips: nilai yang tidak cocok pola IOC diklasifikasikan "other". Tag membantu korelasi antar kasus.
          </p>
        )}
      </Panel>

      <ToolNotes
        notes={[
          { title: 'What is this?', content: 'Workspace IOC sementara: kumpulkan, kelompokkan, tag, copy, export.' },
          { title: 'How to use', content: 'Tambahkan IOC (satu per baris atau tempel teks), kelola per item.' },
          { title: 'Input', content: 'IOC / teks.' },
          { title: 'Output', content: 'Daftar terkelompok + export JSON/TXT.' },
          { title: 'Notes', content: 'Penyimpanan lokal (localStorage, maks 500 item). Tidak ada API key/password yang disimpan.' },
        ]}
      />
    </div>
  );
}

export const tools: Record<string, ComponentType> = { workspace: WorkspaceTool };
export default WorkspaceTool;
