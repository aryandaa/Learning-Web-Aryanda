import { cn } from '../../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Memuat"
      className={cn(
        'h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400',
        className
      )}
    />
  );
}
