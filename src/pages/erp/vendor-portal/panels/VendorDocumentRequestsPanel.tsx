/**
 * @file        src/pages/erp/vendor-portal/panels/VendorDocumentRequestsPanel.tsx
 * @purpose     Document request tracker · requested → submitted → verified · overdue auto-flag
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileSignature, Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  createDocumentRequest, listDocumentRequests, updateDocumentRequestStatus, flagOverdueDocumentRequests,
} from '@/lib/vendor-risk-compliance-engine';
import type { VendorDocumentRequest, DocumentRequestStatus } from '@/types/vendor-document-request';

export function VendorDocumentRequestsPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try { return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE; }
    catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);
  const [rows, setRows] = useState<VendorDocumentRequest[]>(() => listDocumentRequests(entityCode));
  const [form, setForm] = useState({ vendor_id: '', doc_type: '', due_date: '' });

  const submit = (): void => {
    if (!form.vendor_id || !form.doc_type) { toast.error('Vendor + doc-type required'); return; }
    createDocumentRequest(entityCode, form);
    setRows(listDocumentRequests(entityCode));
    setForm({ vendor_id: '', doc_type: '', due_date: '' });
    toast.success('Document request created');
  };

  const sweepOverdue = (): void => {
    const n = flagOverdueDocumentRequests(entityCode);
    setRows(listDocumentRequests(entityCode));
    toast.success(`${n} request(s) flagged overdue`);
  };

  const advance = (id: string, status: DocumentRequestStatus): void => {
    updateDocumentRequestStatus(entityCode, id, status);
    setRows(listDocumentRequests(entityCode));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <FileSignature className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Document Requests</h1>
            <p className="text-sm text-muted-foreground">requested → submitted → verified · auto-overdue on due-date breach</p>
          </div>
        </div>
        <Button variant="outline" onClick={sweepOverdue}><Clock className="h-4 w-4 mr-1" /> Sweep overdue</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>New Request</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Vendor ID" value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })} />
          <Input placeholder="Doc type (GST cert / ISO / PAN…)" value={form.doc_type} onChange={e => setForm({ ...form, doc_type: e.target.value })} />
          <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          <Button onClick={submit}><Plus className="h-4 w-4 mr-1" /> Request</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Requests ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{r.doc_type}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      vendor={r.vendor_id} · due={r.due_date || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'overdue' ? 'destructive' : r.status === 'verified' ? 'default' : 'outline'}>
                      {r.status}
                    </Badge>
                    {r.status === 'requested' && <Button size="sm" variant="outline" onClick={() => advance(r.id, 'submitted')}>Mark submitted</Button>}
                    {r.status === 'submitted' && <Button size="sm" variant="outline" onClick={() => advance(r.id, 'verified')}>Verify</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
