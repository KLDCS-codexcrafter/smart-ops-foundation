/**
 * @file     ProductionOrderEntry.tsx
 * @sprint   T-Phase-1.3-3a-pre-1
 * @purpose  Production Order entry form · BOM-driven · 22 universal hookpoints (collapsible Advanced) · cost preview.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Factory, Save } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useBOM } from '@/hooks/useBOM';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import {
  comply360QCKey,
  DEFAULT_QC_CONFIG,
  type QualiCheckConfig,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import {
  createProductionOrder,
  releaseProductionOrder,
  computeMasterCost,
} from '@/lib/production-engine';
import type { Bom } from '@/types/bom';

export function ProductionOrderEntryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const config = useProductionConfig();
  const { boms } = useBOM(entityCode);
  const { items } = useInventoryItems();

  const [bomId, setBomId] = useState<string>('');
  const [plannedQty, setPlannedQty] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [targetEnd, setTargetEnd] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [advanced, setAdvanced] = useState<boolean>(false);
  const [isExport, setIsExport] = useState<boolean>(false);
  const [exportCountry, setExportCountry] = useState<string>('');
  const [exportRegBody, setExportRegBody] = useState<string>('');
  const [qcRequired, setQcRequired] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');

  const selectedBom = useMemo<Bom | undefined>(
    () => boms.find(b => b.id === bomId),
    [boms, bomId],
  );

  const masterCost = useMemo(() => {
    if (!selectedBom) return null;
    return computeMasterCost(selectedBom, plannedQty, items);
  }, [selectedBom, plannedQty, items]);

  const qcConfig: QualiCheckConfig = useMemo(() => {
    try {
      const raw = localStorage.getItem(comply360QCKey(entityCode));
      return raw ? { ...DEFAULT_QC_CONFIG, ...(JSON.parse(raw) as Partial<QualiCheckConfig>) } : DEFAULT_QC_CONFIG;
    } catch {
      return DEFAULT_QC_CONFIG;
    }
  }, [entityCode]);

  const handleSave = (release: boolean) => {
    if (!selectedBom) { toast.error('Select a BOM'); return; }
    if (!departmentId) { toast.error('Department required'); return; }
    try {
      const po = createProductionOrder(
        {
          entity_id: entityCode,
          bom_id: selectedBom.id,
          output_item_id: selectedBom.product_item_id,
          planned_qty: plannedQty,
          start_date: startDate,
          target_end_date: targetEnd,
          department_id: departmentId,
          project_id: projectId || undefined,
          customer_id: customerId || undefined,
          is_export_project: isExport,
          export_destination_country: isExport ? exportCountry : undefined,
          export_regulatory_body: isExport ? exportRegBody : undefined,
          qc_required: qcRequired,
          notes,
          created_by: 'current-user',
        },
        selectedBom,
        items,
        config,
        qcConfig,
        { id: 'current-user', name: 'Current User' },
      );
      if (release) {
        releaseProductionOrder(po, selectedBom, items, config, { id: 'current-user', name: 'Current User' });
        toast.success(`Production Order ${po.doc_no} released`);
      } else {
        toast.success(`Production Order ${po.doc_no} saved as draft`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            Production Order Entry
          </h1>
          <p className="text-sm text-muted-foreground">BOM-driven · 22 universal hookpoints · 3-layer cost preview</p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        ⓘ Masters live in <span className="font-medium">Command Center → Compliance Settings → Production Configuration</span>.
        Edit there to keep all modules in sync.
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>BOM</Label>
            <Select value={bomId} onValueChange={setBomId}>
              <SelectTrigger><SelectValue placeholder="Select BOM..." /></SelectTrigger>
              <SelectContent>
                {boms.filter(b => b.is_active).map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.product_item_code} · {b.product_item_name} (v{b.version_no})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={departmentId} onChange={e => setDepartmentId(e.target.value)} placeholder="Department ID" />
          </div>
          <div className="space-y-2">
            <Label>Planned Qty</Label>
            <Input type="number" min={1} value={plannedQty} onChange={e => setPlannedQty(Number(e.target.value))} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>UOM</Label>
            <Input readOnly value={selectedBom?.output_uom || ''} />
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Target End Date</Label>
            <Input type="date" value={targetEnd} onChange={e => setTargetEnd(e.target.value)} className="font-mono" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      {selectedBom && (
        <Card>
          <CardHeader><CardTitle className="text-base">BOM Components</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">{selectedBom.components.length} component(s)</div>
            <div className="space-y-1 text-sm">
              {selectedBom.components.map(c => (
                <div key={c.id} className="flex justify-between border-b py-1">
                  <span>{c.item_code} · {c.item_name}</span>
                  <span className="font-mono">{(c.qty * plannedQty * (1 + (c.wastage_percent || 0) / 100)).toFixed(2)} {c.uom}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {masterCost && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cost Preview · 3-Layer (Master live · Budget at release)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Master Cost (Total)</div>
              <div className="text-lg font-mono font-bold">₹{masterCost.total.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Per Unit</div>
              <div className="text-lg font-mono">₹{masterCost.per_unit.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Costing Basis</div>
              <div className="text-sm">{config.defaultCostingBasis}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Collapsible open={advanced} onOpenChange={setAdvanced}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-primary">
          <ChevronRight className={`h-4 w-4 transition-transform ${advanced ? 'rotate-90' : ''}`} />
          Advanced (22 universal hookpoints)
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Card>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label>Project ID (ETO)</Label>
                <Input value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Customer ID (MTO / Contract Mfg)</Label>
                <Input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="Optional" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={qcRequired} onCheckedChange={setQcRequired} />
                <Label>QC Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isExport} onCheckedChange={setIsExport} />
                <Label>Export Project</Label>
              </div>
              {isExport && (
                <>
                  <div className="space-y-2">
                    <Label>Destination Country</Label>
                    <Input value={exportCountry} onChange={e => setExportCountry(e.target.value)} placeholder="US · EU · UK..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Regulatory Body</Label>
                    <Input value={exportRegBody} onChange={e => setExportRegBody(e.target.value)} placeholder="FDA · CE · BIS..." />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={() => handleSave(true)}>
          Save and Release
        </Button>
      </div>
    </div>
  );
}

export default ProductionOrderEntryPanel;
