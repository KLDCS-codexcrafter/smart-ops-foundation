/**
 * BulkPasteDialog · Sprint T-Phase-2.7-d-2 · Q3-c selective commit · Q3-d auto-detect
 *
 * Modal preview of pasted TSV/CSV/JSON with per-row checkboxes.
 * Unmatched rows red and unchecked by default · matched rows checked by default.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  parseBulkPaste,
  type PasteParseResult,
  type PasteRow,
} from '@/lib/bulk-paste-engine';

interface Props {
  open: boolean;
  onClose: () => void;
  entityCode: string;
  initialPaste?: string;
  onCommit: (rows: PasteRow[]) => void;
}

export function BulkPasteDialog({ open, onClose, entityCode, initialPaste, onCommit }: Props) {
  const [raw, setRaw] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setRaw(initialPaste ?? '');
      setSelected(new Set());
    }
  }, [open, initialPaste]);

  const parsed: PasteParseResult = useMemo(
    () => raw.trim() ? parseBulkPaste(raw, entityCode) : { format: 'unknown', totalLines: 0, rows: [], matchedCount: 0, unmatchedCount: 0, errors: [] },
    [raw, entityCode],
  );

  // Default selection: matched rows checked
  useEffect(() => {
    const next = new Set<number>();
    parsed.rows.forEach((r, i) => { if (r.matched) next.add(i); });
    setSelected(next);
  }, [parsed.rows]);

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function selectAllMatched() {
    const next = new Set<number>();
    parsed.rows.forEach((r, i) => { if (r.matched) next.add(i); });
    setSelected(next);
  }

  function commit() {
    const rows = parsed.rows.filter((_, i) => selected.has(i));
    onCommit(rows);
    onClose();
  }

  const formatLabel: Record<string, string> = { tsv: 'TSV detected', csv: 'CSV detected', json: 'JSON detected', unknown: 'No format detected' };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Bulk Paste Items
            <Badge variant="secondary" className="font-mono">{formatLabel[parsed.format]}</Badge>
          </DialogTitle>
          <DialogDescription>
            Paste tab-separated, comma-separated, or JSON line-item data. Unmatched items are unchecked by default.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste TSV/CSV/JSON here..."
            className="min-h-24 font-mono text-xs"
          />

          {parsed.errors.length > 0 && (
            <div className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {parsed.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          {parsed.rows.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-success font-mono">{parsed.matchedCount} matched</span>
                <span className="text-destructive font-mono">{parsed.unmatchedCount} unmatched</span>
                <span className="font-mono text-muted-foreground">{selected.size} selected</span>
                <Button size="sm" variant="ghost" onClick={selectAllMatched}>Select all matched</Button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur-xl">
                    <tr>
                      <th className="w-10 p-2"></th>
                      <th className="w-10 p-2 text-left">#</th>
                      <th className="p-2 text-left">Item</th>
                      <th className="w-20 p-2 text-right font-mono">Qty</th>
                      <th className="w-24 p-2 text-right font-mono">Rate</th>
                      <th className="w-16 p-2 text-left">UOM</th>
                      <th className="w-16 p-2 text-center">Match</th>
                      <th className="p-2 text-left">Warnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((r, i) => (
                      <tr key={i} className={r.matched ? '' : 'bg-destructive/5'}>
                        <td className="p-2">
                          <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} />
                        </td>
                        <td className="p-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="p-2">{r.item_name || <span className="text-destructive">—</span>}</td>
                        <td className="p-2 text-right font-mono">{r.qty}</td>
                        <td className="p-2 text-right font-mono">{r.rate}</td>
                        <td className="p-2">{r.uom ?? ''}</td>
                        <td className="p-2 text-center">
                          {r.matched
                            ? <span className="text-success">✓</span>
                            : <span className="text-destructive">✗</span>}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {r.warnings.join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={commit} disabled={selected.size === 0}>
            Commit Selected ({selected.size} {selected.size === 1 ? 'item' : 'items'})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
