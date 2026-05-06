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
import { Save, Factory } from 'lucide-react';
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

      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        ⓘ Resources · Mobile · Printing · Approval · Multi-BU · Visibility flags TODO 3a-pre-2 expand to all 52 flags.
      </div>
    </div>
  );
}

export default ProductionConfigAutomationPanel;
