/**
 * Username Analyzer — daftar platform publik + tautan profil (manual check).
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { ErrorAlert, LabeledTextarea, Notice, Panel, ToolNotes } from '../../../cysec-tools/components/ui';
import { USERNAME_PLATFORMS, profileUrl, validateUsername } from '../../utils/username';
import { safeExternalUrl } from '../../utils/shared';
import type { ComponentType } from 'react';

function UsernameAnalyzerTool() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<{ name: string; url: string; note?: string; category: string }[] | null>(null);

  const run = () => {
    setError(null);
    const err = validateUsername(username);
    if (err) {
      setError(err);
      setLinks(null);
      return;
    }
    const u = username.trim();
    const list = USERNAME_PLATFORMS.map((p) => {
      const url = profileUrl(p, u);
      return { name: p.name, url: url ?? '', note: p.note, category: p.category };
    }).filter((x) => safeExternalUrl(x.url));
    setLinks(list);
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Buat daftar profil</Button>

      <Panel title="Input">
        <LabeledTextarea id="osint-username-input" label="Username" value={username} onChange={setUsername} rows={1} placeholder="aryanda" />
      </Panel>

      <ErrorAlert message={error} />

      <Notice tone="info">
        Presence does not prove identity. The same username may belong to different people. Tool ini hanya membentuk
        tautan publik — tidak ada pengecekan/scraping otomatis, dan tidak mengakses data privat.
      </Notice>

      {links && (
        <Panel title={`Platform publik (${links.length})`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {links.map((l) => (
              <a
                key={l.name}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 transition-colors hover:border-indigo-500/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-200">{l.name}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">{l.category}</span>
                </div>
                <p className="mt-0.5 break-all font-mono text-[11px] text-indigo-400">{l.url}</p>
                {l.note && <p className="mt-0.5 text-[11px] text-slate-500">{l.note}</p>}
                <p className="mt-1 text-[10px] text-slate-600">Status: requires manual verification</p>
              </a>
            ))}
          </div>
        </Panel>
      )}

      <ToolNotes
        notes={[
          { title: 'What is this?', content: 'Menyusun tautan profil publik dari username di berbagai platform. Fokus pada availability/presence publik — bukan data privat.' },
          { title: 'How to use', content: 'Masukkan username, klik Buat daftar profil, lalu buka "Open Public Profile" (buka manual) untuk verifikasi.' },
          { title: 'Input', content: 'Username.' },
          { title: 'Output', content: 'Daftar platform + URL profil.' },
          { title: 'Notes', content: 'Username yang sama bisa milik orang berbeda. Jangan gunakan untuk doxxing atau deanonymisasi individu privat. Status selalu "requires manual verification" karena tidak ada pengecekan otomatis.' },
        ]}
      />
    </div>
  );
}

export const tools: Record<string, ComponentType> = { username: UsernameAnalyzerTool };
export default UsernameAnalyzerTool;
