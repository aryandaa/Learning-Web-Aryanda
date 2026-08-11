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

/* ============================================================
   Tag khusus (meta): roadmap, subskill, myskill, latihan.
   Tampil sebagai badge tersendiri — berbeda dari tag topik biasa.
   ============================================================ */
export const SPECIAL_TAGS = ['roadmap', 'subskill', 'myskill', 'latihan'] as const;

export type SpecialTag = (typeof SPECIAL_TAGS)[number];

export const SPECIAL_TAG_CLASSES: Record<SpecialTag, string> = {
  roadmap: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
  subskill: 'bg-violet-500/20 text-violet-300 border-violet-500/50',
  myskill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
  latihan: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
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
