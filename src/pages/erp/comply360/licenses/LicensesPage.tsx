/**
 * @file        src/pages/erp/comply360/licenses/LicensesPage.tsx
 * @purpose     Sprint 79b · Licenses & Regulatory mega-menu shell · consumes comply360-licenses-registry-engine.
 *              13 license types · status grid · 12-month expiry timeline · renewal workflow.
 * @sprint      Sprint 79b · T-Phase-5.A.1.11-PASS-B · Block 4
 * @decisions   D-S69-1 (NATIVE)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateLicenses,
  getExpiringIn,
  recordLicense,
  renewLicense,
  classifyExpiry,
  buildSampleLicense,
  type LicenseRecord,
  type LicenseType,
  type LicenseRegistryView,
} from '@/lib/comply360-licenses-registry-engine';

const ENTITIES = ['DEMO-CORP-01', 'ACME-PVT-LTD', 'BHARAT-AGRO-LLP'];
const LICENSE_TYPES: LicenseType[] = [
  'iec', 'lut', 'aeo', 'rcmc', 'schedule-h', 'schedule-h1',
  'cth-auth', 'fta-cert', 'epcg', 'advance-auth', 'dgft-other',
  'trademark', 'patent',
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getUTCDate()).padStart(2, '0')} ${m[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function statusClass(s: LicenseRecord['status']): string {
  switch (s) {
    case 'active': return 'text-success';
    case 'expiring-90d': return 'text-warning';
    case 'expired': return 'text-destructive';
    case 'renewed': return 'text-primary';
    default: return 'text-muted-foreground';
  }
}

function buildTimeline(records: LicenseRecord[]): { label: string; count: number }[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const buckets: { label: string; count: number; key: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    buckets.push({
      label: `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
      count: 0,
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }
  for (const r of records) {
    const e = new Date(r.expiry_date);
    const k = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}`;
    const b = buckets.find((x) => x.key === k);
    if (b) b.count += 1;
  }
  return buckets.map((b) => ({ label: b.label, count: b.count }));
}

export default function LicensesPage(): JSX.Element {
  const [entity, setEntity] = useState<string>(ENTITIES[0]);
  const [typeFilter, setTypeFilter] = useState<LicenseType | 'all'>('all');
  const [refresh, setRefresh] = useState<number>(0);
  const [selected, setSelected] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo<LicenseRegistryView>(() => aggregateLicenses(entity), [entity, refresh]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const expiring = useMemo<LicenseRecord[]>(() => getExpiringIn(entity, 90), [entity, refresh]);
  const records = typeFilter === 'all' ? view.records : view.records.filter((r) => r.license_type === typeFilter);
  const timeline = useMemo(() => buildTimeline(view.records), [view.records]);
  const maxBar = Math.max(1, ...timeline.map((t) => t.count));

  const onRecord = (): void => {
    const t: LicenseType = typeFilter === 'all' ? 'epcg' : typeFilter;
    const rec = buildSampleLicense(entity, t);
    recordLicense({ ...rec, id: `${rec.id}-${Date.now().toString().slice(-5)}` });
    toast.success(`Recorded ${t.toUpperCase()} license`);
    setRefresh((n) => n + 1);
  };

  const onRenew = (): void => {
    if (!selected) {
      toast.error('Select a license first');
      return;
    }
    const newExpiry = new Date();
    newExpiry.setFullYear(newExpiry.getFullYear() + 2);
    const renewed = renewLicense(entity, selected, newExpiry.toISOString().slice(0, 10));
    if (renewed) {
      toast.success(`Renewed · new expiry ${fmtDate(renewed.expiry_date)}`);
      setRefresh((n) => n + 1);
    } else {
      toast.error('License not found in local registry (EximX-sourced records renew in EximX master).');
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Award className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Licenses &amp; Regulatory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unified registry · 13 license types across IEC · LUT · AEO · RCMC · Schedule H/H1 · CTH-auth · FTA cert · EPCG · Advance Auth · DGFT-other · Trademark · Patent.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Active</div>
          <div className="text-xl font-bold text-success font-mono">{view.total_active}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Expiring ≤90d</div>
          <div className="text-xl font-bold text-warning font-mono">{view.total_expiring}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Expired</div>
          <div className="text-xl font-bold text-destructive font-mono">{view.total_expired}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Total records</div>
          <div className="text-xl font-bold font-mono">{view.records.length}</div>
        </Card>
      </div>

      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] font-medium block mb-1">Entity</label>
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={entity} onChange={(e) => { setEntity(e.target.value); setSelected(null); }}>
            {ENTITIES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1">License type</label>
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as LicenseType | 'all')}>
            <option value="all">all</option>
            {LICENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={onRecord}>Record New License</Button>
          <Button size="sm" variant="outline" disabled={!selected} onClick={onRenew}>Renew Selected</Button>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <CalendarClock className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-semibold">Expiry Timeline · next 12 months</h2>
          <span className="text-[11px] text-muted-foreground ml-auto">{expiring.length} expiring ≤90d</span>
        </div>
        <div className="flex items-end gap-1 h-24">
          {timeline.map((t) => (
            <div key={t.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary/40 rounded-t"
                style={{ height: `${(t.count / maxBar) * 80}px`, minHeight: t.count > 0 ? '4px' : '0' }}
                title={`${t.label}: ${t.count}`}
              />
              <div className="text-[9px] text-muted-foreground font-mono">{t.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {records.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No licenses for {entity} {typeFilter !== 'all' ? `· type ${typeFilter}` : ''}. Use Record New License to populate.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 font-medium">License #</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Issued</th>
                <th className="px-3 py-2 font-medium">Expiry</th>
                <th className="px-3 py-2 font-medium">Authority</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Classification</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className={`border-t hover:bg-muted/20 ${selected === r.id ? 'bg-primary/5' : ''}`}>
                  <td className="px-3 py-2">
                    <input
                      type="radio"
                      name="lic"
                      checked={selected === r.id}
                      onChange={() => setSelected(r.id)}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono">{r.license_number}</td>
                  <td className="px-3 py-2 uppercase">{r.license_type}</td>
                  <td className="px-3 py-2 font-mono">{fmtDate(r.issued_date)}</td>
                  <td className="px-3 py-2 font-mono">{fmtDate(r.expiry_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.issuing_authority}</td>
                  <td className={`px-3 py-2 font-medium ${statusClass(r.status)}`}>{r.status}</td>
                  <td className="px-3 py-2 text-[10px] uppercase text-muted-foreground">{classifyExpiry(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
