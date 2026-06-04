/**
 * @file        src/components/docvault/WatermarkOverlay.tsx
 * @purpose     S144.T1 · §L watermark overlay · tiled name+timestamp CSS deterrence
 *              over a viewer surface · download hidden when permission = view_watermark.
 * @sprint      Sprint 144.T1 · T-TaskFlow-A641.8 · hotfix
 * @decisions   Client-side deterrence only (server-rendered watermark = [JWT] P2BB).
 *              `watermark` is the string returned by getEffectivePermission().
 */
import { useMemo } from 'react';

export interface WatermarkOverlayProps {
  /** Watermark string (e.g. "Bob · 2026-06-04T05:21:00Z"). */
  watermark: string;
  /** Hide download/print affordances · default true. */
  hideDownload?: boolean;
  /** Optional viewer content rendered beneath the watermark tiles. */
  children?: React.ReactNode;
  /** Density · tiles per row · default 4. */
  density?: number;
}

export function WatermarkOverlay({
  watermark, hideDownload = true, children, density = 4,
}: WatermarkOverlayProps): JSX.Element {
  const tiles = useMemo(
    () => Array.from({ length: density * density }, (_, i) => i),
    [density],
  );
  return (
    <div
      data-testid="watermark-overlay"
      data-watermark={watermark}
      data-download-hidden={hideDownload ? 'true' : 'false'}
      className="relative w-full h-full overflow-hidden rounded-2xl bg-muted/20"
    >
      <div className="relative z-0">{children}</div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 grid"
        style={{ gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))` }}
      >
        {tiles.map((i) => (
          <div
            key={i}
            className="flex items-center justify-center opacity-20 select-none"
            style={{ transform: 'rotate(-30deg)' }}
          >
            <span className="font-mono text-[10px] text-foreground/80 whitespace-nowrap">
              {watermark}
            </span>
          </div>
        ))}
      </div>
      {hideDownload && (
        <span data-testid="watermark-download-hidden" className="sr-only">
          Download disabled by confidentiality policy
        </span>
      )}
    </div>
  );
}

export default WatermarkOverlay;
