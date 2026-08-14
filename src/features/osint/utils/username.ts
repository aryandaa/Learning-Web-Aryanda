/**
 * Username OSINT. daftar platform publik + template URL profil.
 * Tidak ada pengecekan otomatis/scraping; status selalu manual.
 */

export interface UsernamePlatform {
  name: string;
  urlTemplate: string;
  category: 'social' | 'code' | 'gaming' | 'tech' | 'other';
  note?: string;
}

export const USERNAME_PLATFORMS: UsernamePlatform[] = [
  { name: 'GitHub', urlTemplate: 'https://github.com/{username}', category: 'code', note: 'Profil + repositori publik.' },
  { name: 'GitLab', urlTemplate: 'https://gitlab.com/{username}', category: 'code' },
  { name: 'Reddit', urlTemplate: 'https://www.reddit.com/user/{username}', category: 'social', note: 'Komentar & postingan publik.' },
  { name: 'X (Twitter)', urlTemplate: 'https://x.com/{username}', category: 'social' },
  { name: 'Mastodon', urlTemplate: 'https://mastodon.social/@{username}', category: 'social', note: 'Instance bervariasi. cek juga di server lain.' },
  { name: 'Keybase', urlTemplate: 'https://keybase.io/{username}', category: 'tech', note: 'Verifikasi identitas kriptografis.' },
  { name: 'Dev.to', urlTemplate: 'https://dev.to/{username}', category: 'code' },
  { name: 'Medium', urlTemplate: 'https://medium.com/@{username}', category: 'tech' },
  { name: 'Twitch', urlTemplate: 'https://www.twitch.tv/{username}', category: 'gaming' },
  { name: 'YouTube', urlTemplate: 'https://www.youtube.com/@{username}', category: 'social' },
  { name: 'Hacker News', urlTemplate: 'https://news.ycombinator.com/user?id={username}', category: 'tech' },
  { name: 'Instagram', urlTemplate: 'https://www.instagram.com/{username}/', category: 'social' },
  { name: 'TikTok', urlTemplate: 'https://www.tiktok.com/@{username}', category: 'social' },
  { name: 'Telegram', urlTemplate: 'https://t.me/{username}', category: 'social', note: 'Username Telegram publik.' },
  { name: 'Steam', urlTemplate: 'https://steamcommunity.com/id/{username}', category: 'gaming' },
  { name: 'Spotify', urlTemplate: 'https://open.spotify.com/user/{username}', category: 'gaming' },
  { name: 'Pinterest', urlTemplate: 'https://www.pinterest.com/{username}/', category: 'social' },
  { name: 'Replit', urlTemplate: 'https://replit.com/@{username}', category: 'code' },
  { name: 'Docker Hub', urlTemplate: 'https://hub.docker.com/u/{username}', category: 'tech' },
  { name: 'NPM', urlTemplate: 'https://www.npmjs.com/~{username}', category: 'code' },
  { name: 'PyPI', urlTemplate: 'https://pypi.org/user/{username}/', category: 'code' },
  { name: 'Disqus', urlTemplate: 'https://disqus.com/by/{username}/', category: 'other' },
];

/** Susun URL profil aman (validasi http/https). */
export function profileUrl(platform: UsernamePlatform, username: string): string | null {
  const url = platform.urlTemplate.replace('{username}', encodeURIComponent(username));
  try {
    const u = new URL(url);
    return u.protocol.startsWith('http') ? u.href : null;
  } catch {
    return null;
  }
}

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (!u) return 'Username kosong.';
  if (u.includes(' ')) return 'Username tidak boleh mengandung spasi.';
  if (u.length < 2) return 'Username terlalu pendek (min 2 karakter).';
  if (u.length > 64) return 'Username terlalu panjang (maks 64 karakter).';
  if (!/^[a-zA-Z0-9._-]+$/.test(u)) return 'Username hanya boleh huruf, angka, titik, underscore, dan strip.';
  return null;
}
