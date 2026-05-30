/**
 * @file        src/pages/erp/comply360/payroll/StatutoryReturnsPage.tsx
 * @purpose     Q23 Payroll Audit Framework · 6-tab surface (Overview + 5 Layers · A/B/C/D/E).
 *              Replaces S79a stub. FR-106 PATTERN-S70b 11th scenario. DP-S79-2 stub 1 of 11 closed.
 * @sprint      Sprint 80c · T-Phase-5.B.2.1-PASS-C · DP-S80-2 · Q23
 * @consumes    comply360-payroll-audit-engine (S80b · 27 modules across 5 Layers)
 *              comply360-audit-framework-engine (S80a · raiseFinding · BAP visibility)
 *              comply360-auditor-workspace-engine (S80a · OOB-6 engagement persistence)
 * @stub-fill   DP-S79-2 stub 1 of 11 closed (was: 13-line redirect-target stub from S79a)
 * @previous-author-history  Sprint 79a · T-Phase-5.A.1.11-PASS-A · DP-S79-2 redirect-target stub
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  PAYROLL_AUDIT_MODULES,
  type PayrollAuditLayer,
  type PayrollAuditModule,
  runPayrollAuditLayer,
  runPayrollAuditModule,
} from '@/lib/comply360-payroll-audit-engine';
import { getActiveEngagement } from '@/lib/comply360-auditor-workspace-engine';
import { getActiveBAPAccount } from '@/lib/comply360-audit-framework-engine';

const LAYER_LABEL: Record<PayrollAuditLayer, string> = {
  A_salary_register: 'Layer A · Salary Register',
  B_statutory_dues: 'Layer B · Statutory Dues',
  C_gratuity_actuarial: 'Layer C · Gratuity Actuarial',
  D_compliance_audit_trail: 'Layer D · Compliance & Audit Trail',
  E_labour_codes_2026_prep: 'Layer E · Labour Codes 2026 Prep',
};

function ModuleCard({ mod, onRun, disabled }: { mod: PayrollAuditModule; onRun: () => void; disabled: boolean }): JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          #{mod.module_number} · {mod.label}
        </CardTitle>
        <CardDescription className="text-xs font-mono">{mod.code}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{mod.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {mod.reads_from.slice(0, 2).map((src) => (
              <Badge key={src} variant="outline" className="text-[10px] font-mono">{src}</Badge>
            ))}
            {mod.reads_from.length > 2 && (
              <Badge variant="outline" className="text-[10px]">+{mod.reads_from.length - 2}</Badge>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onRun} disabled={disabled}>
            Run Module
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LayerView({
  layer,
  engagementId,
  fy,
  entityCode,
  bap,
}: {
  layer: PayrollAuditLayer;
  engagementId: string | null;
  fy: string;
  entityCode: string;
  bap: ReturnType<typeof getActiveBAPAccount>;
}): JSX.Element {
  const modules = useMemo(() => PAYROLL_AUDIT_MODULES.filter((m) => m.layer === layer), [layer]);
  const disabled = engagementId === null;

  function handleRunModule(code: string): void {
    if (!engagementId) {
      toast.error('No active engagement');
      return;
    }
    const r = runPayrollAuditModule({
      module_code: code,
      engagement_id: engagementId,
      fy,
      entity_code: entityCode,
      run_by_bap: bap,
    });
    toast.success(`${code} · ${r.records_examined} records · ${r.findings_raised} findings`);
  }

  function handleRunLayer(): void {
    if (!engagementId) {
      toast.error('No active engagement');
      return;
    }
    const r = runPayrollAuditLayer({
      layer,
      engagement_id: engagementId,
      fy,
      entity_code: entityCode,
      run_by_bap: bap,
    });
    toast.success(`${LAYER_LABEL[layer]} · ${r.modules_run} modules · ${r.findings_raised} findings`);
  }

  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{LAYER_LABEL[layer]} · {modules.length} modules</h3>
        <Button size="sm" onClick={handleRunLayer} disabled={disabled}>Run Entire Layer</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modules.map((mod) => (
          <ModuleCard
            key={mod.code}
            mod={mod}
            onRun={() => handleRunModule(mod.code)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

export default function StatutoryReturnsPage(): JSX.Element {
  const engagement = getActiveEngagement();
  const bap = getActiveBAPAccount();
  const [activeTab, setActiveTab] = useState('overview');

  const totalModules = PAYROLL_AUDIT_MODULES.length;
  const layerCounts = useMemo(() => {
    const counts: Record<PayrollAuditLayer, number> = {
      A_salary_register: 0,
      B_statutory_dues: 0,
      C_gratuity_actuarial: 0,
      D_compliance_audit_trail: 0,
      E_labour_codes_2026_prep: 0,
    };
    for (const m of PAYROLL_AUDIT_MODULES) counts[m.layer]++;
    return counts;
  }, []);

  const engagementId = engagement?.id ?? null;
  const fy = engagement?.fy ?? 'FY 2025-26';
  const entityCode = engagement?.entity_code ?? 'OPERIX-DEMO';

  return (
    <div className="p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Payroll · Statutory Returns Audit</h1>
        <p className="text-sm text-muted-foreground">
          Q23 Payroll &amp; HR Audit · {totalModules} modules across 5 Layers · DP-S79-2 stub 1 of 11 closed ·
          FR-106 PATTERN-S70b 11th scenario.
        </p>
      </header>

      {!engagement && (
        <Card className="mb-4 border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            No active engagement. Open the Audit Framework Dashboard to create or select an engagement first.
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="salary-register">Salary Register</TabsTrigger>
          <TabsTrigger value="statutory-dues">Statutory Dues</TabsTrigger>
          <TabsTrigger value="gratuity">Gratuity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance &amp; Audit Trail</TabsTrigger>
          <TabsTrigger value="labour-codes">Labour Codes 2026 Prep</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Engagement</CardTitle></CardHeader>
              <CardContent>
                <p className="font-semibold">{engagement?.name ?? 'None'}</p>
                <p className="text-xs text-muted-foreground font-mono">{fy} · {entityCode}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Active BAP</CardTitle></CardHeader>
              <CardContent>
                <p className="font-mono">{bap}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Module Count</CardTitle></CardHeader>
              <CardContent>
                <p className="font-mono text-2xl">{totalModules}</p>
                <p className="text-xs text-muted-foreground">across 5 Layers</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3">
            {(Object.keys(layerCounts) as PayrollAuditLayer[]).map((layer) => (
              <Card key={layer}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs">{LAYER_LABEL[layer]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-xl">{layerCounts[layer]}</p>
                  <p className="text-[11px] text-muted-foreground">modules</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="salary-register">
          <LayerView layer="A_salary_register" engagementId={engagementId} fy={fy} entityCode={entityCode} bap={bap} />
        </TabsContent>
        <TabsContent value="statutory-dues">
          <LayerView layer="B_statutory_dues" engagementId={engagementId} fy={fy} entityCode={entityCode} bap={bap} />
        </TabsContent>
        <TabsContent value="gratuity">
          <LayerView layer="C_gratuity_actuarial" engagementId={engagementId} fy={fy} entityCode={entityCode} bap={bap} />
        </TabsContent>
        <TabsContent value="compliance">
          <LayerView layer="D_compliance_audit_trail" engagementId={engagementId} fy={fy} entityCode={entityCode} bap={bap} />
        </TabsContent>
        <TabsContent value="labour-codes">
          <LayerView layer="E_labour_codes_2026_prep" engagementId={engagementId} fy={fy} entityCode={entityCode} bap={bap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
