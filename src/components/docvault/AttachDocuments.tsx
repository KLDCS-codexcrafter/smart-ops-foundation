/**
 * @file        src/components/docvault/AttachDocuments.tsx
 * @purpose     S144.T1 · Reusable link-existing + upload widget for any reference
 *              (task · conversation · obligation · employee · voucher).
 *              All writes route through docvault-governance-engine.assertAcl + linkDocument.
 * @sprint      Sprint 144.T1 · T-TaskFlow-A641.8 · hotfix
 * @decisions   Upload path honors ACL upload right · ACL-denied surfaces a toast.
 *              Link-existing reuses the same assertAcl('upload') gate (creating a link
 *              is a write to the docvault link table · §L symmetric with upload).
 *              Engine is the JWT seam; this widget is pure UI.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Paperclip, Link2, Upload, X } from 'lucide-react';
import {
  listLinksForRef, linkDocument, unlinkDocument, assertAcl,
} from '@/lib/docvault-governance-engine';
import { loadDocuments, createDocument, getDocument } from '@/lib/docvault-engine';
import type { Document, DocumentLinkRef } from '@/types/docvault';

export interface AttachDocumentsProps {
  entityCode: string;
  currentUserId: string;
  refType: DocumentLinkRef['ref_type'];
  refId: string;
  refLabel: string;
  /** Optional originating department for new uploads. */
  departmentId?: string;
}

export function AttachDocuments({
  entityCode, currentUserId, refType, refId, refLabel, departmentId = 'ops',
}: AttachDocumentsProps): JSX.Element {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => { setTick((t) => t + 1); }, []);

  const links = useMemo(
    () => listLinksForRef(entityCode, refType, refId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, refType, refId, tick],
  );

  const allDocs = useMemo(
    () => loadDocuments(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );
  const linkedIds = useMemo(() => new Set(links.map((l) => l.document_id)), [links]);
  const linkable = useMemo(
    () => allDocs.filter((d) => !linkedIds.has(d.id)),
    [allDocs, linkedIds],
  );

  const [pickedDocId, setPickedDocId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');

  useEffect(() => { refresh(); }, [refresh]);

  const onLinkExisting = (): void => {
    if (!pickedDocId) { toast.error('Pick a document'); return; }
    try {
      assertAcl(entityCode, currentUserId, 'upload');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ACL denied: upload');
      return;
    }
    try {
      linkDocument(entityCode, pickedDocId, {
        ref_type: refType, ref_id: refId, ref_label: refLabel, created_by: currentUserId,
      });
      toast.success('Document linked');
      setPickedDocId('');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Link failed');
    }
  };

  const onUpload = (): void => {
    if (!uploadTitle.trim()) { toast.error('Title required'); return; }
    try {
      assertAcl(entityCode, currentUserId, 'upload');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ACL denied: upload');
      return;
    }
    try {
      const doc = createDocument(
        entityCode,
        {
          entity_id: entityCode, document_type: 'other',
          title: uploadTitle.trim(), tags: {}, originating_department_id: departmentId,
        },
        {
          version_no: 'A', file_url: `mock://${Date.now()}.bin`, file_size_bytes: 0,
          uploaded_at: new Date().toISOString(), uploaded_by: currentUserId,
        },
        currentUserId,
      );
      linkDocument(entityCode, doc.id, {
        ref_type: refType, ref_id: refId, ref_label: refLabel, created_by: currentUserId,
      });
      toast.success('Document uploaded & linked');
      setUploadTitle('');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const onUnlink = (linkId: string): void => {
    try {
      unlinkDocument(entityCode, linkId);
      toast.success('Unlinked');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unlink failed');
    }
  };

  return (
    <Card className="rounded-2xl" data-testid="attach-documents">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Documents ({links.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1 border border-border rounded-lg p-3">
            <Label className="text-xs flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Link existing
            </Label>
            <Select value={pickedDocId} onValueChange={setPickedDocId}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder={linkable.length === 0 ? 'Nothing to link' : 'Pick…'} />
              </SelectTrigger>
              <SelectContent>
                {linkable.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end">
              <Button size="sm" onClick={onLinkExisting} disabled={!pickedDocId}>
                Link
              </Button>
            </div>
          </div>
          <div className="space-y-1 border border-border rounded-lg p-3">
            <Label className="text-xs flex items-center gap-1">
              <Upload className="h-3 w-3" /> Upload new
            </Label>
            <Input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Document title…"
              className="rounded-lg"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={onUpload} disabled={!uploadTitle.trim()}>
                Upload
              </Button>
            </div>
          </div>
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No documents linked yet.
          </p>
        ) : (
          <ul className="divide-y divide-border" data-testid="linked-docs-list">
            {links.map((l) => {
              const doc: Document | null = getDocument(entityCode, l.document_id);
              return (
                <li key={l.id} className="py-2 flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {l.ref_type}
                  </Badge>
                  <span className="flex-1 truncate">{doc?.title ?? l.document_id}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                  <Button
                    size="sm" variant="ghost" className="text-destructive"
                    onClick={() => onUnlink(l.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default AttachDocuments;
