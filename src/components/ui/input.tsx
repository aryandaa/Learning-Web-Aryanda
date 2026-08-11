import { cn } from '../../lib/utils';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 placeholder:text-slate-500',
        'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
        className
      )}
      {...props}
    />
  );
}
