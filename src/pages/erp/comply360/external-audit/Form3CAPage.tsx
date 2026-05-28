/**
 * @file        src/pages/erp/comply360/external-audit/Form3CAPage.tsx
 * @purpose     Form 3CA surface · used when entity has statutory audit under another law
 * @sprint      Sprint 74a · T-Phase-5.A.1.6-PASS-A · Block 7
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { build3CA, type EntityMeta, type AuditorMeta } from '@/lib/comply360-tax-audit-3cd-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

export default function Form3CAPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [entity, setEntity] = useState<EntityMeta>({
    entity_code: entityCode || 'ENT',
    pan: '',
    legal_name: '',
    fy_start: '2025-04-01',
    fy_end: '2026-03-31',
  });
  const [auditor, setAuditor] = useState<AuditorMeta>({
    auditor_name: '', membership_no: '', firm_name: '', audit_date: new Date().toISOString().slice(0, 10),
  });
  const [statutoryRef, setStatutoryRef] = useState('Companies Act 2013 · §143');
  const [observations, setObservations] = useState('');

  const handleBuild = (): void => {
    const form = build3CA(entity, auditor, statutoryRef, observations.split('\n').filter(Boolean));
    toast.success(`Form 3CA built · ${form.observations.length} observation(s)`);
  };

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6"><Card className="p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
      </Card></div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Form 3CA · Tax Audit Report</h1>
        <p className="text-muted-foreground text-sm">For entities already audited under another law (e.g. Companies Act §143).</p>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Entity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>PAN</Label>
            <Input value={entity.pan} onChange={(e) => setEntity({ ...entity, pan: e.target.value.toUpperCase() })} placeholder="AAAAA9999A" /></div>
          <div className="space-y-1"><Label>Legal name</Label>
            <Input value={entity.legal_name} onChange={(e) => setEntity({ ...entity, legal_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>FY start</Label>
            <Input type="date" value={entity.fy_start} onChange={(e) => setEntity({ ...entity, fy_start: e.target.value })} /></div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Auditor</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Auditor name</Label>
            <Input value={auditor.auditor_name} onChange={(e) => setAuditor({ ...auditor, auditor_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Membership no.</Label>
            <Input value={auditor.membership_no} onChange={(e) => setAuditor({ ...auditor, membership_no: e.target.value })} /></div>
          <div className="space-y-1"><Label>Firm</Label>
            <Input value={auditor.firm_name} onChange={(e) => setAuditor({ ...auditor, firm_name: e.target.value })} /></div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Statutory audit reference</h2>
        <Input value={statutoryRef} onChange={(e) => setStatutoryRef(e.target.value)} />
        <div className="mt-3 space-y-1">
          <Label>Observations (one per line)</Label>
          <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={4} />
        </div>
        <div className="mt-3">
          <Button onClick={handleBuild}><FileText className="h-4 w-4 mr-1" /> Build Form 3CA</Button>
        </div>
      </Card>
    </div>
  );
}
