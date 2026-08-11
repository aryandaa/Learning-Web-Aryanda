/**
 * Warna badge tag yang konsisten: tag populer dipetakan manual,
 * sisanya di-hash ke palet. Warna yang sama selalu untuk tag yang sama.
 */
const CURATED: Record<string, string> = {
  programming: 'indigo',
  cybersecurity: 'rose',
  devops: 'violet',
  roadmap: 'amber',
  jaringan: 'sky',
  webdev: 'teal',
  subskill: 'cyan',
  output: 'emerald',
  latihan: 'orange',
  myskill: 'fuchsia',
  python: 'emerald',
  javascript: 'amber',
  php: 'violet',
  html: 'orange',
  css: 'sky',
  react: 'cyan',
  nodejs: 'lime',
  docker: 'sky',
  git: 'orange',
  linux: 'slate',
  database: 'teal',
};

const PALETTE = [
  'indigo',
  'sky',
  'emerald',
  'amber',
  'rose',
  'violet',
  'teal',
  'orange',
  'cyan',
  'fuchsia',
  'lime',
  'slate',
];

export type TagColorName = (typeof PALETTE)[number];

export function tagColorName(tag: string): TagColorName {
  const key = tag.toLowerCase();
  const curated = CURATED[key];
  if (curated) return curated as TagColorName;

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length] as TagColorName;
}

/** Kelas Tailwind statis (aman untuk purge) per warna. */
export const TAG_COLOR_CLASSES: Record<TagColorName, string> = {
  indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  teal: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  orange: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  fuchsia: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  lime: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};
