/**
 * @file        src/pages/erp/sitex/registers/SnagRegister.tsx
 * @purpose     Snag register (Master Plan §6.3) · auto-escalates to NCR via Snag-to-NCR Smart Bridge OOB #10
 * @sprint      T-Phase-1.A.15a · Block E.3 + H.1
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { listSites } from '@/lib/sitex-engine';
import { emitSnagRaisedSevere } from '@/lib/sitex-bridges';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { snagsKey, type Snag } from '@/types/sitex';

interface Props { onNavigate: (m: string) => void }

export function SnagRegister({ onNavigate: _onNavigate }: Props): JSX.Element {
  const entity = DEFAULT_ENTITY_SHORTCODE;
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');
  const [severity, setSeverity] = useState<Snag['severity']>('low');
  const [category, setCategory] = useState<Snag['category']>('workmanship');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [refresh, setRefresh] = useState(0);

  const readAll = (): Snag[] => {
    try { return JSON.parse(localStorage.getItem(snagsKey(entity)) ?? '[]'); } catch { return []; }
  };

  const submit = (): void => {
    const site = sites.find((s) => s.id === siteId);
    if (!site) return;
    const now = new Date().toISOString();
    const isSevere = severity === 'medium' || severity === 'high' || severity === 'critical';
    const snag: Snag = {
      id: `SNAG-${Date.now()}`,
      site_id: siteId,
      entity_id: site.entity_id,
      raised_by: 'demo-user',
      raised_at: now,
      severity,
      category,
      description,
      location_on_site: location,
      photo_url: null,
      status: isSevere ? 'escalated_to_ncr' : 'open',
      ncr_id: isSevere ? `NCR-${Date.now()}` : null,
      resolved_at: null,
    };
    const all = readAll();
    all.push(snag);
    localStorage.setItem(snagsKey(entity), JSON.stringify(all));

    if (isSevere) {
      emitSnagRaisedSevere({
        type: 'sitex.snag.raised.severe',
        snag_id: snag.id,
        site_id: siteId,
        entity_id: site.entity_id,
        severity: severity as 'medium' | 'high' | 'critical',
        category,
        description,
        timestamp: now,
      });
    }
    setDescription(''); setLocation('');
    setRefresh((x) => x + 1);
  };

  const siteSnags = readAll().filter((s) => s.site_id === siteId);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">Snag Register</h1>
      </div>

      <Card className="p-4">
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select site...</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name}</option>)}
        </select>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Raise Snag</h2>
        <div className="grid grid-cols-2 gap-3">
          <select className="border rounded-lg px-3 py-2 bg-background"
            value={severity} onChange={(e) => setSeverity(e.target.value as Snag['severity'])}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select className="border rounded-lg px-3 py-2 bg-background"
            value={category} onChange={(e) => setCategory(e.target.value as Snag['category'])}>
            <option value="workmanship">Workmanship</option>
            <option value="safety">Safety</option>
            <option value="material">Material</option>
            <option value="design">Design</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Input placeholder="Location on site" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <p className="text-xs text-muted-foreground">Severity ≥ medium auto-creates an NCR via Snag-to-NCR Smart Bridge (OOB #10).</p>
        <Button onClick={submit} disabled={!siteId || !description}>Raise Snag</Button>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Site Snags</h2>
        {siteSnags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No snags yet.</p>
        ) : siteSnags.slice().reverse().map((s) => (
          <div key={s.id} className="border-b py-2 text-sm">
            <div className="flex justify-between">
              <Badge variant="outline">{s.severity}</Badge>
              <span className="text-xs text-muted-foreground">{s.status}</span>
            </div>
            <div>{s.description}</div>
            {s.ncr_id && <div className="text-xs text-warning">Escalated to NCR: {s.ncr_id}</div>}
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-2">Refresh tick: {refresh}</p>
      </Card>
    </div>
  );
}
