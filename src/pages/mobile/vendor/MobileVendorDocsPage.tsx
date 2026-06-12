/**
 * MobileVendorDocsPage.tsx — Document requests: read + upload via capture convention.
 * CONSUMES vendorDocumentRequestKey. On upload, marks request status='submitted'
 * with submitted_at — the SAME fields the desktop vendor-document-requests panel reads.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { type VendorDocumentRequest, vendorDocumentRequestKey } from '@/types/vendor-document-request';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

export default function MobileVendorDocsPage(): JSX.Element {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [version, setVersion] = useState(0);

  const list = useMemo<VendorDocumentRequest[]>(() => {
    if (!session) return [];
    return loadList<VendorDocumentRequest>(vendorDocumentRequestKey(session.entity_code))
      .sort((a, b) => b.requested_at.localeCompare(a.requested_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, version]);

  function onUpload(reqId: string, file: File): void {
    if (!session) return;
    const reader = new FileReader();
    reader.onload = () => {
      const key = vendorDocumentRequestKey(session.entity_code);
      const all = loadList<VendorDocumentRequest>(key);
      const idx = all.findIndex(r => r.id === reqId);
      if (idx < 0) return;
      const now = new Date().toISOString();
      all[idx] = {
        ...all[idx],
        status: 'submitted',
        submitted_at: now,
        updated_at: now,
      };
      localStorage.setItem(key, JSON.stringify(all));
      toast.success(`Submitted ${file.name}`);
      setVersion(v => v + 1);
    };
    reader.readAsDataURL(file);
  }

  if (!session) return <div className="p-6 text-center text-sm text-muted-foreground">Session required</div>;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold">Documents</h1>
        <Badge variant="outline" className="ml-auto text-[10px]">{list.length}</Badge>
      </div>
      {list.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No document requests</Card>
      ) : (
        <div className="space-y-2">
          {list.map(r => (
            <Card key={r.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.document_label}</p>
                  <p className="text-[10px] text-muted-foreground">{r.document_type} · requested {r.requested_at.slice(0,10)}</p>
                  {r.reason && <p className="text-[11px] mt-1">{r.reason}</p>}
                </div>
                <Badge variant="outline" className="text-[9px]">{r.status}</Badge>
              </div>
              {(r.status === 'pending' || r.status === 'sent' || r.status === 'rejected') && (
                <label className="border rounded-lg p-2 flex items-center gap-2 cursor-pointer hover:border-primary/40 text-xs">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Upload</span>
                  <input type="file" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(r.id, f); }} />
                </label>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
