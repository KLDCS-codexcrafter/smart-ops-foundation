/**
 * @file        src/pages/erp/sitex/closeout/CustomerSignoffPanel.tsx
 * @purpose     Customer Signoff UI · captures rep details · triggers FinCore invoice prep
 * @sprint      T-Phase-1.A.15a · Q-LOCK-10a · Block F.1
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Signature } from 'lucide-react';
import { createSignoff, listSignoffs } from '@/lib/sitex-signoff-engine';
import { listSites } from '@/lib/sitex-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { onNavigate: (m: string) => void }

export function CustomerSignoffPanel({ onNavigate: _onNavigate }: Props): JSX.Element {
  const entity = DEFAULT_ENTITY_SHORTCODE;
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');
  const [repName, setRepName] = useState('');
  const [designation, setDesignation] = useState('');
  const [notes, setNotes] = useState('');
  const [refresh, setRefresh] = useState(0);

  const submit = (): void => {
    const site = sites.find((s) => s.id === siteId);
    if (!site || !repName) return;
    createSignoff(entity, {
      site_id: siteId,
      entity_id: site.entity_id,
      milestone_id: null,
      customer_rep_name: repName,
      customer_rep_designation: designation,
      signature_image_url: null,
      signed_at: new Date().toISOString(),
      commissioning_report_doc_id: null,
      notes,
    });
    setRepName(''); setDesignation(''); setNotes('');
    setRefresh((x) => x + 1);
  };

  const list = siteId ? listSignoffs(entity, siteId) : [];

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Signature className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">Customer Signoff</h1>
      </div>
      <Card className="p-4">
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select site...</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name}</option>)}
        </select>
      </Card>
      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Capture Signoff</h2>
        <Input placeholder="Customer rep name" value={repName} onChange={(e) => setRepName(e.target.value)} />
        <Input placeholder="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
        <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={submit} disabled={!siteId || !repName}>Record Signoff (triggers invoice prep)</Button>
      </Card>
      <Card className="p-6">
        <h2 className="font-semibold mb-3">Captured Signoffs</h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No signoffs yet.</p>
        ) : list.slice().reverse().map((s) => (
          <div key={s.id} className="border-b py-2 text-sm">
            <div className="font-medium">{s.customer_rep_name} · {s.customer_rep_designation}</div>
            <div className="text-xs text-muted-foreground">{new Date(s.signed_at).toLocaleString('en-IN')}</div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-2">Refresh tick: {refresh}</p>
      </Card>
    </div>
  );
}
