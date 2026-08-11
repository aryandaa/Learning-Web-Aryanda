import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
        neutral: 'bg-slate-800 text-slate-400 border border-slate-700',
        subtle: 'bg-slate-800/60 text-slate-400',
        success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
