import { FIXTURE_MANIFEST, getCoverageStats, type CoverageLevel } from '@/data/fixtures/manifest';
import { cn } from '@/lib/utils';

const LEVEL_COLOR: Record<CoverageLevel, string> = {
  ready:   'bg-emerald-500/80 hover:bg-emerald-500 text-white',
  partial: 'bg-amber-400/80 hover:bg-amber-400 text-amber-950',
  missing: 'bg-rose-300/80 hover:bg-rose-300 text-rose-950',
};

const LEVEL_LABEL: Record<CoverageLevel, string> = {
  ready:   'Ready',
  partial: 'Partial',
  missing: 'Missing',
};

export function FixtureCoverageHeatmap() {
  const stats = getCoverageStats();
  const vouchers = FIXTURE_MANIFEST.filter(e => e.category === 'voucher');
  const masters = FIXTURE_MANIFEST.filter(e => e.category === 'master');
  const reports = FIXTURE_MANIFEST.filter(e => e.category === 'report');

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card/60 p-3">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total entities</div>
        </div>
        <div className="rounded-lg border bg-card/60 p-3">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.ready}</div>
          <div className="text-xs text-muted-foreground">Ready ({stats.readyPct}%)</div>
        </div>
        <div className="rounded-lg border bg-card/60 p-3">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.partial}</div>
          <div className="text-xs text-muted-foreground">Partial ({stats.partialPct}%)</div>
        </div>
        <div className="rounded-lg border bg-card/60 p-3">
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.missing}</div>
          <div className="text-xs text-muted-foreground">Missing ({stats.missingPct}%)</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-emerald-500/80" /> Ready (happy + edge fixtures)
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-amber-400/80" /> Partial (some fixtures, not all scenarios)
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-rose-300/80" /> Missing (no fixtures yet)
        </div>
      </div>

      <HeatmapSection title="Vouchers (14 types)" entries={vouchers} />
      <HeatmapSection title="Masters (12 types)" entries={masters} />
      <HeatmapSection title="Reports (14 types)" entries={reports} />
    </div>
  );
}

function HeatmapSection({ title, entries }: { title: string; entries: typeof FIXTURE_MANIFEST }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {entries.map(e => (
          <div
            key={e.id}
            className={cn(
              "rounded-md px-3 py-2 text-xs transition-colors cursor-default",
              LEVEL_COLOR[e.level]
            )}
            title={`${e.name} · ${LEVEL_LABEL[e.level]} · Updated in ${e.lastUpdatedSprint}${e.notes ? ' · ' + e.notes : ''}`}
          >
            <div className="font-medium truncate">{e.name}</div>
            <div className="text-[10px] opacity-80">
              {LEVEL_LABEL[e.level]} · {e.lastUpdatedSprint}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FixtureCoverageHeatmap;
