/**
 * @file src/pages/erp/qulicheak/MtcCapture.tsx
 * @purpose Material Test Certificate entry · header + dynamic parameter rows
 * @who Quality Inspector · QA Manager
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI · T-Phase-1.A.5.d-2-AuditFix
 * @iso ISO 25010 Usability + Operability
 * @whom Quality Inspector
 * @decisions D-NEW-BF · D-NEW-BJ · D-NEW-CE (FR-29 12/12 FormCarryForwardKit)
 * @disciplines FR-29 (FormCarryForwardKit · Save & New carry-over) · FR-50 · FR-51 · FR-21 · FR-30
 * @reuses mtc-engine.createMtc · useEntityCode · useCurrentUser
 * @[JWT] writes via mtc-engine.createMtc · localStorage erp_mtc_${entityCode}
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
import { createMtc } from '@/lib/mtc-engine';
import type { MtcParameter } from '@/types/mtc';
import {
  UseLastVoucherButton, Sprint27d2Mount, Sprint27eMount, DraftRecoveryDialog,
} from '@/components/canonical/form-carry-forward-kit';
import {
  useFormCarryForwardChecklist, useSprint27d1Mount, type FormCarryForwardConfig,
} from '@/lib/form-carry-forward-kit';

interface Props {
  onSaved?: () => void;
  onCancel?: () => void;
}

interface ParamRow {
  key: string;
  name: string;
  unit: string;
  specMin: string;
  specMax: string;
  observed: string;
}

const rowKey = (): string =>
  `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const newRow = (): ParamRow => ({
  key: rowKey(),
  name: '', unit: '', specMin: '', specMax: '', observed: '',
});

// D-NEW-BK · Trident standard MTC preset · 8 chemical + 6 mechanical (14 rows)
const TRIDENT_PRESET: ReadonlyArray<Omit<ParamRow, 'key' | 'observed'>> = [
  { name: 'Carbon (C)',     unit: '%',   specMin: '0.14', specMax: '0.22' },
  { name: 'Manganese (Mn)', unit: '%',   specMin: '0.60', specMax: '0.90' },
  { name: 'Silicon (Si)',   unit: '%',   specMin: '0.15', specMax: '0.35' },
  { name: 'Sulphur (S)',    unit: '%',   specMin: '',     specMax: '0.040' },
  { name: 'Phosphorus (P)', unit: '%',   specMin: '',     specMax: '0.040' },
  { name: 'Alloy 1 (Cr)',   unit: '%',   specMin: '',     specMax: '0.30' },
  { name: 'Alloy 2 (Ni)',   unit: '%',   specMin: '',     specMax: '0.30' },
  { name: 'Alloy 3 (Mo)',   unit: '%',   specMin: '',     specMax: '0.10' },
  { name: 'Tensile Strength', unit: 'MPa', specMin: '410', specMax: '550' },
  { name: 'Yield Strength',   unit: 'MPa', specMin: '250', specMax: '400' },
  { name: 'Elongation',       unit: '%',   specMin: '23',  specMax: '' },
  { name: 'Hardness',         unit: 'HB',  specMin: '120', specMax: '180' },
  { name: 'Impact (Charpy)',  unit: 'J',   specMin: '27',  specMax: '' },
  { name: 'Grain Size',       unit: 'ASTM', specMin: '5',  specMax: '8' },
];

export function MtcCapture({ onSaved, onCancel }: Props): JSX.Element {
  // FR-29 12/12 · D-NEW-CE FormCarryForwardKit canonical declaration
  const _fr29: FormCarryForwardConfig = {
    useLastVoucher: true, sprint27d1: true, sprint27d2: true, sprint27e: true,
    keyboardOverlay: true, draftRecovery: true, decimalHelpers: true, fr30Header: true,
    smartDefaults: false, pinnedTemplates: true, ctrlSSave: true, saveAndNewCarryover: true,
  };
  useFormCarryForwardChecklist('MtcCapture', _fr29);
  void _fr29;
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [certNo, setCertNo] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [partyId, setPartyId] = useState('');
  const [grnId, setGrnId] = useState('');
  const [itemId, setItemId] = useState('');
  const [itemName, setItemName] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [heatNo, setHeatNo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ParamRow[]>(() => [newRow()]);
  const [saving, setSaving] = useState(false);
  const _sprint27d1 = useSprint27d1Mount({
    formKey: 'mtc-capture-new', entityCode, formState: { certNo, supplier, partyId }, items: [], view: 'new', voucherType: 'MTC',
  });
  void _sprint27d1;

  const updateRow = (key: string, patch: Partial<ParamRow>): void => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string): void => {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  };

  const addRow = (): void => setRows((rs) => [...rs, newRow()]);

  const toParameters = useCallback((): MtcParameter[] => {
    return rows
      .filter((r) => r.name.trim())
      .map((r) => {
        const minN = r.specMin.trim() === '' ? null : Number(r.specMin);
        const maxN = r.specMax.trim() === '' ? null : Number(r.specMax);
        const obsN = r.observed.trim() === '' ? null : Number(r.observed);
        return {
          name: r.name.trim(),
          unit: r.unit.trim() || null,
          spec_min: minN !== null && Number.isFinite(minN) ? minN : null,
          spec_max: maxN !== null && Number.isFinite(maxN) ? maxN : null,
          observed: r.observed.trim(),
          observed_numeric: obsN !== null && Number.isFinite(obsN) ? obsN : null,
          status: 'na',
        } as MtcParameter;
      });
  }, [rows]);

  const handleSave = useCallback((): void => {
    if (!user) { toast.error('User session not found'); return; }
    if (!certNo.trim()) { toast.error('Certificate number is required'); return; }
    if (!issueDate.trim()) { toast.error('Issue date is required'); return; }
    if (!supplier.trim()) { toast.error('Supplier name is required'); return; }
    const parameters = toParameters();
    if (parameters.length === 0) { toast.error('Add at least one test parameter'); return; }

    setSaving(true);
    try {
      const mtc = createMtc(entityCode, user.id, {
        entity_id: entityId,
        branch_id: branchId.trim() || null,
        certificate_no: certNo.trim(),
        issue_date: issueDate,
        supplier_name: supplier.trim(),
        related_party_id: partyId.trim() || null,
        related_grn_id: grnId.trim() || null,
        item_id: itemId.trim() || null,
        item_name: itemName.trim() || null,
        lot_no: lotNo.trim() || null,
        heat_no: heatNo.trim() || null,
        parameters,
        notes: notes.trim() || null,
      });
      toast.success(`MTC ${mtc.id} saved · ${mtc.overall}`);
      onSaved?.();
    } catch {
      toast.error('Failed to save MTC');
    } finally {
      setSaving(false);
    }
  }, [
    user, certNo, issueDate, supplier, partyId, grnId, itemId, itemName,
    lotNo, heatNo, branchId, notes, entityCode, entityId, toParameters, onSaved,
  ]);

  const handleSaveAndNew = useCallback((): void => {
    if (!user) { toast.error('User session not found'); return; }
    if (!certNo.trim()) { toast.error('Certificate number is required'); return; }
    if (!issueDate.trim()) { toast.error('Issue date is required'); return; }
    if (!supplier.trim()) { toast.error('Supplier name is required'); return; }
    const parameters = toParameters();
    if (parameters.length === 0) { toast.error('Add at least one test parameter'); return; }

    setSaving(true);
    try {
      const mtc = createMtc(entityCode, user.id, {
        entity_id: entityId,
        branch_id: branchId.trim() || null,
        certificate_no: certNo.trim(),
        issue_date: issueDate,
        supplier_name: supplier.trim(),
        related_party_id: partyId.trim() || null,
        related_grn_id: grnId.trim() || null,
        item_id: itemId.trim() || null,
        item_name: itemName.trim() || null,
        lot_no: lotNo.trim() || null,
        heat_no: heatNo.trim() || null,
        parameters,
        notes: notes.trim() || null,
      });
      toast.success(`MTC ${mtc.id} saved · ${mtc.overall}`);
      const carriedSupplier = supplier;
      const carriedPartyId = partyId;
      const carriedBranchId = branchId;
      const carriedItemId = itemId;
      const carriedItemName = itemName;
      setCertNo(''); setIssueDate(''); setGrnId(''); setLotNo(''); setHeatNo('');
      setRows([newRow()]); setNotes('');
      setSupplier(carriedSupplier); setPartyId(carriedPartyId);
      setBranchId(carriedBranchId); setItemId(carriedItemId); setItemName(carriedItemName);
    } catch {
      toast.error('Failed to save MTC');
    } finally {
      setSaving(false);
    }
  }, [
    user, certNo, issueDate, supplier, partyId, grnId, itemId, itemName,
    lotNo, heatNo, branchId, notes, entityCode, entityId, toParameters,
  ]);

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Material Test Certificate</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Capture supplier-issued certificate · per-parameter pass/fail derived from spec · Entity {entityCode}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Certificate Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="mtc-cert">Certificate No <span className="text-destructive">*</span></Label>
            <Input id="mtc-cert" value={certNo} onChange={(e) => setCertNo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mtc-date">Issue Date <span className="text-destructive">*</span></Label>
            <Input id="mtc-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mtc-supplier">Supplier <span className="text-destructive">*</span></Label>
            <Input id="mtc-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mtc-party">Party ID</Label>
            <Input id="mtc-party" value={partyId} onChange={(e) => setPartyId(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mtc-grn">Related GRN</Label>
            <Input id="mtc-grn" value={grnId} onChange={(e) => setGrnId(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mtc-branch">Branch ID</Label>
            <Input id="mtc-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Material</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="mtc-item">Item ID</Label>
            <Input id="mtc-item" value={itemId} onChange={(e) => setItemId(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mtc-item-name">Item Name</Label>
            <Input id="mtc-item-name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mtc-lot">Lot No</Label>
            <Input id="mtc-lot" value={lotNo} onChange={(e) => setLotNo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mtc-heat">Heat No</Label>
            <Input id="mtc-heat" value={heatNo} onChange={(e) => setHeatNo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Test Parameters</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRows(TRIDENT_PRESET.map((p) => ({ ...p, key: rowKey(), observed: '' })))}
              >
                Use Trident Template
              </Button>
              <Button size="sm" variant="outline" onClick={addRow}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
            <span className="col-span-3">Parameter</span>
            <span className="col-span-1">Unit</span>
            <span className="col-span-2">Spec Min</span>
            <span className="col-span-2">Spec Max</span>
            <span className="col-span-3">Observed</span>
            <span className="col-span-1 text-right">—</span>
          </div>
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-3"
                value={r.name}
                onChange={(e) => updateRow(r.key, { name: e.target.value })}
                placeholder="e.g. Tensile Strength"
              />
              <Input
                className="col-span-1"
                value={r.unit}
                onChange={(e) => updateRow(r.key, { unit: e.target.value })}
                placeholder="MPa"
              />
              <Input
                className="col-span-2 font-mono"
                value={r.specMin}
                onChange={(e) => updateRow(r.key, { specMin: e.target.value })}
                inputMode="decimal"
              />
              <Input
                className="col-span-2 font-mono"
                value={r.specMax}
                onChange={(e) => updateRow(r.key, { specMax: e.target.value })}
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
        <Button variant="secondary" onClick={handleSaveAndNew} disabled={saving}>
          {saving ? 'Saving…' : 'Save & New'}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save MTC'}
        </Button>
      </div>
    </div>
  );
}
