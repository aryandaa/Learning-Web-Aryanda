import { Layers, Map, PencilLine, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  isSpecialTag,
  SPECIAL_TAG_CLASSES,
  tagColorName,
  TAG_COLOR_CLASSES,
  type SpecialTag,
} from '../../lib/tagColors';

const SPECIAL_ICONS: Record<SpecialTag, typeof Map> = {
  roadmap: Map,
  subskill: Layers,
  myskill: Star,
  latihan: PencilLine,
};

/**
 * Badge tag. Tag khusus (meta) — #roadmap, #Subskill, #Myskill, #latihan —
 * tampil dengan ikon + huruf kapital + warna khas, berbeda dari tag topik
 * biasa yang berwarna-warni.
 */
export function TagBadge({ tag, className }: { tag: string; className?: string }) {
  const special = isSpecialTag(tag) ? (tag.toLowerCase() as SpecialTag) : null;

  if (special) {
    const Icon = SPECIAL_ICONS[special];
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
          SPECIAL_TAG_CLASSES[special],
          className
        )}
      >
        <Icon className="h-3 w-3" />
        #{tag}
      </span>
    );
  }

  const color = tagColorName(tag);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        TAG_COLOR_CLASSES[color],
        className
      )}
    >
      #{tag}
    </span>
  );
}
