/**
 * @file        src/pages/erp/maintainpro/reports/FireSafetyExpiryReport.tsx
 * @purpose     TDL Fire Safety master · site-grouped · 30/60/90 expiry buckets · Indian Factory Act §38A · FR-42
 * @sprint      T-Phase-1.A.16c · Block B.3 · NEW
 */
import { useMemo } from 'react';
import { listFireSafetyEquipment } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';
// RPT-6c imports
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { ShieldCheck as RPT6cShield } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';


export function FireSafetyExpiryReport(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = useMemo(() => {
    const now = Date.now();
    return listFireSafetyEquipment(entityCode).map((f) => {
      const exp = new Date(f.expiry_date).getTime();
      const days = Math.floor((exp - now) / 86400000);
      const bucket = days < 0 ? 'Expired' : days <= 30 ? '0–30 days' : days <= 60 ? '31–60 days' : days <= 90 ? '61–90 days' : '>90 days';
      return { ...f, days, bucket };
    }).sort((a, b) => a.days - b.days);
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof rows>();
    rows.forEach((r) => {
      const k = r.linked_site_id ?? 'Unassigned';
      const list = m.get(k) ?? [];
      list.push(r);
      m.set(k, list);
    });
    return Array.from(m.entries());
  }, [rows]);

  return (
    <MaintainProReportShell title="Fire Safety Expiry Report" ssotBadge="TDL · Factory Act §38A">
      {grouped.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">No fire safety equipment</div>}
      {grouped.map(([site, items]) => (
        <div key={site} className="mb-4">
          <div className="text-sm font-semibold mb-2">Site: <span className="font-mono">{site}</span></div>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="p-2">Code</th><th className="p-2">Type</th><th className="p-2">Location</th><th className="p-2">Expiry</th><th className="p-2">Bucket</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{r.equipment_code}</td>
                  <td className="p-2">{r.type}</td>
                  <td className="p-2">{r.location} · {r.floor}</td>
                  <td className="p-2 font-mono text-xs">{r.expiry_date}</td>
                  <td className="p-2">{r.bucket}</td>
                  <td className="p-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {(() => {
        const bucketRows = Object.entries(rows.reduce((a: Record<string, number>, r) => { a[r.bucket] = (a[r.bucket] ?? 0) + 1; return a; }, {})).map(([bucket, count]) => ({ bucket, count }));
        const cfg = getKpi('mnt-fire-expiry')?.defaultChart ?? defaultChartConfig({ chartType: 'stacked-column', xKey: 'bucket', series: [{ key: 'count', label: 'Items' }], title: 'Fire safety expiry buckets' });
        const hash = signReport(bucketRows);
        const short = hash.replace('fnv1a:', '').slice(0, 10);
        return (
          <div className="border rounded-lg p-3 space-y-2" data-testid="mnt-fire-expiry-dashboard-host">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center text-[10px] font-mono border rounded px-1.5 py-0.5" data-testid="mnt-fire-expiry-integrity-badge" title={hash}>
                <RPT6cShield className="h-3 w-3 mr-1" />{short}
              </span>
            </div>
            {bucketRows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No fire safety equipment</div>
            ) : (
              <div className="w-full h-64" data-testid="mnt-fire-expiry-chart-host"><ReportChart data={bucketRows} config={cfg} /></div>
            )}
          </div>
        );
      })()}
    </MaintainProReportShell>
  );
}

export default FireSafetyExpiryReport;
