/**
 * @file        SkeletonRows.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card8-8-pre-2 · Block B · D-411
 * @purpose     Shared loading-state skeleton utility for tabular panels.
 *              Consumed by 11 RequestX panels (D-412 · D-413).
 *              Extracted from Card #6 D-373 + Card #7 D-400 inline patterns.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  children: ReactNode;
  rows?: number;
  loadMs?: number;
}

export function SkeletonRows({ children, rows = 3, loadMs = 100 }: Props): JSX.Element {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), loadMs);
    return () => clearTimeout(t);
  }, [loadMs]);

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: rows }).map((_, i) => <Skeleton key={`sk-${i}`} className="h-9 w-full" />)}
      </div>
    );
  }
  return <>{children}</>;
}
