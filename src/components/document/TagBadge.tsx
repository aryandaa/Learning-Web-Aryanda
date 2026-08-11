import { cn } from '../../lib/utils';
import { tagColorName, TAG_COLOR_CLASSES } from '../../lib/tagColors';

/**
 * Badge tag berwarna. Warna konsisten per tag — tag yang sama
 * selalu tampil dengan warna yang sama.
 */
export function TagBadge({ tag, className }: { tag: string; className?: string }) {
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
