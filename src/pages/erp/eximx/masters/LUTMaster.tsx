/**
 * @file        src/pages/erp/eximx/masters/LUTMaster.tsx
 * @purpose     LUT Master · workflow-only · 7-state machine · APR-due classifier · Moat #4
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q3=c workflow-only · Moat #4 LUT-as-Workflow · v10 FINAL
 */
import { useState, useEffect } from 'react';
import { listLUTs, upsertLUT, transitionLUT, classifyLUTExpiry } from '@/lib/lut-engine';
import type { LUT, LUTStatus } from '@/types/lut';
import { LUT_VALID_TRANSITIONS } from '@/types/lut';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DEFAULT_ENTITY = 'sinha-trading';
const CURRENT_USER = 'demo-user';

const STATUS_BADGE: Record<LUTStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline', filed: 'outline', acknowledged: 'secondary', active: 'default',
  expiring: 'secondary', 'renewal-due': 'destructive', expired: 'destructive',
};

const STATE_ORDER: LUTStatus[] = ['draft', 'filed', 'acknowledged', 'active', 'expiring', 'renewal-due', 'expired'];

export function LUTMaster(): JSX.Element {
  const [luts, setLuts] = useState<LUT[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LUT | null>(null);

  useEffect(() => { setLuts(listLUTs(DEFAULT_ENTITY)); }, []);

  const handleSave = (lut: LUT): void => {
    setLuts(upsertLUT(DEFAULT_ENTITY, lut));
    setShowForm(false); setEditing(null);
  };

  const handleTransition = (lutId: string, toStatus: LUTStatus): void => {
    const result = transitionLUT(DEFAULT_ENTITY, lutId, toStatus, CURRENT_USER);
    if (!result.success) { window.alert(result.error); return; }
    setLuts(listLUTs(DEFAULT_ENTITY));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">LUT Master · Letter of Undertaking · 7-State Workflow</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ New LUT</Button>
      </div>
      <div className="space-y-4">
        {luts.map(lut => {
          const bucket = classifyLUTExpiry(lut);
          const allowed = LUT_VALID_TRANSITIONS[lut.status] || [];
          return (
            <Card key={lut.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>LUT · <span className="font-mono">{lut.lut_number}</span> · FY {lut.fiscal_year}</span>
                  <div className="flex gap-2 items-center">
                    <Badge variant={STATUS_BADGE[lut.status]}>{lut.status}</Badge>
                    <Badge variant={bucket === 'safe' ? 'default' : 'destructive'}>{bucket}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div><strong>Validity:</strong> <span className="font-mono">{lut.validity_from} → {lut.validity_to}</span></div>
                  <div><strong>Authority:</strong> {lut.authority}</div>
                  <div><strong>APR Due:</strong> <span className="font-mono">{lut.apr_due_date}</span></div>
                  {lut.bond_amount && <div><strong>Bond Amount:</strong> <span className="font-mono">₹{lut.bond_amount.toLocaleString('en-IN')}</span></div>}
                  {lut.acceptance_date && <div><strong>Accepted:</strong> <span className="font-mono">{lut.acceptance_date}</span></div>}
                </div>

                <div className="flex items-center gap-1 pt-2 overflow-x-auto">
                  {STATE_ORDER.map((s, idx) => {
                    const isCurrent = s === lut.status;
                    const isPast = STATE_ORDER.indexOf(lut.status) > idx;
                    return (
                      <span key={s} className={`text-xs px-2 py-1 rounded ${isCurrent ? 'bg-primary text-primary-foreground' : isPast ? 'bg-muted' : 'bg-background border'}`}>
                        {idx + 1}. {s}
                      </span>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-2 flex-wrap">
                  {allowed.map(toStatus => (
                    <Button key={toStatus} size="sm" variant="outline" onClick={() => handleTransition(lut.id, toStatus)}>
                      → {toStatus}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(lut); setShowForm(true); }}>Edit</Button>
                </div>

                {lut.workflow_history && lut.workflow_history.length > 0 && (
                  <details className="pt-2">
                    <summary className="text-xs cursor-pointer">Workflow history ({lut.workflow_history.length})</summary>
                    <div className="text-xs space-y-1 mt-2 pl-4 font-mono">
                      {lut.workflow_history.map((t, i) => (
                        <div key={`${t.transitioned_at}-${i}`}>{t.transitioned_at.slice(0, 10)} · {t.from_status} → {t.to_status} by {t.transitioned_by}</div>
                      ))}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {luts.length === 0 && <p className="text-center text-muted-foreground py-12">No LUT records · Click &quot;+ New LUT&quot; to create</p>}
      {showForm && <LUTForm editing={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

interface LUTFormProps {
  editing: LUT | null;
  onSave: (lut: LUT) => void;
  onCancel: () => void;
}

function LUTForm({ editing, onSave, onCancel }: LUTFormProps): JSX.Element {
  const [form, setForm] = useState<LUT>(editing || {
    id: `lut-${Date.now()}`, entity_id: DEFAULT_ENTITY, lut_number: '', fiscal_year: '2025-2026',
    validity_from: '2025-04-01', validity_to: '2026-03-31', apr_due_date: '2026-06-30',
    authority: '', status: 'draft' as LUTStatus, workflow_history: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  return (
    <Card>
      <CardHeader><CardTitle>{editing ? 'Edit LUT' : 'New LUT'}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block"><span className="text-sm">LUT / ARN Number</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.lut_number} onChange={e => setForm({ ...form, lut_number: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Fiscal Year</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Validity From</span><input type="date" className="w-full border rounded px-2 py-1 bg-background" value={form.validity_from} onChange={e => setForm({ ...form, validity_from: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Validity To</span><input type="date" className="w-full border rounded px-2 py-1 bg-background" value={form.validity_to} onChange={e => setForm({ ...form, validity_to: e.target.value })} /></label>
          <label className="block"><span className="text-sm">APR Due Date</span><input type="date" className="w-full border rounded px-2 py-1 bg-background" value={form.apr_due_date} onChange={e => setForm({ ...form, apr_due_date: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Authority</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.authority} onChange={e => setForm({ ...form, authority: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Bond Amount (optional)</span><input type="number" className="w-full border rounded px-2 py-1 bg-background" value={form.bond_amount || ''} onChange={e => setForm({ ...form, bond_amount: e.target.value ? Number(e.target.value) : undefined })} /></label>
          <label className="block"><span className="text-sm">Acceptance Date (optional)</span><input type="date" className="w-full border rounded px-2 py-1 bg-background" value={form.acceptance_date || ''} onChange={e => setForm({ ...form, acceptance_date: e.target.value })} /></label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}
