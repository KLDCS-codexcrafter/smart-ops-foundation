/**
 * @file     VoucherDiffViewer.tsx — Before/after side-by-side for audited records
 * @sprint   T-Phase-1.2.6d-hdr · OOB-11 · Auditor delight feature
 * @purpose  Renders the audit-trail history for a record. Each entry shows
 *           actor + timestamp + action + a diff table of changed fields
 *           (before red → after green). Reads via `readAuditTrail()`
 *           filtered by record_id.
 *
 *  Used in detail panels: header card has "View Audit History" button which
 *  opens this component in a Dialog. Gracefully handles missing snapshots.
 */

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { readAuditTrail } from '@/lib/audit-trail-engine';
import type { AuditTrailEntry, AuditEntityType } from '@/types/audit-trail';

interface Props {
  open: boolean;
  onClose: () => void;
  recordId: string;
  /** Audit entityType to filter by (e.g. 'grn', 'invoice_memo'). */
  entityType: AuditEntityType;
  entityCode: string;
  currentRecord: Record<string, unknown>;
}

interface FieldDiff {
  field: string;
  before: unknown;
  after: unknown;
}

function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): FieldDiff[] {
  if (!before || !after) return [];
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  const out: FieldDiff[] = [];
  keys.forEach(k => {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      out.push({ field: k, before: before[k], after: after[k] });
    }
  });
  return out;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function VoucherDiffViewer({
  open, onClose, recordId, entityType, entityCode, currentRecord,
}: Props) {
  const trail = useMemo<AuditTrailEntry[]>(() => {
    try {
      return readAuditTrail(entityCode, { entityType, recordId });
    } catch {
      return [];
    }
  }, [entityCode, entityType, recordId]);

  const hash = String(currentRecord.voucher_hash ?? '—');

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Audit History</DialogTitle>
          <DialogDescription className="space-x-2">
            <span>{trail.length} change{trail.length === 1 ? '' : 's'} recorded</span>
            <span className="text-muted-foreground">·</span>
            <span>Hash: <code className="font-mono text-xs">{hash}</code></span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-2">
          {trail.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No audit history found for this record.
            </p>
          ) : (
            <div className="space-y-3">
              {trail.map((entry) => {
                const diffs = diffFields(entry.before_state, entry.after_state);
                return (
                  <Card key={entry.id}>
                    <CardContent className="p-3 text-sm space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{entry.action}</Badge>
                          <span className="font-medium">{entry.user_name || entry.user_id || 'system'}</span>
                          <span className="text-xs text-muted-foreground font-mono">{entry.timestamp}</span>
                        </div>
                        {entry.reason && (
                          <span className="text-xs text-muted-foreground italic">
                            Reason: {entry.reason}
                          </span>
                        )}
                      </div>
                      {entry.action === 'update' && diffs.length > 0 && (
                        <div className="border-t pt-2 grid grid-cols-3 gap-2 text-xs">
                          <div className="font-medium">Field</div>
                          <div className="font-medium text-muted-foreground">Before</div>
                          <div className="font-medium">After</div>
                          {diffs.map(d => (
                            <div key={d.field} className="contents">
                              <div className="font-mono">{d.field}</div>
                              <div className="font-mono text-destructive">{formatValue(d.before)}</div>
                              <div className="font-mono text-success">{formatValue(d.after)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {entry.action === 'update' && diffs.length === 0 && (
                        <div className="border-t pt-2 text-xs text-muted-foreground italic">
                          No field-level differences captured for this entry.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
