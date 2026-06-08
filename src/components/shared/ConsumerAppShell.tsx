/**
 * ConsumerAppShell.tsx — Sprint TXUI-6 · T-TXUI6-Consumer-Canonical
 *
 * THE CONSUMER FLOOR CANON for customer-hub / storefront / consumer
 * surfaces. Touch-first storefront aesthetic — card layouts, big CTAs,
 * mobile-first responsive layout, ≥44px touch targets.
 *
 * PRESENTATION-ONLY · zero data logic · zero fetch · zero mutation · zero
 * store access. Distinct from PageFloorShell (admin grid) and from the
 * admin back-office outbox component (never imported here · admin/consumer
 * separation enforced by construction). When a consumer surface produces a
 * shareable artefact (e.g. an order confirmation receipt), it passes a
 * `consumerShare` slot which renders a lightweight share / download
 * action — NEVER the admin outbox.
 *
 * Iron Canon: shared COMPONENT, NOT a lib engine. No engine credit.
 */
import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface ConsumerAppShellProps {
  title: string;
  /** Optional account chip / avatar / sign-in affordance (storefront top-right). */
  accountSlot?: ReactNode;
  /** Optional cart badge / quick-cart trigger (storefront top-right). */
  cartSlot?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  error?: string | null;
  children?: ReactNode;
  /**
   * Optional consumer share / download action — for surfaces that produce
   * a shareable consumer document (e.g. order confirmation receipt).
   * Touch-first, lightweight (download PDF · native share · copy link).
   * EXPLICITLY NOT the admin DocSendBar — never the back-office outbox.
   */
  consumerShare?: ReactNode;
  className?: string;
}

export function ConsumerAppShell({
  title,
  accountSlot,
  cartSlot,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'Nothing here yet.',
  error = null,
  children,
  consumerShare,
  className,
}: ConsumerAppShellProps): JSX.Element {
  return (
    <section
      className={`mx-auto w-full max-w-3xl space-y-4 animate-fade-in px-3 sm:px-4 ${className ?? ''}`}
      data-consumer-shell="txui-6"
      aria-label={title}
    >
      {/* Storefront-style header · touch targets ≥44px (min-h-[44px]) */}
      <header className="flex items-center justify-between gap-3 min-h-[44px]">
        <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
          {title}
        </h1>
        <div className="flex items-center gap-2">
          {accountSlot && (
            <div className="flex items-center min-h-[44px] min-w-[44px] justify-center">
              {accountSlot}
            </div>
          )}
          {cartSlot && (
            <div className="flex items-center min-h-[44px] min-w-[44px] justify-center">
              {cartSlot}
            </div>
          )}
        </div>
      </header>

      {/* Consumer share / download — lightweight, NEVER DocSendBar */}
      {consumerShare && (
        <div
          className="rounded-2xl border border-border bg-card/60 px-3 py-3 min-h-[44px] flex items-center gap-2"
          data-consumer-share="true"
        >
          {consumerShare}
        </div>
      )}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : isLoading ? (
        <div className="space-y-3" data-state="loading">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-2/3 rounded-2xl" />
        </div>
      ) : isEmpty ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 py-14 text-center"
          data-state="empty"
        >
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </section>
  );
}

export default ConsumerAppShell;
