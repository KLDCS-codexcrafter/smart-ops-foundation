/**
 * MobileQualiCheckCapture.tsx — Sprint 5-pre-3 · Block D · D-346
 * OperixGo QualiCheck 5-step inspection capture flow.
 *
 * Pattern: MIRRORS MobileGateGuardCapture 4-pre-3 D-312 EXACTLY (Step type · setStep state ·
 * 5 sequential steps · NO [tick, setTick] + useMemo anti-pattern).
 *
 * Step 1 = Pick pending inspection (from listPendingQa)
 * Step 2 = Enter qty (passed / failed / sample · 5-field tracking · D-332)
 * Step 3 = Capture parameter values per Spec (D-331 · 4 input types)
 * Step 4 = Photos (optional · camera-bridge stub)
 * Step 5 = Review + Submit
 *           → updateInspectionLine + completeInspection
 *           → completeInspection triggers D-339 closure-resolver (5-pre-2 stub→real)
 *           → 3 Stock Journal vouchers (Quarantine→Approved/Sample/Rejection · D-128 schema preserved)
 *           → offline: enqueueWrite fallback when navigator.onLine === false (matches MobileGateGuardCapture)
 *
 * Reuses (read-only / public API · NO modifications):
 *   - qa-inspection-engine.listPendingQa (5-pre-1 CORE BYTE-IDENTICAL)
 *   - qa-inspection-engine.updateInspectionLine + completeInspection (5-pre-1 CORE BYTE-IDENTICAL)
 *   - qa-spec-engine.getQaSpec + interpretParameter (5-pre-1)
 *   - camera-bridge.capturePhoto (Sprint 14c stub)
 *   - offline-queue-engine.enqueueWrite (Sprint 15)
 *   - OfflineIndicator (Sprint 14c)
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import {
  Camera, Send, ArrowLeft, ArrowRight, CheckSquare, FileText, Beaker, FlaskConical,
} from 'lucide-react';
import { toast } from 'sonner';
import { capturePhoto } from '@/lib/camera-bridge';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { enqueueWrite } from '@/lib/offline-queue-engine';
import {
  listPendingQa, updateInspectionLine, completeInspection,
} from '@/lib/qa-inspection-engine';
import { getQaSpec, interpretParameter } from '@/lib/qa-spec-engine';
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { QaSpec, QaSpecParameter } from '@/types/qa-spec';
import {
  canProceedQa, EMPTY_QA_FORM_STATE,
  type QaCaptureFormState, type QaStep,
} from '@/lib/mobile-qa-capture-validation';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; }
  catch { return 'DEMO'; }
}

export default function MobileQualiCheckCapture(): JSX.Element {
  const ENTITY = getActiveEntityCode();
  const [step, setStep] = useState<QaStep>(1);
  const [s, setS] = useState<QaCaptureFormState>(EMPTY_QA_FORM_STATE);
  const [pending, setPending] = useState<QaInspectionRecord[]>([]);
  const [spec, setSpec] = useState<QaSpec | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPending(listPendingQa(ENTITY));
  }, [ENTITY]);

  const update = (patch: Partial<QaCaptureFormState>): void =>
    setS(prev => ({ ...prev, ...patch }));

  const pick = (q: QaInspectionRecord): void => {
    const line = q.lines?.[0];
    update({
      qa_id: q.id, qa_no: q.qa_no, spec_id: q.spec_id ?? null,
      line_id: line?.id ?? null,
      item_name: line?.item_name ?? '',
      qty_inspected: line?.qty_inspected ?? 0,
      qty_passed: 0, qty_failed: 0, qty_sample: 0,
      failure_reason: '', parameter_values: {}, photo_urls: [],
    });
    if (q.spec_id) {
      const sp = getQaSpec(q.spec_id, ENTITY);
      setSpec(sp);
    } else {
      setSpec(null);
    }
  };

  const capturePhotoStep = async (): Promise<void> => {
    const r = await capturePhoto();
    if (!r.ok || !r.data_url) { toast.error(r.reason ?? 'Camera failed'); return; }
    setS(prev => ({ ...prev, photo_urls: [...prev.photo_urls, r.data_url as string] }));
    toast.success('Photo captured');
  };

  const setParamValue = (paramId: string, value: string): void => {
    setS(prev => ({
      ...prev,
      parameter_values: { ...prev.parameter_values, [paramId]: value },
    }));
  };

  const submit = async (): Promise<void> => {
    if (!s.qa_id || !s.line_id) {
      toast.error('No inspection selected');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        qa_id: s.qa_id, line_id: s.line_id,
        qty_passed: s.qty_passed, qty_failed: s.qty_failed,
        failure_reason: s.qty_failed > 0 ? s.failure_reason : null,
        parameter_values: s.parameter_values,
        photo_urls: s.photo_urls,
      };
      if (!navigator.onLine) {
        // [JWT] Offline queue · matches MobileGateGuardCapture pattern
        enqueueWrite(ENTITY, 'rating_submit', { kind: 'qa_inspection', input: payload });
        toast.success('Inspection queued — will sync when online');
      } else {
        await updateInspectionLine(
          s.qa_id, s.line_id,
          s.qty_passed, s.qty_failed,
          s.qty_failed > 0 ? s.failure_reason : null,
          ENTITY, 'mobile-inspector',
        );
        await completeInspection(s.qa_id, ENTITY, 'mobile-inspector');
        toast.success(`Inspection ${s.qa_no} submitted`);
      }
      setS(EMPTY_QA_FORM_STATE);
      setSpec(null);
      setPending(listPendingQa(ENTITY));
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">QualiCheck Capture</h1>
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <Badge variant="outline">Step {step} / 5</Badge>
        </div>
      </header>
      <Progress value={(step / 5) * 100} className="h-2" />

      {step === 1 && (
        <div className="space-y-3">
          <Label>Pick a pending inspection</Label>
          {pending.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              <CheckSquare className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              No pending inspections. Plans auto-trigger when GRN/MIN posts.
            </Card>
          ) : (
            <div className="space-y-2">
              {pending.map(q => (
                <Card
                  key={q.id}
                  onClick={() => pick(q)}
                  className={`p-3 cursor-pointer transition-colors ${
                    s.qa_id === q.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{q.qa_no}</div>
                      <div className="text-sm truncate">{q.lines?.[0]?.item_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{q.bill_no}</div>
                    </div>
                    <Badge variant="outline">{q.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="rounded-lg border p-3 bg-card text-sm">
            <div className="font-mono text-xs text-muted-foreground">{s.qa_no}</div>
            <div className="font-medium">{s.item_name}</div>
            <div className="text-xs text-muted-foreground font-mono">
              Inspected qty: {s.qty_inspected}
            </div>
          </div>
          <Label>Qty Passed</Label>
          <Input
            type="number" min={0} max={s.qty_inspected}
            value={s.qty_passed}
            onChange={e => update({ qty_passed: Math.max(0, Number(e.target.value) || 0) })}
            className="font-mono"
            inputMode="numeric"
          />
          <Label>Qty Failed</Label>
          <Input
            type="number" min={0} max={s.qty_inspected}
            value={s.qty_failed}
            onChange={e => update({ qty_failed: Math.max(0, Number(e.target.value) || 0) })}
            className="font-mono"
            inputMode="numeric"
          />
          <Label>Qty Sample (D-332)</Label>
          <Input
            type="number" min={0} max={s.qty_inspected}
            value={s.qty_sample}
            onChange={e => update({ qty_sample: Math.max(0, Number(e.target.value) || 0) })}
            className="font-mono"
            inputMode="numeric"
          />
          {s.qty_failed > 0 && (
            <>
              <Label>Failure reason</Label>
              <Input
                value={s.failure_reason}
                onChange={e => update({ failure_reason: e.target.value })}
                placeholder="e.g. Surface scratch, dimension out of tolerance"
              />
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {!spec ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              <Beaker className="h-6 w-6 mx-auto mb-2" />
              No spec linked to this inspection. Skip to photos.
            </Card>
          ) : (
            <>
              <div className="text-xs text-muted-foreground font-mono">
                {spec.code} · {spec.parameters.length} parameter(s)
              </div>
              {spec.parameters.map((p: QaSpecParameter) => {
                const val = s.parameter_values[p.id] ?? '';
                const evalResult = val ? interpretParameter(p, val) : null;
                return (
                  <div key={p.id} className="space-y-1">
                    <Label className="flex items-center gap-2">
                      {p.name}
                      {p.is_critical && <Badge variant="destructive" className="text-[10px]">critical</Badge>}
                      <span className="text-[10px] text-muted-foreground">
                        ({p.parameter_type}{p.unit ? ` · ${p.unit}` : ''})
                      </span>
                    </Label>
                    <Input
                      value={val}
                      onChange={e => setParamValue(p.id, e.target.value)}
                      placeholder={
                        p.parameter_type === 'numeric'
                          ? `${p.min_value ?? '?'} – ${p.max_value ?? '?'}`
                          : p.expected_text ?? ''
                      }
                      className={p.parameter_type === 'numeric' ? 'font-mono' : ''}
                      inputMode={p.parameter_type === 'numeric' ? 'decimal' : 'text'}
                    />
                    {evalResult && (
                      <p className={`text-[11px] ${evalResult.pass ? 'text-emerald-600' : 'text-destructive'}`}>
                        {evalResult.pass ? '✓ ' : '✗ '}{evalResult.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <Button onClick={capturePhotoStep} variant="outline" className="w-full">
            <Camera className="h-4 w-4 mr-2" />
            Capture inspection photo ({s.photo_urls.length})
          </Button>
          {s.photo_urls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {s.photo_urls.map((url, i) => (
                <img
                  key={`qa-photo-${i}-${url.slice(-12)}`}
                  src={url}
                  alt={`QA evidence ${i + 1}`}
                  className="rounded border"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3 text-sm">
          <Card className="p-3 space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold">Review</span>
            </div>
            <div className="font-mono"><span className="text-muted-foreground font-sans">QA No:</span> {s.qa_no}</div>
            <div><span className="text-muted-foreground">Item:</span> {s.item_name}</div>
            <div className="font-mono">
              <span className="text-muted-foreground font-sans">Qty:</span>
              {' '}P {s.qty_passed} · F {s.qty_failed} · S {s.qty_sample} / I {s.qty_inspected}
            </div>
            {spec && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FlaskConical className="h-3 w-3" />
                Parameters captured: {Object.keys(s.parameter_values).length} / {spec.parameters.length}
              </div>
            )}
            <div><span className="text-muted-foreground">Photos:</span> {s.photo_urls.length}</div>
            {s.qty_failed > 0 && (
              <div><span className="text-muted-foreground">Failure:</span> {s.failure_reason || '—'}</div>
            )}
          </Card>
          <Button onClick={submit} disabled={submitting} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting…' : 'Submit Inspection'}
          </Button>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((step - 1) as QaStep)}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        )}
        {step < 5 && (
          <Button
            onClick={() => setStep((step + 1) as QaStep)}
            disabled={!canProceedQa(s, step)}
            className="flex-1"
          >
            Next<ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
