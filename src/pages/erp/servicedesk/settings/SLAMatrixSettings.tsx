/**
 * @file        src/pages/erp/servicedesk/settings/SLAMatrixSettings.tsx
 * @purpose     C.1d · 28-cell SLA Matrix editor (call_type × severity) · response/resolution/flash
 * @sprint      T-Phase-1.C.1d · Block D.1
 * @decisions   D-NEW-CY 2nd consumer · FR-77 path · cc-compliance-settings READ-ONLY contract
 * @iso         Functional Suitability + Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  getSLAMatrixSettings,
  updateSLAMatrixSettings,
  validateSLAMatrix,
  type SLAMatrixSettings as Settings,
  type SLAMatrixCell,
} from '@/lib/cc-compliance-settings';
import type { SLASeverity } from '@/types/call-type';

const ENTITY = 'OPRX';
const SEVS: SLASeverity[] = ['sev1_critical', 'sev2_high', 'sev3_medium', 'sev4_low'];
const SEV_LABEL: Record<SLASeverity, string> = {
  sev1_critical: 'Sev1 · Critical',
  sev2_high: 'Sev2 · High',
  sev3_medium: 'Sev3 · Medium',
  sev4_low: 'Sev4 · Low',
};

export function SLAMatrixSettings(): JSX.Element {
  const [s, setS] = useState<Settings>(getSLAMatrixSettings(ENTITY));
  useEffect(() => setS(getSLAMatrixSettings(ENTITY)), []);

  const callTypes = useMemo(
    () => Array.from(new Set(s.matrix.map((c) => c.call_type_code))),
    [s],
  );

  const findCell = (ct: string, sv: SLASeverity): SLAMatrixCell | undefined =>
    s.matrix.find((c) => c.call_type_code === ct && c.severity === sv);

  const updateCell = (ct: string, sv: SLASeverity, patch: Partial<SLAMatrixCell>): void => {
    setS({
      ...s,
      matrix: s.matrix.map((c) =>
        c.call_type_code === ct && c.severity === sv ? { ...c, ...patch } : c,
      ),
    });
  };

  const onSave = (): void => {
    const v = validateSLAMatrix(s);
    if (!v.valid) {
      toast.error(v.error ?? 'SLA matrix invalid');
      return;
    }
    try {
      // [JWT] PUT /api/servicedesk/sla-matrix
      updateSLAMatrixSettings(ENTITY, s, 'current_user');
      toast.success('SLA matrix saved');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SLA Matrix · Response · Resolution · Flash Timer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {callTypes.length} call types × {SEVS.length} severities = {s.matrix.length} cells
          </p>
        </div>
        <Button onClick={onSave}>Save Matrix</Button>
      </div>

      <Card className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left p-3 font-medium">Call Type</th>
              {SEVS.map((sv) => (
                <th key={sv} className="text-left p-3 font-medium">{SEV_LABEL[sv]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {callTypes.map((ct) => (
              <tr key={ct} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{ct}</td>
                {SEVS.map((sv) => {
                  const cell = findCell(ct, sv);
                  if (!cell) return <td key={sv} className="p-3 text-muted-foreground">—</td>;
                  return (
                    <td key={sv} className="p-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16">Response</span>
                          <Input
                            type="number"
                            min="0"
                            className="h-7 w-20 font-mono text-xs"
                            value={cell.response_hours}
                            onChange={(e) =>
                              updateCell(ct, sv, { response_hours: Number(e.target.value) })
                            }
                          />
                          <span className="text-xs text-muted-foreground">h</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16">Resolution</span>
                          <Input
                            type="number"
                            min="0"
                            className="h-7 w-20 font-mono text-xs"
                            value={cell.resolution_hours}
                            onChange={(e) =>
                              updateCell(ct, sv, { resolution_hours: Number(e.target.value) })
                            }
                          />
                          <span className="text-xs text-muted-foreground">h</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16">Flash</span>
                          <Input
                            type="number"
                            min="0"
                            className="h-7 w-20 font-mono text-xs"
                            value={cell.flash_timer_minutes}
                            onChange={(e) =>
                              updateCell(ct, sv, { flash_timer_minutes: Number(e.target.value) })
                            }
                          />
                          <span className="text-xs text-muted-foreground">m</span>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
