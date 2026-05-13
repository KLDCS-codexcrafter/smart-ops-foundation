/**
 * @file        src/pages/erp/servicedesk/installation-verification/InstallationVerificationDetail.tsx
 * @purpose     Q-LOCK-4 · 7-point checklist + AMC kickoff gate banner
 * @sprint      T-Phase-1.C.1b · Block E.2
 * @iso        Functional Suitability + Usability
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  getInstallationVerification,
  markVerificationComplete,
  isAMCKickoffBlocked,
  createInstallationVerification,
} from '@/lib/servicedesk-engine';
import type { InstallationVerification } from '@/types/servicedesk';

interface Props {
  verificationId?: string;
  onBack?: () => void;
}

const CHECKLIST_FIELDS: { key: keyof InstallationVerification; label: string }[] = [
  { key: 'functional_check_passed', label: 'Functional check passed' },
  { key: 'spare_inventory_verified', label: 'Spare inventory verified' },
  { key: 'service_tier_config_verified', label: 'Service tier config verified' },
  { key: 'customer_briefing_done', label: 'Customer briefing done' },
  { key: 'emergency_contact_shared', label: 'Emergency contact shared' },
  { key: 'documentation_handed_over', label: 'Documentation handed over' },
  { key: 'customer_acknowledgement', label: 'Customer acknowledgement' },
];

export function InstallationVerificationDetail({ verificationId, onBack }: Props): JSX.Element {
  const [iv, setIv] = useState<InstallationVerification | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (verificationId) {
      const found = getInstallationVerification(verificationId);
      setIv(found);
      setNotes(found?.notes ?? '');
    }
  }, [verificationId]);

  if (!iv) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={onBack}>← Back</Button>
        <Card className="p-12 text-center text-sm text-muted-foreground">
          No verification selected. Use the "Seed sample" button below to create one for demo.
          <div className="mt-4">
            <Button
              size="sm"
              onClick={() => {
                const created = createInstallationVerification({
                  entity_id: 'OPRX',
                  amc_record_id: 'sinha-001',
                  site_visit_date: new Date().toISOString().slice(0, 10),
                  functional_check_passed: false,
                  spare_inventory_verified: false,
                  service_tier_config_verified: false,
                  customer_briefing_done: false,
                  emergency_contact_shared: false,
                  documentation_handed_over: false,
                  customer_acknowledgement: false,
                  photos: [],
                  customer_signature_url: null,
                  notes: '',
                  verifier_engineer_id: 'eng-demo',
                  status: 'in_progress',
                  verified_by: null,
                  verified_at: null,
                  created_by: 'current_user',
                });
                setIv(created);
                toast.success('Seeded sample verification');
              }}
            >
              Seed sample
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const setFlag = (key: keyof InstallationVerification, value: boolean): void => {
    setIv({ ...iv, [key]: value });
  };

  const allChecked = CHECKLIST_FIELDS.every((f) => iv[f.key] === true);
  const blocked = isAMCKickoffBlocked(iv.amc_record_id);

  const onMark = (): void => {
    try {
      // Persist current flag state by re-creating then marking — Phase 1 simplification
      // In Phase 2 there's an updateInstallationVerification; here we directly mark complete
      markVerificationComplete(iv.id, 'current_user');
      toast.success('Verification marked complete');
      setIv({ ...iv, status: 'verified', verified_by: 'current_user', verified_at: new Date().toISOString() });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>← Back</Button>
        <h1 className="text-2xl font-bold">Verification {iv.id.slice(0, 12)}</h1>
      </div>
      {blocked && iv.status !== 'verified' && (
        <Alert variant="destructive">
          <AlertDescription>
            AMC cannot transition to active until this verification is complete.
          </AlertDescription>
        </Alert>
      )}
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">7-point checklist</h2>
        {CHECKLIST_FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <Checkbox
              id={f.key as string}
              checked={Boolean(iv[f.key])}
              onCheckedChange={(v) => setFlag(f.key, v === true)}
              disabled={iv.status === 'verified'}
            />
            <Label htmlFor={f.key as string}>{f.label}</Label>
          </div>
        ))}
      </Card>
      <Card className="p-5 space-y-3">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} disabled={iv.status === 'verified'} />
        <p className="text-xs text-muted-foreground">
          Photos + customer signature stubs · Phase 2 wires storage and signature pad.{' '}
          {/* [JWT] backend wiring */}
        </p>
      </Card>
      <div className="flex justify-end">
        <Button onClick={onMark} disabled={!allChecked || iv.status === 'verified'}>
          {iv.status === 'verified' ? 'Verified ✓' : 'Mark Verified'}
        </Button>
      </div>
    </div>
  );
}
