/**
 * @file src/pages/erp/qulicheak/Iso9001Capture.tsx
 * @sprint T-Phase-1.A.5.c-Qulicheak-Welder-Vendor-ISO-IQC
 * @decisions D-NEW-BP
 */
import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createIso9001Doc, isSafeHttpUrl, linkRecordToIso9001Doc } from '@/lib/iso9001-engine';
import {
  ISO9001_CLAUSE_LABELS, ISO9001_LINKED_TYPE_LABELS,
  type Iso9001ClauseId, type Iso9001LinkedRecord, type Iso9001LinkedRecordType,
} from '@/types/iso9001';

const VALID_LINK_TYPES: Iso9001LinkedRecordType[] = Object.keys(ISO9001_LINKED_TYPE_LABELS) as Iso9001LinkedRecordType[];

/** Parse "ncr:NCR-001, capa:CAPA-002" → Iso9001LinkedRecord[] · drops invalid entries silently. */
export function parseLinkedRecordsTextarea(s: string): Iso9001LinkedRecord[] {
  return s.split(',')
    .map((t) => t.trim()).filter(Boolean)
    .map((t) => {
      const [typeRaw, idRaw] = t.split(':').map((p) => p?.trim() ?? '');
      const type = typeRaw.toLowerCase() as Iso9001LinkedRecordType;
      if (!VALID_LINK_TYPES.includes(type) || !idRaw) return null;
      return { type, id: idRaw };
    })
    .filter((r): r is Iso9001LinkedRecord => r !== null);
}

interface Props { onSaved?: () => void; onCancel?: () => void; }

export function Iso9001Capture({ onSaved, onCancel }: Props): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [clause, setClause] = useState<Iso9001ClauseId>('8_operation');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [auditDate, setAuditDate] = useState('');
  const [auditor, setAuditor] = useState('');
  const [url, setUrl] = useState('');
  const [linksText, setLinksText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback((): void => {
    if (!user) { toast.error('No user'); return; }
    if (!title.trim() || !auditDate || !auditor.trim() || !url.trim()) {
      toast.error('Title, audit date, auditor, document URL all required');
      return;
    }
    if (!isSafeHttpUrl(url.trim())) {
      toast.error('Document URL must be http:// or https://');
      return;
    }
    setSaving(true);
    const linked_records = parseLinkedRecordsTextarea(linksText);
    const doc = createIso9001Doc(entityCode, user.id, {
      entity_id: entityId,
      clause,
      title: title.trim(),
      description: desc.trim() || null,
      audit_date: auditDate,
      auditor: auditor.trim(),
      document_url: url.trim(),
      linked_records,
    });
    setSaving(false);
    if (!doc) { toast.error('Failed to create'); return; }
    // linkRecordToIso9001Doc reachable via register · also kept reachable here for future use
    void linkRecordToIso9001Doc;
    toast.success(`ISO 9001 audit doc ${doc.id} saved`);
    onSaved?.();
  }, [user, title, desc, auditDate, auditor, url, clause, linksText, entityCode, entityId, onSaved]);

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ISO 9001 Audit Document</h1>
        <p className="text-sm text-muted-foreground mt-1">
          7-clause taxonomy · URL-only storage · Entity {entityCode}
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Document Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Clause</Label>
            <select className="w-full border rounded h-9 px-2 bg-background"
              value={clause} onChange={(e) => setClause(e.target.value as Iso9001ClauseId)}>
              {Object.entries(ISO9001_CLAUSE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Audit Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} />
            </div>
            <div>
              <Label>Auditor <span className="text-destructive">*</span></Label>
              <Input value={auditor} onChange={(e) => setAuditor(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Document URL <span className="text-destructive">*</span></Label>
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            <p className="text-xs text-muted-foreground mt-1">URL-only · base64 / data: rejected</p>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2 justify-end">
        {onCancel && <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>}
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </div>
  );
}
