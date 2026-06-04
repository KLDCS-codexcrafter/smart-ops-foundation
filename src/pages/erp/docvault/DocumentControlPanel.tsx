/**
 * @file        src/pages/erp/docvault/DocumentControlPanel.tsx
 * @purpose     S143.T1 hotfix · per-document control surface · UI-only consumer of
 *              docvault-control-engine (zero new engine code).
 * @sprint      Sprint 143 · T-TaskFlow-A641.7 · Block 4 · T1 hotfix
 * @who         Document Controller · Owner
 * @decisions   Reachable via Documents register row action "Control" and document
 *              detail flow. All writes route through docvault-control-engine.
 *              Legacy docs render materialized defaults via getControl() without writes.
 * @[JWT]       N/A — pure UI · engine is the JWT seam
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Hash, Lock, Unlock, UserCog, History, Share2, Link2, CalendarCheck, X } from 'lucide-react';
import {
  getControl,
  previewNextDocumentCode, assignDocumentCode,
  setLifecycleStatus, setConfidentiality, setCategory, setControlDates,
  lockDocument, unlockDocument,
  transferDocumentOwnership,
  listControlAudit, listFolders,
} from '@/lib/docvault-control-engine';
import { getDocument } from '@/lib/docvault-engine';
import {
  listShares, grantShare, approveExternalShare, revokeShare,
  getEffectivePermission,
  listLinksForDocument, linkDocument, unlinkDocument,
  setFinancialYear, markReviewed,
} from '@/lib/docvault-governance-engine';
import type {
  Document, DocumentCategory, DocumentLifecycleStatus, ConfidentialityLevel,
  DocumentShare, DocumentLinkRef, SharePermission,
} from '@/types/docvault';

const PERMISSIONS: SharePermission[] = ['view', 'view_watermark', 'download', 'comment', 'edit'];
const LINK_TYPES: DocumentLinkRef['ref_type'][] = ['task', 'conversation', 'obligation', 'employee', 'voucher'];
const FY_RE = /^FY\d{4}-\d{2}$/;

const CATEGORIES: DocumentCategory[] = [
  'policy', 'procedure', 'work_instruction', 'contract', 'agreement',
  'certificate', 'license', 'statutory', 'legal', 'financial',
  'technical', 'quality', 'hr', 'correspondence', 'general',
];

const CONF_LEVELS: ConfidentialityLevel[] = [
  'public', 'internal', 'confidential', 'restricted', 'top_secret',
];

const ALL_LIFECYCLE: DocumentLifecycleStatus[] = [
  'active', 'under_review', 'published', 'expired', 'archived',
];

// Legal map mirrors engine (read-only · used to disable illegal options in UI).
// Engine remains the enforcer; this is presentation only.
const LIFECYCLE_LEGAL: Record<DocumentLifecycleStatus, DocumentLifecycleStatus[]> = {
  active: ['under_review', 'archived'],
  under_review: ['published', 'active', 'archived'],
  published: ['under_review', 'expired', 'archived'],
  expired: ['archived'],
  archived: [],
};

interface Props {
  entityCode: string;
  documentId: string;
  currentUserId: string;
  open: boolean;
  onClose: () => void;
}

export default function DocumentControlPanel({
  entityCode, documentId, currentUserId, open, onClose,
}: Props): JSX.Element | null {
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => { setTick((t) => t + 1); }, []);

  const doc: Document | null = useMemo(
    () => getDocument(entityCode, documentId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, documentId, tick],
  );

  const folders = useMemo(
    () => listFolders(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  const audit = useMemo(
    () => listControlAudit(entityCode, documentId).slice().reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, documentId, tick],
  );

  const shares = useMemo(
    () => listShares(entityCode, documentId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, documentId, tick],
  );
  const links = useMemo(
    () => listLinksForDocument(entityCode, documentId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, documentId, tick],
  );

  const [xferOpen, setXferOpen] = useState(false);
  const [xferTo, setXferTo] = useState('');
  const [xferReason, setXferReason] = useState('');

  // Sharing dialog state
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMode, setShareMode] = useState<'internal' | 'external'>('internal');
  const [shareGrantee, setShareGrantee] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePerm, setSharePerm] = useState<SharePermission>('view');
  const [shareExpires, setShareExpires] = useState('');
  const [previewUser, setPreviewUser] = useState('');

  // Link dialog state
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkType, setLinkType] = useState<DocumentLinkRef['ref_type']>('task');
  const [linkRefId, setLinkRefId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  // FY
  const [fyValue, setFyValue] = useState('');

  useEffect(() => { if (open) refresh(); }, [open, refresh]);


  if (!doc) return null;
  const ctrl = getControl(doc);
  const codePreview = ctrl.category ? previewNextDocumentCode(entityCode, ctrl.category) : null;
  const hasCode = Boolean(ctrl.document_code);
  const legalNexts = LIFECYCLE_LEGAL[ctrl.lifecycle_status ?? 'active'];

  const safe = (fn: () => void): void => {
    try { fn(); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const onAssignCode = (): void => safe(() => {
    const r = assignDocumentCode(entityCode, doc.id, currentUserId);
    toast.success(`Code assigned: ${r.code}`);
  });

  const onCategory = (v: string): void => safe(() => {
    setCategory(entityCode, doc.id, v as DocumentCategory, currentUserId);
    toast.success('Category updated');
  });

  const onLifecycle = (v: string): void => safe(() => {
    setLifecycleStatus(entityCode, doc.id, v as DocumentLifecycleStatus, currentUserId);
    toast.success(`Lifecycle → ${v}`);
  });

  const onConfidentiality = (v: string): void => safe(() => {
    setConfidentiality(entityCode, doc.id, v as ConfidentialityLevel, currentUserId);
    toast.success(`Confidentiality → ${v}`);
  });

  const onDates = (patch: Parameters<typeof setControlDates>[2]): void => safe(() => {
    setControlDates(entityCode, doc.id, patch, currentUserId);
    toast.success('Dates updated');
  });

  const onLock = (): void => safe(() => {
    lockDocument(entityCode, doc.id, currentUserId); toast.success('Locked');
  });
  const onUnlock = (): void => safe(() => {
    unlockDocument(entityCode, doc.id, currentUserId); toast.success('Unlocked');
  });

  const onTransferSubmit = (): void => {
    if (!xferReason.trim()) { toast.error('Reason is mandatory'); return; }
    if (!xferTo.trim()) { toast.error('New owner user-id required'); return; }
    safe(() => {
      transferDocumentOwnership(entityCode, doc.id, xferTo.trim(), currentUserId, xferReason.trim());
      toast.success('Ownership transferred');
      setXferOpen(false); setXferTo(''); setXferReason('');
    });
  };

  const folderName = (id?: string | null): string =>
    (id && folders.find((f) => f.id === id)?.name) ?? '—';

  // ── Sharing handlers ────────────────────────────────────────────────────
  const onShareSubmit = (): void => {
    if (shareMode === 'internal' && !shareGrantee.trim()) {
      toast.error('Internal grantee user-id required'); return;
    }
    if (shareMode === 'external' && !shareEmail.trim()) {
      toast.error('External email required'); return;
    }
    safe(() => {
      grantShare(entityCode, {
        document_id: doc.id,
        grantee_user_id: shareMode === 'internal' ? shareGrantee.trim() : null,
        external_email: shareMode === 'external' ? shareEmail.trim() : null,
        permission: sharePerm,
        expires_at: shareExpires ? new Date(shareExpires).toISOString() : null,
        created_by: currentUserId,
      });
      toast.success('Share granted');
      setShareOpen(false); setShareGrantee(''); setShareEmail(''); setShareExpires('');
    });
  };
  const onApproveShare = (id: string): void => safe(() => {
    approveExternalShare(entityCode, id, currentUserId); toast.success('Approved');
  });
  const onRevokeShare = (id: string): void => safe(() => {
    revokeShare(entityCode, id, currentUserId); toast.success('Revoked');
  });
  const effectivePreview = previewUser.trim()
    ? getEffectivePermission(entityCode, doc.id, previewUser.trim(), previewUser.trim())
    : null;

  // ── Links handlers ──────────────────────────────────────────────────────
  const onLinkSubmit = (): void => {
    if (!linkRefId.trim() || !linkLabel.trim()) {
      toast.error('Ref id and label required'); return;
    }
    safe(() => {
      linkDocument(entityCode, doc.id, {
        ref_type: linkType, ref_id: linkRefId.trim(),
        ref_label: linkLabel.trim(), created_by: currentUserId,
      });
      toast.success('Linked');
      setLinkOpen(false); setLinkRefId(''); setLinkLabel('');
    });
  };
  const onUnlink = (linkId: string): void => safe(() => {
    unlinkDocument(entityCode, linkId); toast.success('Unlinked');
  });

  // ── FY + review handlers ────────────────────────────────────────────────
  const onSetFY = (): void => {
    if (!FY_RE.test(fyValue)) { toast.error('FY format: FYYYYY-YY (e.g. FY2026-27)'); return; }
    safe(() => {
      setFinancialYear(entityCode, doc.id, fyValue, currentUserId);
      toast.success(`FY → ${fyValue}`);
    });
  };
  const onMarkReviewed = (): void => safe(() => {
    markReviewed(entityCode, doc.id, currentUserId);
    toast.success('Marked reviewed · next review scheduled');
  });


  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass-card rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Document Control
            <Badge variant="outline" className="font-mono">{ctrl.document_code ?? 'no code'}</Badge>
            <Badge variant="secondary">{ctrl.lifecycle_status}</Badge>
          </DialogTitle>
          <DialogDescription className="truncate">{doc.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identity / Numbering */}
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-sm">Identity & numbering</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={ctrl.category ?? ''} onValueChange={onCategory}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Document code</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline" className="w-full justify-start font-mono"
                            disabled={hasCode || !ctrl.category}
                            onClick={onAssignCode}
                          >
                            <Hash className="h-4 w-4 mr-2" />
                            {hasCode ? ctrl.document_code : (codePreview ?? 'set category first')}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {hasCode && (
                        <TooltipContent>Code already assigned · cannot be reassigned.</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lifecycle */}
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-sm">Lifecycle</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2" data-testid="lifecycle-options">
                {ALL_LIFECYCLE.map((s) => {
                  const isCurrent = s === ctrl.lifecycle_status;
                  const isLegal = legalNexts.includes(s);
                  return (
                    <Button
                      key={s} size="sm"
                      variant={isCurrent ? 'secondary' : 'outline'}
                      disabled={isCurrent || !isLegal}
                      onClick={() => onLifecycle(s)}
                    >
                      {s}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Confidentiality */}
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-sm">Confidentiality</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select value={ctrl.confidentiality ?? 'internal'} onValueChange={onConfidentiality}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONF_LEVELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground self-center">
                  Folder: <span className="font-mono">{folderName(ctrl.folder_id)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-sm">Effective / review / expiry</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Effective</Label>
                <Input type="date" defaultValue={ctrl.effective_date?.slice(0, 10) ?? ''}
                  onBlur={(e) => onDates({ effective_date: e.target.value || null })}
                  className="rounded-lg font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Review</Label>
                <Input type="date" defaultValue={ctrl.review_date?.slice(0, 10) ?? ''}
                  onBlur={(e) => onDates({ review_date: e.target.value || null })}
                  className="rounded-lg font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Expiry</Label>
                <Input type="date" defaultValue={ctrl.expiry_date?.slice(0, 10) ?? ''}
                  onBlur={(e) => onDates({ expiry_date: e.target.value || null })}
                  className="rounded-lg font-mono" />
              </div>
            </CardContent>
          </Card>

          {/* Lock + Ownership */}
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-sm">Lock & ownership</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              {ctrl.locked_by ? (
                <Button variant="outline" onClick={onUnlock}>
                  <Unlock className="h-4 w-4 mr-2" />Unlock
                </Button>
              ) : (
                <Button variant="outline" onClick={onLock}>
                  <Lock className="h-4 w-4 mr-2" />Lock
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {ctrl.locked_by ? `Locked by ${ctrl.locked_by}` : 'Unlocked'}
              </span>
              <div className="flex-1" />
              <span className="text-xs text-muted-foreground">
                Owner: <span className="font-mono">{ctrl.owner_id}</span>
              </span>
              <Button variant="outline" onClick={() => setXferOpen(true)}>
                <UserCog className="h-4 w-4 mr-2" />Transfer ownership
              </Button>
            </CardContent>
          </Card>

          {/* Sharing */}
          <Card className="rounded-2xl" data-testid="sharing-section">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Share2 className="h-4 w-4" />Sharing · {shares.length}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>Grant share</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {shares.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">No shares yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {shares.map((s: DocumentShare) => (
                    <li key={s.id} className="py-2 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-mono">{s.permission}</Badge>
                      <span className="flex-1 truncate font-mono">
                        {s.grantee_user_id ?? s.external_email}
                      </span>
                      {s.revoked_at && <Badge variant="destructive">revoked</Badge>}
                      {!s.revoked_at && s.requires_approval && (
                        <Button size="sm" variant="ghost" onClick={() => onApproveShare(s.id)}>Approve</Button>
                      )}
                      {!s.revoked_at && !s.requires_approval && (
                        <Button size="sm" variant="ghost" className="text-destructive"
                          onClick={() => onRevokeShare(s.id)}>Revoke</Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-border pt-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Effective permission preview</Label>
                <div className="flex gap-2">
                  <Input value={previewUser} onChange={(e) => setPreviewUser(e.target.value)}
                    placeholder="user-id to preview…" className="rounded-lg font-mono" />
                  <Badge variant="secondary" className="font-mono whitespace-nowrap self-center">
                    {effectivePreview?.permission ?? '—'}
                  </Badge>
                </div>
                {effectivePreview?.watermark && (
                  <p className="text-[10px] font-mono text-muted-foreground">
                    watermark: {effectivePreview.watermark}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* B.7 Links */}
          <Card className="rounded-2xl" data-testid="links-section">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="h-4 w-4" />Links · {links.length}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>Add link</Button>
            </CardHeader>
            <CardContent>
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">No links yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {links.map((l) => (
                    <li key={l.id} className="py-2 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-mono">{l.ref_type}</Badge>
                      <span className="flex-1 truncate">{l.ref_label}</span>
                      <span className="font-mono text-muted-foreground">{l.ref_id}</span>
                      <Button size="sm" variant="ghost" className="text-destructive"
                        onClick={() => onUnlink(l.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* FY + Mark reviewed */}
          <Card className="rounded-2xl" data-testid="fy-review-section">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />Financial year & review
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">FY (current: {ctrl.financial_year ?? '—'})</Label>
                <div className="flex gap-2">
                  <Input value={fyValue} onChange={(e) => setFyValue(e.target.value)}
                    placeholder="FY2026-27" className="rounded-lg font-mono" />
                  <Button variant="outline" onClick={onSetFY}>Set</Button>
                </div>
              </div>
              <div className="space-y-1 self-end">
                <Button variant="outline" className="w-full" onClick={onMarkReviewed}>
                  <CalendarCheck className="h-4 w-4 mr-2" />Mark reviewed
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit timeline */}

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />Control audit · {audit.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No control events yet.</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {audit.map((e) => (
                    <li key={e.id} className="text-xs border border-border rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{e.action}</Badge>
                        <span className="font-mono text-muted-foreground">
                          {new Date(e.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-1">by {e.user_id}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>

        {/* Transfer dialog */}
        <Dialog open={xferOpen} onOpenChange={setXferOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Transfer ownership</DialogTitle>
              <DialogDescription>Reason is mandatory and is recorded in the audit trail.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>New owner (user-id)</Label>
                <Input value={xferTo} onChange={(e) => setXferTo(e.target.value)} className="rounded-lg font-mono" />
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Textarea value={xferReason} onChange={(e) => setXferReason(e.target.value)} className="rounded-lg" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setXferOpen(false)}>Cancel</Button>
              <Button onClick={onTransferSubmit}>Transfer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share dialog */}
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Grant share</DialogTitle>
              <DialogDescription>External grants require approval before they become effective.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['internal', 'external'] as const).map((m) => (
                  <Button key={m} variant={shareMode === m ? 'secondary' : 'outline'} size="sm"
                    onClick={() => setShareMode(m)}>{m}</Button>
                ))}
              </div>
              {shareMode === 'internal' ? (
                <div className="space-y-1">
                  <Label>Grantee user-id</Label>
                  <Input value={shareGrantee} onChange={(e) => setShareGrantee(e.target.value)}
                    className="rounded-lg font-mono" />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>External email</Label>
                  <Input type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)}
                    className="rounded-lg font-mono" />
                </div>
              )}
              <div className="space-y-1">
                <Label>Permission</Label>
                <Select value={sharePerm} onValueChange={(v) => setSharePerm(v as SharePermission)}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERMISSIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Expires (optional)</Label>
                <Input type="date" value={shareExpires} onChange={(e) => setShareExpires(e.target.value)}
                  className="rounded-lg font-mono" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
              <Button onClick={onShareSubmit}>Grant</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Link dialog */}
        <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add link</DialogTitle>
              <DialogDescription>Bind this document to a task, conversation, obligation, employee, or voucher.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Ref type</Label>
                <Select value={linkType} onValueChange={(v) => setLinkType(v as DocumentLinkRef['ref_type'])}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LINK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ref id</Label>
                <Input value={linkRefId} onChange={(e) => setLinkRefId(e.target.value)}
                  className="rounded-lg font-mono" />
              </div>
              <div className="space-y-1">
                <Label>Label</Label>
                <Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)}
                  className="rounded-lg" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
              <Button onClick={onLinkSubmit}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
