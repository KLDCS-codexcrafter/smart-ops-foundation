/**
 * StockReservationBadge — Sprint T-Phase-2.7-d-1 · Q1-d
 * Inline color-coded badge for line item rows showing stock availability.
 *
 * Status colors derive from semantic tokens (red/amber/green via Tailwind utilities
 * mapped to design tokens · destructive/warning/success).
 */
import type { DetailedAvailabilityCell } from '@/lib/stock-reservation-engine';
import { cn } from '@/lib/utils';

interface Props {
  cell: DetailedAvailabilityCell | null;
  className?: string;
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : '0.0';
}

export function StockReservationBadge({ cell, className }: Props) {
  if (!cell) return null;

  const tone =
    cell.status === 'red'
      ? 'bg-destructive/15 text-destructive border-destructive/30'
      : cell.status === 'amber'
        ? 'bg-warning/15 text-warning border-warning/30'
        : 'bg-success/15 text-success border-success/30';

  const label =
    cell.status === 'red'
      ? `${fmt(cell.available)} free · short`
      : cell.status === 'amber'
        ? `${fmt(cell.available)} free · low`
        : `${fmt(cell.available)} free`;

  const tooltip = `On hand: ${fmt(cell.onHand)} · Quote res: ${fmt(cell.reservedByQuotes)} · Order res: ${fmt(cell.reservedByOrders)} · Available: ${fmt(cell.available)}`;

  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-mono whitespace-nowrap',
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
