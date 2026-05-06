/**
 * @file     ProductionConfigAutomation.tsx
 * @sprint   T-Phase-1.3-3a-pre-1-fix-1 · Block 3 · FR-54
 * @purpose  CC-Replica panel for ProductionConfig (52 flags · 5 priority sections wired ·
 *           remaining flags TODO 3a-pre-2 expand to all 52 flags).
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, Factory, Sparkles } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  comply360ProductionKey,
  DEFAULT_PRODUCTION_CONFIG,
  type ProductionConfig,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';

export function ProductionConfigAutomationPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [config, setConfig] = useState<ProductionConfig>(DEFAULT_PRODUCTION_CONFIG);

  useEffect(() => {
    try {
      // [JWT] GET /api/comply360/production-config/:entityCode
      const raw = localStorage.getItem(comply360ProductionKey(entityCode));
      setConfig(
        raw
          ? { ...DEFAULT_PRODUCTION_CONFIG, ...(JSON.parse(raw) as Partial<ProductionConfig>) }
          : DEFAULT_PRODUCTION_CONFIG,
      );
    } catch {
      setConfig(DEFAULT_PRODUCTION_CONFIG);
    }
  }, [entityCode]);

  const update = <K extends keyof ProductionConfig>(k: K, v: ProductionConfig[K]) =>
    setConfig(c => ({ ...c, [k]: v }));

  const save = () => {
    // [JWT] PUT /api/comply360/production-config/:entityCode
    localStorage.setItem(comply360ProductionKey(entityCode), JSON.stringify(config));
    toast.success('Production Configuration saved');
  };

  const sw = (k: keyof ProductionConfig, label: string) => (
    <div className="flex items-center justify-between py-1.5">
      <Label className="text-sm">{label}</Label>
      <Switch
        checked={Boolean(config[k])}
        onCheckedChange={v => update(k, v as never)}
      />
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            Production Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            CC SSOT for Production module · 52 flags · 5 priority sections wired
          </p>
        </div>
        <Button onClick={save}><Save className="h-4 w-4 mr-2" />Save</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Master Gate · 6 Patterns</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {sw('enableProduction', 'Enable Production Module')}
          {sw('enableMakeToStock', 'Make-to-Stock')}
          {sw('enableMakeToOrder', 'Make-to-Order')}
          {sw('enableEngineerToOrder', 'Engineer-to-Order')}
          {sw('enableProcessManufacturing', 'Process Manufacturing')}
          {sw('enableContractManufacturingInward', 'Contract Mfg (Inward)')}
          {sw('enableJobWorkOutSubContracting', 'Job Work Out / Sub-Contracting')}
          {sw('enableMultiLevelBOMExplosion', 'Multi-Level BOM Explosion')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cost Basis</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Costing Basis</Label>
            <Select
              value={config.defaultCostingBasis}
              onValueChange={v => update('defaultCostingBasis', v as ProductionConfig['defaultCostingBasis'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard_cost">Standard Cost</SelectItem>
                <SelectItem value="last_purchase">Last Purchase</SelectItem>
                <SelectItem value="current_rate">Current Rate</SelectItem>
                <SelectItem value="budget_rate">Budget Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sw('enableMaterialCostVariance', 'Material Cost Variance')}
          {sw('enableLabourCostAllocation', 'Labour Cost Allocation')}
          {sw('enableOverheadAllocation', 'Overhead Allocation')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">QC Routing</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sw('enableProductionQC', 'Enable Production QC')}
          <div className="space-y-2">
            <Label>QC Failure Routing Rule</Label>
            <Select
              value={config.qcFailureRoutingRule}
              onValueChange={v => update('qcFailureRoutingRule', v as ProductionConfig['qcFailureRoutingRule'])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="block_dispatch">Block Dispatch</SelectItem>
                <SelectItem value="allow_with_concession">Allow with Concession</SelectItem>
                <SelectItem value="manual_review">Manual Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sprint 3b-pre-1 · v6.5 · Card 3b QC Integration · Q45=c polymorphic */}
      <Card>
        <CardHeader><CardTitle className="text-base">v6.5 · Card 3b QC Integration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">QC Auto-Create Mode (Q45)</Label>
            <RadioGroup
              value={config.qcAutoCreateMode ?? 'config_per_scenario'}
              onValueChange={v => update('qcAutoCreateMode', v as ProductionConfig['qcAutoCreateMode'])}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="always" id="qcam-always" />
                <Label htmlFor="qcam-always" className="text-xs">Always · auto-create on every completion (qc_required=true)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="qcam-manual" />
                <Label htmlFor="qcam-manual" className="text-xs">Manual · operator triggers via UI · no auto-create</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="config_per_scenario" id="qcam-cps" />
                <Label htmlFor="qcam-cps" className="text-xs">Per-scenario · auto for internal/third-party · manual for customer/export</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Doc Numbering</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Production Order Prefix</Label>
            <Input
              value={config.productionOrderPrefix}
              onChange={e => update('productionOrderPrefix', e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Production Order Format</Label>
            <Input
              value={config.productionOrderFormat}
              onChange={e => update('productionOrderFormat', e.target.value)}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Leak Settings</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sw('enableLeakEmissionOnVariance', 'Emit Leak on Variance')}
          <div className="space-y-2">
            <Label>Variance Threshold (%)</Label>
            <Input
              type="number"
              value={config.leakVarianceThresholdPct}
              onChange={e => update('leakVarianceThresholdPct', Number(e.target.value))}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Aging Threshold (days)</Label>
            <Input
              type="number"
              value={config.leakAgingThresholdDays}
              onChange={e => update('leakAgingThresholdDays', Number(e.target.value))}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            v6 Extensions · Plan + Multi-Output + Substitution
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {sw('enableProductionPlan', 'Production Planning (8 plan_types)')}
          {sw('enableMultiOutputPO', 'Multi-Output PO (co/by-products · scrap)')}
          {sw('enableBOMSubstitution', 'BOM Substitution (two-tier)')}
          {sw('requireSubstitutionApproval', 'Substitution requires approval')}
          {sw('enableCapacityCheck', 'Capacity Check on Plan approve')}
          {sw('enableExportLineFlag', 'Export-line flag default on Plan lines')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            v6.5 · Variance + Closure + Mobile + ITC-04
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {sw('enableMakerCheckerClosure', 'Maker-Checker on PO Closure (Q19=b)')}
          {sw('closureAutoFreezeCost', 'Freeze cost_structure on close')}
          {sw('enableITC04Export', 'ITC-04 Quarterly Export (Q20=c)')}
          {sw('mobileOfflineQueueEnabled', 'Mobile Offline Queue (PWA)')}
          <div className="flex items-center justify-between py-1.5 col-span-2">
            <Label className="text-sm">Variance Threshold % (per-component breach)</Label>
            <Input
              type="number"
              className="font-mono w-24"
              value={config.varianceThresholdPct}
              onChange={(e) => update('varianceThresholdPct', Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sprint 3-PlantOps-pre-2 · Plant Operations flags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            v6.5 · Plant Operations Flags (pre-2)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {sw('enableJobCard', 'Enable Job Card transaction')}
          {sw('enableDailyWorkRegister', 'Enable Daily Work Register')}
          {sw('enforceOperatorCertification', 'Enforce Operator Certification')}
          {sw('enforceMachineCapabilityMatch', 'Enforce Machine Capability Match')}
          {sw('enableMobileJobCardCapture', 'Enable Mobile Job Card Capture')}
          {sw('enableShiftAggregation', 'Enable Real-time Shift Aggregation')}
        </CardContent>
      </Card>

      {/* Sprint 3-PlantOps-pre-3a · Plant Analytics · Q25/Q34/Q35/Q37 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            v6.5 · Plant Analytics · Capacity + OEE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Capacity Threshold Mode (Q37=ALL polymorphic)</Label>
            <RadioGroup
              className="mt-2"
              value={config.capacityThresholdMode}
              onValueChange={v => update('capacityThresholdMode', v as 'config_pct' | 'hard_absolute' | 'per_factory')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="config_pct" id="ct-config" />
                <Label htmlFor="ct-config" className="text-xs">% via Config (founder controls thresholds)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard_absolute" id="ct-hard" />
                <Label htmlFor="ct-hard" className="text-xs">Hard Absolute (85% pass · 100% warn)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="per_factory" id="ct-pf" />
                <Label htmlFor="ct-pf" className="text-xs">Per-Factory (each Factory has own thresholds)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Pass Threshold % (default 90)</Label>
              <Input
                type="number" min={0} max={100} className="font-mono"
                value={config.capacityCheckPassThreshold}
                onChange={e => update('capacityCheckPassThreshold', Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Warn Threshold % (default 75)</Label>
              <Input
                type="number" min={0} max={100} className="font-mono"
                value={config.capacityCheckWarnThreshold}
                onChange={e => update('capacityCheckWarnThreshold', Number(e.target.value))}
              />
            </div>
          </div>

          {sw('enforceCapacityCheckOnApproval', 'Enforce Capacity Check on Plan Approval (Q25=a)')}

          <div>
            <Label className="text-xs">OEE World-Class Threshold % (default 85)</Label>
            <Input
              type="number" min={0} max={100} className="font-mono w-32"
              value={config.oeeWorldClassThreshold}
              onChange={e => update('oeeWorldClassThreshold', Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sprint 3-PlantOps-pre-3b · v6.5 · Wastage + Scheduling · D-612 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            v6.5 · Wastage + Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Default Wastage Taxonomy (Q36=ALL polymorphic)</Label>
            <RadioGroup
              className="mt-2"
              value={config.defaultWastageTaxonomy}
              onValueChange={v => update('defaultWastageTaxonomy', v as ProductionConfig['defaultWastageTaxonomy'])}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="6_reason" id="wt-6r" />
                <Label htmlFor="wt-6r" className="text-xs">6-Reason (direct JC values)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="12_category" id="wt-12c" />
                <Label htmlFor="wt-12c" className="text-xs">12-Category (Lean 6BL + TIM WOODS superset)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="template_driven" id="wt-tpl" />
                <Label htmlFor="wt-tpl" className="text-xs">Template-Driven (per factory)</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm">Default Scheduling Mode (Q38=ALL polymorphic)</Label>
            <RadioGroup
              className="mt-2"
              value={config.defaultSchedulingMode}
              onValueChange={v => update('defaultSchedulingMode', v as ProductionConfig['defaultSchedulingMode'])}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="view_only" id="sm-vo" />
                <Label htmlFor="sm-vo" className="text-xs">View Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="click_to_reschedule" id="sm-cr" />
                <Label htmlFor="sm-cr" className="text-xs">Click to Reschedule</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Enable Scheduling Conflict Detection</Label>
            <Switch
              checked={config.enableSchedulingConflictDetection}
              onCheckedChange={v => update('enableSchedulingConflictDetection', v)}
            />
          </div>

          <div>
            <Label className="text-xs">Scheduling Date Range Default</Label>
            <Select
              value={config.schedulingDateRangeDefault}
              onValueChange={v => update('schedulingDateRangeDefault', v as ProductionConfig['schedulingDateRangeDefault'])}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        ⓘ Resources · Mobile · Printing · Approval · Multi-BU · Visibility flags TODO 3a-pre-2 expand to all 52 flags.
      </div>
    </div>
  );
}

export default ProductionConfigAutomationPanel;
