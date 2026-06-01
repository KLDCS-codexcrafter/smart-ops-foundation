/**
 * @file        MasterLifecycleWizardPage.tsx
 * @purpose     First-Class Standalone Page #27 · Master Lifecycle Wizard
 *              5-step wizard that exercises all three Sprint 101 engines:
 *              1. Create/Select master · 2. Compliance gate (idea-12) ·
 *              3. Replicate (master-replication) · 4. Dormancy review (idea-9) ·
 *              5. Cross-entity reorder (idea-10 · items only).
 * @route       /erp/command-center/master-lifecycle-wizard
 * @reads       idea-9-sleeping-master-detector-engine · idea-10-cross-entity-reorder-engine
 *              · idea-12-compliance-aware-master-save-engine · master-replication-engine
 * @sprint      T-Phase-6.A.0.6 · Sprint 101 · Block 5 · 🏁 Arc 0 Capstone
 */
import { useMemo, useState } from 'react';
import {
  Workflow, ShieldCheck, RefreshCw, Bed, Truck, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { loadEntities } from '@/data/mock-entities';
import {
  ALL_MASTER_TYPES,
  replicateToAllEntities,
  type MasterType,
} from '@/lib/master-replication-engine';
import {
  evaluateMasterSave,
  type ComplianceGateResult,
} from '@/lib/idea-12-compliance-aware-master-save-engine';
import {
  detectSleepingMasters,
  type SleepingMaster,
} from '@/lib/idea-9-sleeping-master-detector-engine';
import {
  suggestCrossEntityReorder,
  type CrossEntityReorderSuggestion,
} from '@/lib/idea-10-cross-entity-reorder-engine';

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_META: { step: Step; label: string; icon: React.ReactNode }[] = [
  { step: 1, label: 'Create / Select', icon: <Workflow className="h-4 w-4" /> },
  { step: 2, label: 'Compliance Gate', icon: <ShieldCheck className="h-4 w-4" /> },
  { step: 3, label: 'Replicate', icon: <RefreshCw className="h-4 w-4" /> },
  { step: 4, label: 'Dormancy Review', icon: <Bed className="h-4 w-4" /> },
  { step: 5, label: 'Cross-Entity Reorder', icon: <Truck className="h-4 w-4" /> },
];

export default function MasterLifecycleWizardPage() {
  const entities = useMemo(() => loadEntities(), []);
  const [step, setStep] = useState<Step>(1);
  const [masterType, setMasterType] = useState<MasterType>('customer');
  const [recordName, setRecordName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [hsn, setHsn] = useState('');
  const [verdict, setVerdict] = useState<ComplianceGateResult | null>(null);
  const [sleeping, setSleeping] = useState<SleepingMaster[]>([]);
  const [reorder, setReorder] = useState<CrossEntityReorderSuggestion[]>([]);
  const [entityCode, setEntityCode] = useState<string>(entities[0]?.shortCode ?? '');

  const buildRecord = (): Record<string, unknown> => ({
    id: recordName || 'WIZ-DRAFT',
    name: recordName,
    gstin, pan, hsn_sac_code: hsn,
  });

  function runGate() {
    const r = evaluateMasterSave({
      master_type: masterType,
      record: buildRecord(),
      entity_code: entityCode,
    });
    setVerdict(r);
    if (r.ok) toast.success('Compliance gate passed');
    else toast.error(`${r.blocks.length} block(s) — save prevented`);
  }

  function runReplicate() {
    try {
      replicateToAllEntities({
        master_type: masterType,
        source_entity: entityCode,
        master_record: buildRecord(),
        respect_preferences: true,
      });
      toast.success('Replication triggered');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function runDormancy() {
    const rows = detectSleepingMasters({ entity_code: entityCode });
    setSleeping(rows.filter((r) => r.flag !== 'active'));
    toast.message(`${rows.length} master(s) inspected`);
  }

  function runCrossEntity() {
    const sug = suggestCrossEntityReorder({
      item_key: recordName || 'ITEM-DRAFT',
      threshold_qty: 50,
      requesting_entity: entityCode,
    });
    setReorder(sug);
    if (sug.length === 0) toast.message('No shortfall detected');
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Master Lifecycle Wizard
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            🏁 Arc 0 Capstone · exercises idea-9 / idea-10 / idea-12 + master-replication.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">Step {step} / 5</Badge>
      </div>

      <Card className="glass-card">
        <CardContent className="p-3">
          <div className="flex gap-2 flex-wrap">
            {STEP_META.map((s) => (
              <Button
                key={s.step}
                size="sm"
                variant={step === s.step ? 'default' : 'outline'}
                onClick={() => setStep(s.step)}
                className="gap-1"
              >
                {s.icon}
                {s.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {step === 1 && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Step 1 · Create / Select master</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Master Type</Label>
                <select
                  className="w-full bg-background border border-border rounded-lg p-2 font-mono text-xs"
                  value={masterType}
                  onChange={(e) => setMasterType(e.target.value as MasterType)}
                >
                  {ALL_MASTER_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Source Entity</Label>
                <select
                  className="w-full bg-background border border-border rounded-lg p-2 font-mono text-xs"
                  value={entityCode}
                  onChange={(e) => setEntityCode(e.target.value)}
                >
                  {entities.map((e) => <option key={e.id} value={e.shortCode}>{e.shortCode}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Record Name / Key</Label>
                <Input value={recordName} onChange={(e) => setRecordName(e.target.value)} placeholder="e.g. Acme Pvt Ltd or ITM-001" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">GSTIN</Label>
                <Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">PAN</Label>
                <Input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="AAAAA0000A" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">HSN / SAC (items only)</Label>
                <Input value={hsn} onChange={(e) => setHsn(e.target.value)} placeholder="e.g. 8471" />
              </div>
            </div>
            <Button size="sm" onClick={() => setStep(2)}>Next · Compliance gate</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Step 2 · Compliance gate (idea-12)</h2>
            <Button size="sm" onClick={runGate}>Run gate</Button>
            {verdict && (
              <div className="space-y-2">
                <Badge variant={verdict.ok ? 'outline' : 'destructive'} className="text-[10px]">
                  {verdict.ok ? 'PASS' : 'BLOCKED'}
                </Badge>
                {verdict.blocks.map((b) => (
                  <div key={b} className="text-xs text-destructive flex gap-1 items-center">
                    <AlertTriangle className="h-3 w-3" /> {b}
                  </div>
                ))}
                {verdict.warnings.map((w) => (
                  <div key={w} className="text-xs text-warning flex gap-1 items-center">
                    <AlertTriangle className="h-3 w-3" /> {w}
                  </div>
                ))}
                {verdict.ok && verdict.blocks.length === 0 && verdict.warnings.length === 0 && (
                  <div className="text-xs text-success flex gap-1 items-center">
                    <CheckCircle2 className="h-3 w-3" /> Clean — safe to save.
                  </div>
                )}
              </div>
            )}
            <Button size="sm" variant="outline" disabled={!verdict?.ok} onClick={() => setStep(3)}>
              Next · Replicate
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Step 3 · Replicate (Tally TDL Mechanism A)</h2>
            <Button size="sm" onClick={runReplicate}>Replicate to all entities</Button>
            <Button size="sm" variant="outline" onClick={() => setStep(4)}>Next · Dormancy</Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Step 4 · Dormancy review (idea-9)</h2>
            <Button size="sm" onClick={runDormancy}>Scan for sleeping masters</Button>
            <div className="space-y-1">
              {sleeping.map((s) => (
                <div key={`${s.master_type}|${s.master_key}`} className="text-xs flex justify-between border-b border-border/40 py-1">
                  <span className="font-mono">{s.master_type} · {s.master_key}</span>
                  <Badge variant={s.flag === 'sleeping' ? 'destructive' : 'outline'} className="text-[10px]">
                    {s.flag} · {s.days_dormant}d
                  </Badge>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => setStep(5)}>Next · Cross-entity reorder</Button>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Step 5 · Cross-entity reorder (idea-10)</h2>
            <Button size="sm" disabled={masterType !== 'item'} onClick={runCrossEntity}>
              Suggest cross-entity action
            </Button>
            {masterType !== 'item' && (
              <div className="text-xs text-muted-foreground">Only applicable to items.</div>
            )}
            {reorder.map((r) => (
              <div key={`${r.item_key}|${r.short_entity}`} className="text-xs space-y-1 border-t border-border/40 pt-2">
                <div className="font-mono">{r.item_key} · short @ {r.short_entity} (qty {r.short_qty})</div>
                <Badge variant="outline" className="text-[10px]">{r.action}</Badge>
                {r.surplus_entities.map((s) => (
                  <div key={s.entity_code} className="font-mono text-muted-foreground">
                    surplus @ {s.entity_code}: {s.available}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
