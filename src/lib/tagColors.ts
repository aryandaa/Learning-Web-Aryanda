/**
 * Warna badge tag yang konsisten: tag populer dipetakan manual,
 * sisanya di-hash ke palet. Warna yang sama selalu untuk tag yang sama.
 */
const CURATED: Record<string, string> = {
  programming: 'indigo',
  cybersecurity: 'rose',
  devops: 'violet',
  jaringan: 'sky',
  webdev: 'teal',
  output: 'emerald',
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
  indigo: 'bg-indigo-400/20 text-indigo-200 border-indigo-400/40',
  sky: 'bg-sky-400/20 text-sky-200 border-sky-400/40',
  emerald: 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40',
  amber: 'bg-amber-400/20 text-amber-200 border-amber-400/40',
  rose: 'bg-rose-400/20 text-rose-200 border-rose-400/40',
  violet: 'bg-violet-400/20 text-violet-200 border-violet-400/40',
  teal: 'bg-teal-400/20 text-teal-200 border-teal-400/40',
  orange: 'bg-orange-400/20 text-orange-200 border-orange-400/40',
  cyan: 'bg-cyan-400/20 text-cyan-200 border-cyan-400/40',
  fuchsia: 'bg-fuchsia-400/20 text-fuchsia-200 border-fuchsia-400/40',
  lime: 'bg-lime-400/20 text-lime-200 border-lime-400/40',
  slate: 'bg-slate-400/20 text-slate-200 border-slate-400/40',
};

/* ============================================================
   Tag khusus (meta): roadmap, subskill, myskill, latihan.
   Tampil sebagai badge tersendiri. berbeda dari tag topik biasa.
   ============================================================ */
export const SPECIAL_TAGS = ['roadmap', 'subskill', 'myskill', 'latihan'] as const;

export type SpecialTag = (typeof SPECIAL_TAGS)[number];

export const SPECIAL_TAG_CLASSES: Record<SpecialTag, string> = {
  roadmap: 'bg-amber-400/25 text-amber-200 border-amber-400/60',
  subskill: 'bg-violet-400/25 text-violet-200 border-violet-400/60',
  myskill: 'bg-emerald-400/25 text-emerald-200 border-emerald-400/60',
  latihan: 'bg-orange-400/25 text-orange-200 border-orange-400/60',
};

export function isSpecialTag(tag: string): boolean {
  return SPECIAL_TAGS.includes(tag.toLowerCase() as SpecialTag);
}

/** Tag khusus tampil paling depan, sisanya tetap urutan aslinya. */
export function sortTags(tags: string[]): string[] {
  const order: Record<string, number> = {
    roadmap: 0,
    subskill: 1,
    myskill: 2,
    latihan: 3,
  };
  return [...tags].sort((a, b) => {
    const isA = isSpecialTag(a);
    const isB = isSpecialTag(b);
    if (isA && isB) return (order[a.toLowerCase()] ?? 0) - (order[b.toLowerCase()] ?? 0);
    if (isA) return -1;
    if (isB) return 1;
    return 0;
  });
}
