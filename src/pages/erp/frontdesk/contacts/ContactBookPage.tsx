/**
 * @file        src/pages/erp/frontdesk/contacts/ContactBookPage.tsx
 * @sprint      Sprint 145 + S146 hotfix + S148.T1 hotfix (envelope + label views)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listContactBook, addContactNote, deleteContactNote,
  buildEnrichedEnvelope, computeLabelGrid, loadLabelPrefs, saveLabelPrefs,
  getContactsForParty,
} from '@/lib/frontdesk-engine';
import type { LabelPrefs, PartyContact } from '@/types/frontdesk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Mail, Tag } from 'lucide-react';
import { toast } from 'sonner';

type Row = ReturnType<typeof listContactBook>[number];

export function ContactBookPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const me = useCurrentUser();
  const [q, setQ] = useState('');
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const compute = useCallback((): Row[] => {
    const all = listContactBook(entityCode);
    const needle = q.trim().toLowerCase();
    return needle
      ? all.filter((r) => r.partyName.toLowerCase().includes(needle) || r.partyCode.toLowerCase().includes(needle))
      : all;
  }, [entityCode, q]);
  const [rows, setRows] = useState<Row[]>(() => compute());
  const reload = useCallback(() => setRows(compute()), [compute]);
  useEffect(() => { reload(); }, [reload]);

  function submitNote(partyId: string): void {
    try {
      addContactNote(entityCode, partyId, noteText, me?.id ?? 'demo-user');
      toast.success('Note added');
      setNoteText(''); setOpenFor(null); reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader><CardTitle>Contact Book</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search party name / code"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No parties found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.partyId}>
                    <TableCell className="font-mono">{r.partyCode}</TableCell>
                    <TableCell>{r.partyName}</TableCell>
                    <TableCell><Badge variant="outline">{r.partyType}</Badge></TableCell>
                    <TableCell>{r.group ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.gstin ?? '—'}</TableCell>
                    <TableCell>
                      {r.notes.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="space-y-1">
                          {r.notes.slice(0, 2).map((n) => (
                            <div key={n.id} className="flex items-start justify-between gap-2 text-xs">
                              <span className="truncate max-w-[240px]">{n.note}</span>
                              <button
                                aria-label="Delete note"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => { deleteContactNote(entityCode, n.id); reload(); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {r.notes.length > 2 && (
                            <p className="text-[10px] text-muted-foreground">+{r.notes.length - 2} more</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={openFor === r.partyId} onOpenChange={(o) => setOpenFor(o ? r.partyId : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Note</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Add note · {r.partyName}</DialogTitle></DialogHeader>
                          <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} />
                          <Button onClick={() => submitNote(r.partyId)} disabled={!noteText.trim()}>Save note</Button>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
