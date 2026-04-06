import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, description, icon, children, className }: FormSectionProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 space-y-4', className)}>
      <div className="flex items-center gap-3 mb-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
