/**
 * @file src/pages/erp/qulicheak/CapaDetail.tsx
 * @purpose CAPA full 8D editor · update step status · 5 Whys · actions add/edit · verifications record · close
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.c-Qulicheak-Welder-Vendor-ISO-IQC
 * @iso 25010 Maintainability + Usability · ISO 9001:2015 Clause 10.2
 * @whom Quality Manager · Quality Engineer · Process Owner
 * @decisions D-NEW-BD · D-NEW-BE · D-NEW-BH · D-NEW-BR (CapaDetail editor · α-c)
 * @disciplines FR-19 (NCR consume only via capa-engine) · FR-21 (no any · no console.log · no float-money) ·
 *              FR-29 (Cmd/Ctrl+Enter quick-save) · FR-30 (header) · FR-50 (entity_id)
 * @reuses capa-engine (mutations) · types/capa
 * @[JWT] reads/writes via capa-engine
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  getCapaById, updateEightDStep, addAction, updateAction,
  recordVerification, closeCapa,
} from '@/lib/capa-engine';
import {
  CAPA_STATUS_LABELS, CAPA_SEVERITY_LABELS,
  type CapaId, type CorrectiveAndPreventiveAction, type EightDStep,
  type EightDStepNum, type EightDStepStatus, type FiveWhys,
  type CapaActionType, type CapaActionStatus, type VerificationMilestone,
  type CapaOutcome,
} from '@/types/capa';

interface Props {
  capaId: CapaId;
  onBack?: () => void;
}

const STEP_STATUS_OPTIONS: EightDStepStatus[] = ['pending', 'in_progress', 'complete'];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' }); }
  catch { return iso; }
}

export function CapaDetail({ capaId, onBack }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const userId = useCurrentUser()?.id ?? 'demo-user';
  const [capa, setCapa] = useState<CorrectiveAndPreventiveAction | null>(
    () => getCapaById(entityCode, capaId),
  );

  const refresh = useCallback(() => {
    setCapa(getCapaById(entityCode, capaId));
  }, [entityCode, capaId]);

  // 8D step editor state
  const [activeStep, setActiveStep] = useState<EightDStepNum>(1);
  const currentStep: EightDStep | undefined = useMemo(
    () => capa?.eight_d_steps.find((s) => s.step === activeStep),
    [capa, activeStep],
  );
  const [stepNotes, setStepNotes] = useState<string>('');
  const [stepStatus, setStepStatus] = useState<EightDStepStatus>('pending');
  const [why1, setWhy1] = useState<string>('');
  const [why2, setWhy2] = useState<string>('');
  const [why3, setWhy3] = useState<string>('');
  const [why4, setWhy4] = useState<string>('');
  const [why5, setWhy5] = useState<string>('');
  const [showDeepWhys, setShowDeepWhys] = useState<boolean>(false);
  const [rootCause, setRootCause] = useState<string>('');

  useEffect(() => {
    if (!currentStep) return;
    setStepNotes(currentStep.notes ?? '');
    setStepStatus(currentStep.status);
    setWhy1(currentStep.five_whys?.why_1?.answer ?? '');
    setWhy2(currentStep.five_whys?.why_2?.answer ?? '');
    setWhy3(currentStep.five_whys?.why_3?.answer ?? '');
    setWhy4(currentStep.five_whys?.why_4?.answer ?? '');
    setWhy5(currentStep.five_whys?.why_5?.answer ?? '');
    setShowDeepWhys(Boolean(
      currentStep.five_whys?.why_3 ?? currentStep.five_whys?.why_4 ?? currentStep.five_whys?.why_5,
    ));
    setRootCause(currentStep.five_whys?.root_cause_summary ?? '');
  }, [currentStep]);

  const saveStep = useCallback((): void => {
    if (!capa) return;
    const isStep4 = activeStep === 4; // 4 = root_cause → capture 5 Whys
    const fiveWhys: FiveWhys | null = isStep4
      ? {
          why_1: { question: 'Why did this happen?', answer: why1 },
          ...(why2 ? { why_2: { question: 'Why?', answer: why2 } } : {}),
          ...(why3 ? { why_3: { question: 'Why?', answer: why3 } } : {}),
          ...(why4 ? { why_4: { question: 'Why?', answer: why4 } } : {}),
          ...(why5 ? { why_5: { question: 'Why?', answer: why5 } } : {}),
          root_cause_summary: rootCause,
        }
      : (currentStep?.five_whys ?? null);
    const now = new Date().toISOString();
    const completedAt = stepStatus === 'complete' ? now : null;
    updateEightDStep(entityCode, userId, capa.id, activeStep, {
      status: stepStatus,
      notes: stepNotes || null,
      completed_at: completedAt,
      completed_by: completedAt ? userId : null,
      five_whys: fiveWhys,
    }, `D${activeStep} → ${stepStatus}`);
    toast.success(`Step D${activeStep} saved`);
    refresh();
  }, [capa, activeStep, stepStatus, stepNotes, why1, why2, why3, why4, why5, rootCause, currentStep, entityCode, userId, refresh]);

  // FR-29 · Cmd/Ctrl+Enter quick-save
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        saveStep();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveStep]);

  // Action add form state
  const [actDesc, setActDesc] = useState<string>('');
  const [actType, setActType] = useState<CapaActionType>('corrective');
  const [actDue, setActDue] = useState<string>('');

  const handleAddAction = (): void => {
    if (!capa) return;
    if (!actDesc.trim() || !actDue) {
      toast.error('Description and due date required');
      return;
    }
    addAction(entityCode, userId, capa.id, {
      description: actDesc.trim(),
      type: actType,
      due_date: actDue,
      status: 'pending' as CapaActionStatus,
    });
    setActDesc(''); setActDue('');
    toast.success('Action added');
    refresh();
  };

  const handleCompleteAction = (id: string): void => {
    if (!capa) return;
    updateAction(entityCode, userId, capa.id, id, {
      status: 'complete',
      completed_at: new Date().toISOString(),
      completed_by: userId,
    });
    refresh();
  };

  const handleVerify = (m: VerificationMilestone, eff: boolean): void => {
    if (!capa) return;
    recordVerification(entityCode, userId, capa.id, m, eff);
    toast.success(`${m}-day verification recorded`);
    refresh();
  };

  const handleClose = (outcome: CapaOutcome): void => {
    if (!capa) return;
    const result = closeCapa(entityCode, userId, capa.id, outcome);
    if (!result) {
      toast.error('Cannot close · already finalized');
      return;
    }
    toast.success(`CAPA closed · ${outcome}`);
    refresh();
  };

  if (!capa) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">CAPA {capaId} not found.</p>
        {onBack && <Button variant="outline" onClick={onBack}>Back</Button>}
      </div>
    );
  }

  const finalized = capa.status === 'closed' || capa.status === 'cancelled' ||
    capa.status === 'effective' || capa.status === 'ineffective';

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-mono">{capa.id}</h1>
          <p className="text-sm text-muted-foreground mt-1">{capa.title}</p>
        </div>
        {onBack && <Button variant="outline" onClick={onBack}>Back</Button>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge>{CAPA_STATUS_LABELS[capa.status]}</Badge>
        <Badge variant="secondary">{CAPA_SEVERITY_LABELS[capa.severity]}</Badge>
        {capa.related_ncr_id && <Badge variant="outline">NCR: {capa.related_ncr_id}</Badge>}
        {capa.related_party_name && <Badge variant="outline">{capa.related_party_name}</Badge>}
      </div>

      {/* 8D Step strip */}
      <Card>
        <CardHeader><CardTitle className="text-base">8D Progression</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {capa.eight_d_steps.map((s) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(s.step)}
                className={`text-left border rounded-lg p-3 text-xs transition-colors ${
                  s.step === activeStep ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="font-mono text-muted-foreground">D{s.step}</div>
                <div className="font-medium">{s.label.replace(/_/g, ' ')}</div>
                <Badge variant="outline" className="mt-1">{s.status}</Badge>
              </button>
            ))}
          </div>

          {/* Step editor */}
          {currentStep && !finalized && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Edit D{currentStep.step} · {currentStep.label.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-muted-foreground font-mono">⌘/Ctrl + Enter to save</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={stepStatus} onValueChange={(v) => setStepStatus(v as EightDStepStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STEP_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Completed</Label>
                  <div className="text-xs text-muted-foreground font-mono py-2">
                    {fmtDate(currentStep.completed_at)}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={stepNotes}
                  onChange={(e) => setStepNotes(e.target.value)}
                  rows={2}
                  placeholder="Step notes / evidence reference"
                />
              </div>

              {activeStep === 4 && (
                <div className="space-y-2 border-t pt-3">
                  <div className="text-xs font-medium text-muted-foreground">5 Whys (D4 · Root Cause)</div>
                  <div className="space-y-1">
                    <Label className="text-xs">Why 1</Label>
                    <Input value={why1} onChange={(e) => setWhy1(e.target.value)} placeholder="Why did this happen?" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Why 2 (optional)</Label>
                    <Input value={why2} onChange={(e) => setWhy2(e.target.value)} placeholder="Why?" />
                  </div>
                  {!showDeepWhys && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDeepWhys(true)}
                    >
                      + Add Why 3 / 4 / 5
                    </Button>
                  )}
                  {showDeepWhys && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Why 3</Label>
                        <Input value={why3} onChange={(e) => setWhy3(e.target.value)} placeholder="Why?" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Why 4</Label>
                        <Input value={why4} onChange={(e) => setWhy4(e.target.value)} placeholder="Why?" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Why 5</Label>
                        <Input value={why5} onChange={(e) => setWhy5(e.target.value)} placeholder="Why?" />
                      </div>
                    </>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Root Cause Summary</Label>
                    <Textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      rows={2}
                      placeholder="Concise root cause statement"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button size="sm" onClick={saveStep}>Save D{activeStep}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Corrective / Preventive Actions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {capa.actions.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No actions yet.</p>
          )}
          {capa.actions.map((a) => (
            <div key={a.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-sm truncate">{a.description}</div>
                <div className="flex gap-2 text-xs text-muted-foreground font-mono">
                  <Badge variant="secondary">{a.type}</Badge>
                  <span>Due: {fmtDate(a.due_date)}</span>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              </div>
              {a.status !== 'complete' && !finalized && (
                <Button size="sm" variant="outline" onClick={() => handleCompleteAction(a.id)}>
                  Mark complete
                </Button>
              )}
            </div>
          ))}

          {!finalized && (
            <div className="border-t pt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">New action description</Label>
                <Input value={actDesc} onChange={(e) => setActDesc(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={actType} onValueChange={(v) => setActType(v as CapaActionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due date</Label>
                <Input type="date" value={actDue} onChange={(e) => setActDue(e.target.value)} />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <Button size="sm" onClick={handleAddAction}>Add action</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verifications */}
      <Card>
        <CardHeader><CardTitle className="text-base">Verifications (30 / 60 / 90 day)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {capa.verifications.map((v) => (
              <div key={v.milestone} className="border rounded-lg p-3 text-xs space-y-2">
                <div className="font-mono">{v.milestone}-day</div>
                <div className="text-muted-foreground">{fmtDate(v.scheduled_at)}</div>
                <Badge variant="outline">
                  {v.effective === null ? 'pending' : v.effective ? 'effective' : 'ineffective'}
                </Badge>
                {v.effective === null && !finalized && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => handleVerify(v.milestone, true)}>
                      Effective
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleVerify(v.milestone, false)}>
                      Ineffective
                    </Button>
                  </div>
                )}
                {v.verified_at && (
                  <div className="font-mono text-muted-foreground">Verified {fmtDate(v.verified_at)}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Close */}
      {!finalized && (
        <Card>
          <CardHeader><CardTitle className="text-base">Close CAPA</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="default" onClick={() => handleClose('effective')}>Close · Effective</Button>
            <Button variant="outline" onClick={() => handleClose('ineffective_re_open_ncr')}>
              Ineffective · Re-open NCR
            </Button>
            <Button variant="ghost" onClick={() => handleClose('cancelled')}>Cancel CAPA</Button>
          </CardContent>
        </Card>
      )}

      {finalized && capa.outcome && (
        <p className="text-xs text-muted-foreground italic">
          CAPA finalized · outcome: {capa.outcome} · {fmtDate(capa.closed_at)}
        </p>
      )}
    </div>
  );
}
