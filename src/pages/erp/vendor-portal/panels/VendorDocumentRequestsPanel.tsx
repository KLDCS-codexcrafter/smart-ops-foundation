/**
 * @file        VendorDocumentRequestsPanel.tsx
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileQuestion, Bell } from 'lucide-react';
import {
  listDocumentRequests, recordDocumentRequestReminder, updateDocumentRequestStatus,
} from '@/lib/vendor-risk-compliance-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { VendorDocumentRequest } from '@/types/vendor-document-request';

export function VendorDocumentRequestsPanel(): JSX.Element {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const [reqs, setReqs] = useState<VendorDocumentRequest[]>([]);
  useEffect(() => { setReqs(listDocumentRequests(entityCode)); }, [entityCode]);

  const reload = (): void => setReqs(listDocumentRequests(entityCode));
  const remind = (id: string): void => { recordDocumentRequestReminder(entityCode, id); reload(); };
  const send = (id: string): void => { updateDocumentRequestStatus(entityCode, id, 'sent'); reload(); };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileQuestion className="w-6 h-6" /> Document Requests
      </h1>
      <Card>
        <CardHeader><CardTitle>Outstanding Requests</CardTitle></CardHeader>
        <CardContent>
          {reqs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No document requests yet.</div>
          ) : (
            <div className="space-y-2">
              {reqs.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.status}</Badge>
                      <span className="text-sm font-medium">{r.document_label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{r.party_id}</span>
                    </div>
                    {r.reason && <div className="text-xs text-muted-foreground mt-1">{r.reason}</div>}
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      reminders: {r.reminder_count}{r.due_date ? ` · due ${r.due_date}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => send(r.id)}>Send</Button>
                    )}
                    {(r.status === 'sent' || r.status === 'submitted') && (
                      <Button size="sm" variant="outline" onClick={() => remind(r.id)}>
                        <Bell className="w-3 h-3 mr-1" /> Remind
                      </Button>
                    )}
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
