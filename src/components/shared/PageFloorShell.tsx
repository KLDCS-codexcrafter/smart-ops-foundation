/**
 * PageFloorShell.tsx — Sprint TXUI-5.1 · T-TXUI51-Universal-Floor
 *
 * THE FLOOR CANON for every non-voucher surface (trackers · dashboards ·
 * wizards · document/report inboxes). Presentation-only · ZERO data logic
 * inside · zero fetch · zero mutation · zero store access.
 *
 * Renders:
 *   - standard page header (title · optional subtitle)
 *   - optional filterSlot (caller-supplied)
 *   - optional actionSlot (caller-supplied)
 *   - HONEST states: loading skeleton · empty (no fabricated rows) · error
 *   - children (the surface's existing content — pass-through unchanged)
 *   - DocSendBar (ONLY when docSend prop provided — document_report case)
 *
 * Iron Canon: PRESENTATION-ONLY. This is a shared COMPONENT, NOT a lib engine.
 */
import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DocSendBar } from '@/components/shared/DocSendBar';

export interface PageFloorShellDocSend {
  objectType: string;
  sourceCard: string;
  sourceRecord: Record<string, unknown> & { id?: string };
}

export interface PageFloorShellProps {
  title: string;
  subtitle?: string;
  filterSlot?: ReactNode;
  actionSlot?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  error?: string | null;
  children?: ReactNode;
  /** When provided, mounts DocSendBar (document_report surfaces only). */
  docSend?: PageFloorShellDocSend;
  className?: string;
}

export function PageFloorShell({
  title,
  subtitle,
  filterSlot,
  actionSlot,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No records yet.',
  error = null,
  children,
  docSend,
  className,
}: PageFloorShellProps): JSX.Element {
  return (
    <section
      className={`space-y-4 animate-fade-in ${className ?? ''}`}
      data-floor-shell="txui-5.1"
      aria-label={title}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actionSlot && (
          <div className="flex items-center gap-2 flex-wrap">{actionSlot}</div>
        )}
      </header>

      {docSend && (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <DocSendBar
            objectType={docSend.objectType}
            sourceCard={docSend.sourceCard}
            sourceRecord={docSend.sourceRecord}
          />
        </div>
      )}

      {filterSlot && (
        <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
          {filterSlot}
        </div>
      )}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : isLoading ? (
        <div className="space-y-2" data-state="loading">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ) : isEmpty ? (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/10 py-10 text-center"
          data-state="empty"
        >
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export default PageFloorShell;
