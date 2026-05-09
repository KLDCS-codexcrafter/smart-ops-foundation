/**
 * @file        src/pages/erp/qulicheak/Iso9001Capture.tsx
 * @purpose     Capture form for ISO 9001 audit documents · 7-clause taxonomy · URL-only · linked-records
 * @who         QA Manager · Internal Auditor
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.5.c-T2-AuditFix · T-Phase-1.A.5.c-T3-AuditFix · parser extraction ·
 *              T-Phase-1.A.5.d-2-AuditFix
 * @iso         ISO 9001:2015 · ISO 25010 Usability + Security
 * @whom        Audit Owner
 * @decisions   D-NEW-BP · D-NEW-BU (URL allowlist) · D-NEW-BJ (linked_records UI) ·
 *              D-NEW-CE (FR-29 12/12 FormCarryForwardKit)
 * @disciplines FR-21 (input validation) · FR-22 (kind='document') · FR-29 (FormCarryForwardKit) ·
 *              FR-30 · FR-50
 * @reuses      iso9001-engine.createIso9001Doc · isSafeHttpUrl
 * @[JWT]       writes via createIso9001Doc · localStorage erp_iso9001_${entityCode}
 * @deferrals   None (12/12 canonical)
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
import { createIso9001Doc, isSafeHttpUrl } from '@/lib/iso9001-engine';
import { parseLinkedRecordsTextarea, VALID_LINK_TYPES } from '@/lib/iso9001-link-parser';
import {
  ISO9001_CLAUSE_LABELS,
  type Iso9001ClauseId,
} from '@/types/iso9001';

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
    toast.success(`ISO 9001 audit doc ${doc.id} saved`);
    onSaved?.();
  }, [user, title, desc, auditDate, auditor, url, clause, linksText, entityCode, entityId, onSaved]);

  const handleSaveAndNew = useCallback((): void => {
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
    toast.success(`ISO 9001 audit doc ${doc.id} saved`);
    const carriedClause = clause;
    const carriedAuditor = auditor;
    setTitle(''); setDesc(''); setAuditDate(''); setUrl(''); setLinksText('');
    setClause(carriedClause); setAuditor(carriedAuditor);
  }, [user, title, desc, auditDate, auditor, url, clause, linksText, entityCode, entityId]);

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
            <p className="text-xs text-muted-foreground mt-1">URL must be http:// or https:// · javascript:/data:/file: rejected</p>
          </div>
          <div>
            <Label>Linked records (optional)</Label>
            <Textarea rows={2} value={linksText} onChange={(e) => setLinksText(e.target.value)}
              placeholder="ncr:NCR-001, capa:CAPA-002, mtc:MTC-003" />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated · valid types: {VALID_LINK_TYPES.join(' / ')}
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2 justify-end">
        {onCancel && <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>}
        <Button variant="secondary" onClick={handleSaveAndNew} disabled={saving}>
          {saving ? 'Saving…' : 'Save & New'}
        </Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </div>
  );
}
