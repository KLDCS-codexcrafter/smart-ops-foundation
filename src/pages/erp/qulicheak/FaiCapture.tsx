/**
 * @file src/pages/erp/qulicheak/FaiCapture.tsx
 * @purpose First Article Inspection capture · per-dimension nominal ± tolerance
 * @who Quality Inspector · QA Manager
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI · T-Phase-1.A.5.d-2-AuditFix
 * @iso ISO 25010 Usability + Operability
 * @whom Quality Inspector
 * @decisions D-NEW-BG · D-NEW-BJ · D-NEW-CE (FR-29 12/12 FormCarryForwardKit)
 * @disciplines FR-29 (FormCarryForwardKit · Save & New carry-over) · FR-50 · FR-51 · FR-21 · FR-30
 * @reuses fai-engine.createFai · useEntityCode · useCurrentUser
 * @[JWT] writes via fai-engine.createFai · localStorage erp_fai_${entityCode}
 */
import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createFai } from '@/lib/fai-engine';
import type { FaiDimension } from '@/types/fai';

interface Props {
  onSaved?: () => void;
  onCancel?: () => void;
}

interface DimRow {
  key: string;
  name: string;
  unit: string;
  nominal: string;
  tolMinus: string;
  tolPlus: string;
  observed: string;
}

const newRow = (): DimRow => ({
  key: `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  name: '', unit: '', nominal: '', tolMinus: '', tolPlus: '', observed: '',
});

export function FaiCapture({ onSaved, onCancel }: Props): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [partNo, setPartNo] = useState('');
  const [partName, setPartName] = useState('');
  const [drawingNo, setDrawingNo] = useState('');
  const [drawingRev, setDrawingRev] = useState('');
  const [supplier, setSupplier] = useState('');
  const [partyId, setPartyId] = useState('');
  const [poId, setPoId] = useState('');
  const [poId2, setProdOrderId] = useState('');
  const [sampleQty, setSampleQty] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<DimRow[]>(() => [newRow()]);
  const [saving, setSaving] = useState(false);

  const updateRow = (key: string, patch: Partial<DimRow>): void => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string): void => {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  };

  const addRow = (): void => setRows((rs) => [...rs, newRow()]);

  const toDimensions = useCallback((): FaiDimension[] => {
    return rows
      .filter((r) => r.name.trim())
      .map((r) => {
        const nomN = r.nominal.trim() === '' ? null : Number(r.nominal);
        const minN = r.tolMinus.trim() === '' ? null : Number(r.tolMinus);
        const maxN = r.tolPlus.trim() === '' ? null : Number(r.tolPlus);
        const obsN = r.observed.trim() === '' ? null : Number(r.observed);
        return {
          name: r.name.trim(),
          unit: r.unit.trim() || null,
          nominal: nomN !== null && Number.isFinite(nomN) ? nomN : null,
          tol_minus: minN !== null && Number.isFinite(minN) ? minN : null,
          tol_plus: maxN !== null && Number.isFinite(maxN) ? maxN : null,
          observed: r.observed.trim(),
          observed_numeric: obsN !== null && Number.isFinite(obsN) ? obsN : null,
          status: 'na',
        } as FaiDimension;
      });
  }, [rows]);

  const handleSave = useCallback((): void => {
    if (!user) { toast.error('User session not found'); return; }
    if (!partNo.trim()) { toast.error('Part number is required'); return; }
    if (!partName.trim()) { toast.error('Part name is required'); return; }
    if (!inspectionDate.trim()) { toast.error('Inspection date is required'); return; }
    const dimensions = toDimensions();
    if (dimensions.length === 0) { toast.error('Add at least one dimension'); return; }

    const sampleQtyN = sampleQty.trim() === '' ? null : Number(sampleQty);

    setSaving(true);
    try {
      const fai = createFai(entityCode, user.id, {
        entity_id: entityId,
        branch_id: branchId.trim() || null,
        part_no: partNo.trim(),
        part_name: partName.trim(),
        drawing_no: drawingNo.trim() || null,
        drawing_rev: drawingRev.trim() || null,
        related_party_id: partyId.trim() || null,
        supplier_name: supplier.trim() || null,
        related_po_id: poId.trim() || null,
        related_production_order_id: poId2.trim() || null,
        sample_qty: sampleQtyN !== null && Number.isFinite(sampleQtyN) ? sampleQtyN : null,
        inspection_date: inspectionDate,
        dimensions,
        notes: notes.trim() || null,
      });
      toast.success(`FAI ${fai.id} saved · ${fai.overall}`);
      onSaved?.();
    } catch {
      toast.error('Failed to save FAI');
    } finally {
      setSaving(false);
    }
  }, [
    user, partNo, partName, drawingNo, drawingRev, supplier, partyId, poId, poId2,
    sampleQty, inspectionDate, branchId, notes, entityCode, entityId, toDimensions, onSaved,
  ]);

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">First Article Inspection</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Capture per-dimension nominal ± tolerance · pass/fail derived · Entity {entityCode}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Part &amp; Drawing</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="fai-part-no">Part No <span className="text-destructive">*</span></Label>
            <Input id="fai-part-no" value={partNo} onChange={(e) => setPartNo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fai-part-name">Part Name <span className="text-destructive">*</span></Label>
            <Input id="fai-part-name" value={partName} onChange={(e) => setPartName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fai-date">Inspection Date <span className="text-destructive">*</span></Label>
            <Input id="fai-date" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fai-drw">Drawing No</Label>
            <Input id="fai-drw" value={drawingNo} onChange={(e) => setDrawingNo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fai-drw-rev">Drawing Rev</Label>
            <Input id="fai-drw-rev" value={drawingRev} onChange={(e) => setDrawingRev(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fai-sample">Sample Qty</Label>
            <Input id="fai-sample" inputMode="numeric" value={sampleQty} onChange={(e) => setSampleQty(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Source</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="fai-supplier">Supplier</Label>
            <Input id="fai-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fai-party">Party ID</Label>
            <Input id="fai-party" value={partyId} onChange={(e) => setPartyId(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fai-po">Related PO</Label>
            <Input id="fai-po" value={poId} onChange={(e) => setPoId(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fai-prodorder">Production Order</Label>
            <Input id="fai-prodorder" value={poId2} onChange={(e) => setProdOrderId(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fai-branch">Branch ID</Label>
            <Input id="fai-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Dimensions</span>
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Dimension
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
            <span className="col-span-3">Dimension</span>
            <span className="col-span-1">Unit</span>
            <span className="col-span-2">Nominal</span>
            <span className="col-span-1">Tol −</span>
            <span className="col-span-1">Tol +</span>
            <span className="col-span-3">Observed</span>
            <span className="col-span-1 text-right">—</span>
          </div>
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-3"
                value={r.name}
                onChange={(e) => updateRow(r.key, { name: e.target.value })}
                placeholder="e.g. Outer Diameter"
              />
              <Input
                className="col-span-1"
                value={r.unit}
                onChange={(e) => updateRow(r.key, { unit: e.target.value })}
                placeholder="mm"
              />
              <Input
                className="col-span-2 font-mono"
                value={r.nominal}
                onChange={(e) => updateRow(r.key, { nominal: e.target.value })}
                inputMode="decimal"
              />
              <Input
                className="col-span-1 font-mono"
                value={r.tolMinus}
                onChange={(e) => updateRow(r.key, { tolMinus: e.target.value })}
                inputMode="decimal"
              />
              <Input
                className="col-span-1 font-mono"
                value={r.tolPlus}
                onChange={(e) => updateRow(r.key, { tolPlus: e.target.value })}
                inputMode="decimal"
              />
              <Input
                className="col-span-3 font-mono"
                value={r.observed}
                onChange={(e) => updateRow(r.key, { observed: e.target.value })}
                placeholder="numeric or text"
              />
              <Button
                className="col-span-1 justify-self-end"
                size="icon"
                variant="ghost"
                onClick={() => removeRow(r.key)}
                disabled={rows.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save FAI'}
        </Button>
      </div>
    </div>
  );
}
