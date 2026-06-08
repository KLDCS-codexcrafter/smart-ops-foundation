/**
 * @file        src/pages/erp/servicedesk/phase2-preview/IoTReadyFoundation.tsx
 * @purpose     S38 IoT-Ready Foundation · Tier-L FULL · promoted at A.3
 *              Threshold rule CRUD + dry-run. Telemetry ingestion stays Wave-2 (server).
 * @sprint      T-Phase-1.A.3 · T-A3-ServiceDesk-Capstone · Pass 3 of 3
 * @iso         Functional Suitability + Reliability
 * @reuses      servicedesk-capstone-engine IoT helpers
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  listIoTRules,
  saveIoTRule,
  deleteIoTRule,
  evaluateIoTRules,
  type IoTSignal,
  type IoTComparator,
  type IoTThresholdRule,
} from '@/lib/servicedesk-capstone-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

const SIGNALS: IoTSignal[] = ['temperature_c', 'vibration_mm_s', 'runtime_hours', 'pressure_kpa'];
const COMPARATORS: IoTComparator[] = ['gt', 'lt', 'eq'];

export function IoTReadyFoundation(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [rules, setRules] = useState<IoTThresholdRule[]>([]);
  const [draft, setDraft] = useState({
    asset_id: '',
    signal: 'temperature_c' as IoTSignal,
    comparator: 'gt' as IoTComparator,
    threshold_value: '',
    auto_ticket: true,
  });
  const [sample, setSample] = useState('');

  useEffect(() => {
    setRules(listIoTRules(entityCode));
  }, [entityCode]);

  const addRule = (): void => {
    if (!draft.asset_id.trim() || !draft.threshold_value.trim()) {
      toast.error('Asset ID and threshold are required');
      return;
    }
    const rule: IoTThresholdRule = {
      id: `iot-${Date.now()}`,
      asset_id: draft.asset_id.trim(),
      signal: draft.signal,
      comparator: draft.comparator,
      threshold_value: parseFloat(draft.threshold_value),
      severity: 'sev2_high',
      auto_ticket: draft.auto_ticket,
      created_at: new Date().toISOString(),
    };
    saveIoTRule(entityCode, rule);
    setRules(listIoTRules(entityCode));
    setDraft({ ...draft, asset_id: '', threshold_value: '' });
    toast.success('Rule saved');
  };

  const removeRule = (id: string): void => {
    deleteIoTRule(entityCode, id);
    setRules(listIoTRules(entityCode));
  };

  const dryRunResults = (() => {
    const lines = sample
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const samples = lines
      .map((l) => {
        const [asset_id, signal, value] = l.split(',').map((s) => s.trim());
        return asset_id && signal && value
          ? { asset_id, signal: signal as IoTSignal, value: parseFloat(value) }
          : null;
      })
      .filter((s): s is { asset_id: string; signal: IoTSignal; value: number } => s !== null && !Number.isNaN(s.value));
    return evaluateIoTRules(rules, samples);
  })();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">IoT-Ready Foundation</h1>
          <Badge variant="default">S38 · Tier-L LIVE</Badge>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Add threshold rule</h2>
        <div className="grid grid-cols-5 gap-2">
          <div>
            <Label className="text-xs">Asset ID</Label>
            <Input value={draft.asset_id} onChange={(e) => setDraft({ ...draft, asset_id: e.target.value })} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs">Signal</Label>
            <select
              value={draft.signal}
              onChange={(e) => setDraft({ ...draft, signal: e.target.value as IoTSignal })}
              className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              {SIGNALS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Op</Label>
            <select
              value={draft.comparator}
              onChange={(e) => setDraft({ ...draft, comparator: e.target.value as IoTComparator })}
              className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              {COMPARATORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Threshold</Label>
            <Input
              inputMode="decimal"
              value={draft.threshold_value}
              onChange={(e) => setDraft({ ...draft, threshold_value: e.target.value })}
              className="font-mono"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addRule} className="w-full">Add rule</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">Active rules ({rules.length})</h2>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rules yet. Add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2">Asset</th><th>Signal</th><th>Op</th><th>Threshold</th><th>Auto-ticket</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 font-mono">{r.asset_id}</td>
                  <td className="font-mono text-xs">{r.signal}</td>
                  <td className="font-mono">{r.comparator}</td>
                  <td className="font-mono">{r.threshold_value}</td>
                  <td>{r.auto_ticket ? <Badge variant="default">yes</Badge> : <Badge variant="secondary">no</Badge>}</td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => removeRule(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-semibold">Dry-run sample telemetry</h2>
        <p className="text-xs text-muted-foreground">
          One row per line: <span className="font-mono">asset_id,signal,value</span>
        </p>
        <textarea
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          className="h-24 w-full rounded-lg border border-border bg-background p-2 font-mono text-xs"
          placeholder="AST-001,temperature_c,85"
        />
        {dryRunResults.length > 0 && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <div className="font-semibold mb-1">{dryRunResults.length} breach(es)</div>
            <ul className="space-y-1">
              {dryRunResults.map((b) => (
                <li key={`${b.rule_id}-${b.asset_id}-${b.signal}-${b.observed}`} className="font-mono text-xs">
                  {b.asset_id} · {b.signal} = {b.observed} {b.would_raise_ticket ? '→ would raise ticket' : '(rule no-ticket)'}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground border-t border-border pt-2">
          Telemetry ingestion endpoints land in Wave-2 (server). This page validates rule shapes today.
        </p>
      </Card>
    </div>
  );
}
