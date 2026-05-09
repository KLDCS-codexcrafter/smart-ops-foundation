/**
 * @file src/pages/erp/qulicheak/CapaCapture.tsx
 * @purpose Manual CAPA entry · source / severity / title / description / NCR or party link
 * @who Quality Inspector · QA Manager
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI · T-Phase-1.A.5.d-2-AuditFix
 * @iso ISO 25010 Usability + Operability
 * @whom Quality Inspector
 * @decisions D-NEW-BD · D-NEW-BE · D-NEW-BJ · D-NEW-CE (FR-29 12/12 FormCarryForwardKit)
 * @disciplines FR-29 (FormCarryForwardKit · Save & New carry-over) · FR-50 · FR-51 ·
 *              FR-19 (consume NCR via getNcrById/listNcrs) · FR-21 · FR-30
 * @reuses capa-engine.raiseCapa / raiseCapaFromNcr · useEntityCode · useEntityChangeEffect ·
 *         useCurrentUser
 * @[JWT] writes via capa-engine.raiseCapa / raiseCapaFromNcr · localStorage erp_capa_${entityCode}
 */
import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { raiseCapa, raiseCapaFromNcr } from '@/lib/capa-engine';
import { listNcrs } from '@/lib/ncr-engine';
import {
  CAPA_SOURCE_LABELS, CAPA_SEVERITY_LABELS,
  type CapaSource, type CapaSeverity,
} from '@/types/capa';
import type { NcrId } from '@/types/ncr';

interface Props {
  onSaved?: () => void;
  onCancel?: () => void;
  prefillNcrId?: NcrId | null;
}

const SOURCE_OPTIONS: CapaSource[] = ['preventive_only', 'ncr', 'audit', 'customer_complaint', 'internal_review'];
const SEVERITY_OPTIONS: CapaSeverity[] = ['minor', 'major', 'critical'];

const initial = (ncrId?: NcrId | null) => ({
  source: (ncrId ? 'ncr' : 'preventive_only') as CapaSource,
  severity: 'minor' as CapaSeverity,
  title: '',
  description: '',
  ncrId: (ncrId ?? '') as string,
  partyId: '',
  partyName: '',
  branchId: '',
});

export function CapaCapture({ onSaved, onCancel, prefillNcrId }: Props): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [form, setForm] = useState(() => initial(prefillNcrId));
  const [saving, setSaving] = useState(false);

  useEntityChangeEffect(() => setForm(initial(prefillNcrId)), [prefillNcrId]);

  const openNcrs = useMemo(() => {
    return listNcrs(entityCode).filter(
      (n) => n.status === 'open' || n.status === 'investigating' || n.status === 'capa_pending',
    );
  }, [entityCode]);

  const set = <K extends keyof ReturnType<typeof initial>>(
    key: K,
    val: ReturnType<typeof initial>[K],
  ): void => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = useCallback((): void => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!user) {
      toast.error('User session not found');
      return;
    }
    if (form.source === 'ncr' && !form.ncrId.trim()) {
      toast.error('Select a related NCR');
      return;
    }
    setSaving(true);
    try {
      if (form.source === 'ncr') {
        const capa = raiseCapaFromNcr(entityCode, user.id, form.ncrId.trim() as NcrId, {
          entity_id: entityId,
          branch_id: form.branchId.trim() || null,
          severity: form.severity,
          title: form.title.trim(),
          description: form.description.trim() || null,
        });
        if (!capa) {
          toast.error('Linked NCR not found');
          return;
        }
        toast.success(`CAPA ${capa.id} raised · NCR moved to capa_pending`);
      } else {
        const capa = raiseCapa(entityCode, user.id, {
          entity_id: entityId,
          branch_id: form.branchId.trim() || null,
          source: form.source,
          severity: form.severity,
          title: form.title.trim(),
          description: form.description.trim() || null,
          related_party_id: form.partyId.trim() || null,
          related_party_name: form.partyName.trim() || null,
        });
        toast.success(`CAPA ${capa.id} raised`);
      }
      setForm(initial(prefillNcrId));
      onSaved?.();
    } catch {
      toast.error('Failed to raise CAPA');
    } finally {
      setSaving(false);
    }
  }, [form, user, entityCode, entityId, prefillNcrId, onSaved]);

  const handleSaveAndNew = useCallback((): void => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!user) {
      toast.error('User session not found');
      return;
    }
    if (form.source === 'ncr' && !form.ncrId.trim()) {
      toast.error('Select a related NCR');
      return;
    }
    setSaving(true);
    try {
      if (form.source === 'ncr') {
        const capa = raiseCapaFromNcr(entityCode, user.id, form.ncrId.trim() as NcrId, {
          entity_id: entityId,
          branch_id: form.branchId.trim() || null,
          severity: form.severity,
          title: form.title.trim(),
          description: form.description.trim() || null,
        });
        if (!capa) {
          toast.error('Linked NCR not found');
          return;
        }
        toast.success(`CAPA ${capa.id} raised · NCR moved to capa_pending`);
      } else {
        const capa = raiseCapa(entityCode, user.id, {
          entity_id: entityId,
          branch_id: form.branchId.trim() || null,
          source: form.source,
          severity: form.severity,
          title: form.title.trim(),
          description: form.description.trim() || null,
          related_party_id: form.partyId.trim() || null,
          related_party_name: form.partyName.trim() || null,
        });
        toast.success(`CAPA ${capa.id} raised`);
      }
      const carried = {
        source: form.source,
        severity: form.severity,
        branchId: form.branchId,
        partyId: form.source !== 'ncr' ? form.partyId : '',
        partyName: form.source !== 'ncr' ? form.partyName : '',
        ncrId: '',
      };
      setForm({ ...initial(), ...carried });
    } catch {
      toast.error('Failed to raise CAPA');
    } finally {
      setSaving(false);
    }
  }, [form, user, entityCode, entityId]);

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Raise CAPA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Corrective and Preventive Action · 8D + 5 Whys · Entity {entityCode}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Classification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Source</Label>
            <RadioGroup
              value={form.source}
              onValueChange={(v) => set('source', v as CapaSource)}
              className="grid grid-cols-2 md:grid-cols-5 gap-2"
            >
              {SOURCE_OPTIONS.map((s) => (
                <Label
                  key={s}
                  htmlFor={`csrc-${s}`}
                  className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value={s} id={`csrc-${s}`} />
                  <span className="text-sm">{CAPA_SOURCE_LABELS[s]}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-2 block">Severity</Label>
            <RadioGroup
              value={form.severity}
              onValueChange={(v) => set('severity', v as CapaSeverity)}
              className="flex gap-2"
            >
              {SEVERITY_OPTIONS.map((s) => (
                <Label
                  key={s}
                  htmlFor={`csev-${s}`}
                  className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value={s} id={`csev-${s}`} />
                  <span className="text-sm">{CAPA_SEVERITY_LABELS[s]}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {form.source === 'ncr' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Related NCR</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="ncr-pick">NCR <span className="text-destructive">*</span></Label>
            <Select value={form.ncrId} onValueChange={(v) => set('ncrId', v)}>
              <SelectTrigger id="ncr-pick"><SelectValue placeholder="Select NCR…" /></SelectTrigger>
              <SelectContent>
                {openNcrs.length === 0 ? (
                  <SelectItem value="__none__" disabled>No open NCRs</SelectItem>
                ) : openNcrs.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.id} · {n.severity} · {n.description.slice(0, 60)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="capa-title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="capa-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Short summary of the CAPA"
            />
          </div>
          <div>
            <Label htmlFor="capa-desc">Description</Label>
            <Textarea
              id="capa-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          {form.source !== 'ncr' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capa-party">Related Party ID</Label>
                <Input id="capa-party" value={form.partyId} onChange={(e) => set('partyId', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="capa-pname">Party Name</Label>
                <Input id="capa-pname" value={form.partyName} onChange={(e) => set('partyName', e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="capa-branch">Branch ID</Label>
            <Input
              id="capa-branch"
              value={form.branchId}
              onChange={(e) => set('branchId', e.target.value)}
              placeholder="optional"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Raising…' : 'Raise CAPA'}
        </Button>
      </div>
    </div>
  );
}
