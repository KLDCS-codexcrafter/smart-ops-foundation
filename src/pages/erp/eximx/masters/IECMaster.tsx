/**
 * @file        src/pages/erp/eximx/masters/IECMaster.tsx
 * @purpose     IEC Master · full lifecycle CRUD · 18-field form · 3-bucket validity
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q2=b full lifecycle · v10 FINAL · FR-50 multi-entity scope
 */
import { useState, useEffect } from 'react';
import { listIECs, upsertIEC, deleteIEC, classifyIECValidity } from '@/lib/iec-engine';
import type { IEC, IECStatus, IECType } from '@/types/iec';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DEFAULT_ENTITY = 'sinha-trading';

export function IECMaster(): JSX.Element {
  const [iecs, setIecs] = useState<IEC[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IEC | null>(null);

  useEffect(() => { setIecs(listIECs(DEFAULT_ENTITY)); }, []);

  const handleSave = (iec: IEC): void => {
    setIecs(upsertIEC(DEFAULT_ENTITY, iec));
    setShowForm(false); setEditing(null);
  };

  const handleDelete = (id: string): void => {
    if (!window.confirm('Delete this IEC?')) return;
    setIecs(deleteIEC(DEFAULT_ENTITY, id));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">IEC Master · Importer-Exporter Code</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ New IEC</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {iecs.map(iec => {
          const bucket = classifyIECValidity(iec);
          const badgeVariant: 'default' | 'secondary' | 'destructive' =
            bucket === 'valid' ? 'default' : bucket === 'expiring-90d' ? 'secondary' : 'destructive';
          return (
            <Card key={iec.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{iec.legal_name}</span>
                  <Badge variant={badgeVariant}>{bucket}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div><strong>IEC #:</strong> <span className="font-mono">{iec.iec_number}</span></div>
                <div><strong>PAN:</strong> <span className="font-mono">{iec.pan}</span></div>
                <div><strong>Type:</strong> {iec.iec_type}</div>
                <div><strong>AD Code:</strong> <span className="font-mono">{iec.ad_code}</span></div>
                <div><strong>Valid till:</strong> <span className="font-mono">{iec.validity}</span></div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(iec); setShowForm(true); }}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(iec.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {iecs.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No IEC records · Click &quot;+ New IEC&quot; to register</p>
      )}
      {showForm && <IECForm editing={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

interface IECFormProps {
  editing: IEC | null;
  onSave: (iec: IEC) => void;
  onCancel: () => void;
}

function IECForm({ editing, onSave, onCancel }: IECFormProps): JSX.Element {
  const [form, setForm] = useState<IEC>(editing || {
    id: `iec-${Date.now()}`, entity_id: DEFAULT_ENTITY, iec_number: '', issue_date: '',
    validity: '', status: 'active' as IECStatus, legal_name: '', pan: '',
    iec_type: 'proprietor' as IECType, registered_address: '', city: '', state: '', pincode: '',
    branches: [], ad_code: '', bank_name: '', bank_branch: '', bank_account_number: '',
    primary_activities: [], goods_categories: [],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });

  return (
    <Card>
      <CardHeader><CardTitle>{editing ? 'Edit IEC' : 'New IEC'}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block"><span className="text-sm">IEC Number</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.iec_number} onChange={e => setForm({ ...form, iec_number: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Legal Name</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} /></label>
          <label className="block"><span className="text-sm">PAN</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} /></label>
          <label className="block"><span className="text-sm">Type</span>
            <select className="w-full border rounded px-2 py-1 bg-background" value={form.iec_type} onChange={e => setForm({ ...form, iec_type: e.target.value as IECType })}>
              <option value="proprietor">Proprietor</option><option value="partnership">Partnership</option><option value="company">Company</option><option value="huf">HUF</option><option value="trust">Trust</option><option value="society">Society</option><option value="llp">LLP</option>
            </select>
          </label>
          <label className="block"><span className="text-sm">Issue Date</span><input type="date" className="w-full border rounded px-2 py-1 bg-background" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Validity</span><input type="date" className="w-full border rounded px-2 py-1 bg-background" value={form.validity} onChange={e => setForm({ ...form, validity: e.target.value })} /></label>
          <label className="block"><span className="text-sm">AD Code</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.ad_code} onChange={e => setForm({ ...form, ad_code: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Bank Name</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Bank Branch</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.bank_branch} onChange={e => setForm({ ...form, bank_branch: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Bank A/C #</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.bank_account_number} onChange={e => setForm({ ...form, bank_account_number: e.target.value })} /></label>
          <label className="block md:col-span-2"><span className="text-sm">Registered Address</span><textarea className="w-full border rounded px-2 py-1 bg-background" rows={2} value={form.registered_address} onChange={e => setForm({ ...form, registered_address: e.target.value })} /></label>
          <label className="block"><span className="text-sm">City</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label>
          <label className="block"><span className="text-sm">State</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Pincode</span><input className="w-full border rounded px-2 py-1 bg-background" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} /></label>
          <label className="block"><span className="text-sm">Status</span>
            <select className="w-full border rounded px-2 py-1 bg-background" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as IECStatus })}>
              <option value="active">Active</option><option value="suspended">Suspended</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}
