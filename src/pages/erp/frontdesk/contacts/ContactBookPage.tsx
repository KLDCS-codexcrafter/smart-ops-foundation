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

  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleSelect(id: string): void {
    setSelectedIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contact Book</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={selectedIds.length === 0}
              onClick={() => setEnvelopeOpen(true)}>
              <Mail className="h-3 w-3 mr-1" /> Envelopes ({selectedIds.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLabelOpen(true)}>
              <Tag className="h-3 w-3 mr-1" /> Label sheet
            </Button>
          </div>
        </CardHeader>
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
                  <TableHead className="w-8"></TableHead>
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
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.includes(r.partyId)}
                        onChange={() => toggleSelect(r.partyId)} aria-label={`Select ${r.partyName}`} />
                    </TableCell>
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

      <EnvelopeDialog
        open={envelopeOpen} onClose={() => setEnvelopeOpen(false)}
        entityCode={entityCode} partyIds={selectedIds}
      />
      <LabelDialog
        open={labelOpen} onClose={() => setLabelOpen(false)}
        entityCode={entityCode}
      />
    </div>
  );
}

// ─── Envelope view (S148.T1 · M/S. prefix + Kind Attn picker + From-address toggle) ──
interface EnvelopeDialogProps {
  open: boolean; onClose: () => void; entityCode: string; partyIds: string[];
}
function EnvelopeDialog({ open, onClose, entityCode, partyIds }: EnvelopeDialogProps): JSX.Element {
  const [msPrefix, setMsPrefix] = useState(true);
  const [includeFrom, setIncludeFrom] = useState(false);
  const [fromBlock, setFromBlock] = useState('4DSmartOps Pvt Ltd\nMumbai · 400001');
  const [picks, setPicks] = useState<Record<string, string>>({});

  const partyContacts = useMemo(() => {
    const map: Record<string, PartyContact[]> = {};
    for (const pid of partyIds) map[pid] = getContactsForParty(entityCode, pid);
    return map;
  }, [entityCode, partyIds, open]);

  const envelopes = useMemo(() => buildEnrichedEnvelope(entityCode, partyIds, {
    msPrefix, kindAttnContactByParty: picks,
    includeFromAddress: includeFrom, fromAddressBlock: fromBlock,
  }), [entityCode, partyIds, msPrefix, picks, includeFrom, fromBlock]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Envelope preview · {partyIds.length} parties</DialogTitle></DialogHeader>
        <div className="space-y-3 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={msPrefix} onCheckedChange={setMsPrefix} id="ms" />
              <Label htmlFor="ms">"M/S. " prefix</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={includeFrom} onCheckedChange={setIncludeFrom} id="fr" />
              <Label htmlFor="fr">Include from-address</Label>
            </div>
          </div>
          {includeFrom && (
            <Textarea value={fromBlock} onChange={(e) => setFromBlock(e.target.value)} rows={2} />
          )}
        </div>
        <div className="space-y-3 max-h-[50vh] overflow-auto">
          {envelopes.map((env) => {
            const contacts = partyContacts[env.partyId] ?? [];
            return (
              <div key={env.partyId} className="border rounded-md p-3 space-y-2">
                {contacts.length > 0 && (
                  <div className="flex items-center gap-2 print:hidden">
                    <Label className="text-xs">Kind Attn:</Label>
                    <Select value={picks[env.partyId] ?? ''}
                      onValueChange={(v) => setPicks({ ...picks, [env.partyId]: v })}>
                      <SelectTrigger className="h-7 text-xs w-60"><SelectValue placeholder="(auto: primary)" /></SelectTrigger>
                      <SelectContent>
                        {contacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{c.designation ? ` · ${c.designation}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <pre className="text-sm whitespace-pre-wrap font-sans">{env.toBlock}</pre>
                {env.fromBlock && (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans border-t pt-2">
                    From: {env.fromBlock}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Label view (S148.T1 · width × height cm + computed A4 grid) ──
interface LabelDialogProps { open: boolean; onClose: () => void; entityCode: string }
function LabelDialog({ open, onClose, entityCode }: LabelDialogProps): JSX.Element {
  const [prefs, setPrefs] = useState<LabelPrefs>(() => loadLabelPrefs(entityCode));

  useEffect(() => { if (open) setPrefs(loadLabelPrefs(entityCode)); }, [open, entityCode]);

  function save(): void {
    try { saveLabelPrefs(entityCode, prefs); toast.success('Label prefs saved'); onClose(); }
    catch (e) { toast.error((e as Error).message); }
  }

  let grid: { cols: number; rows: number; perPage: number } | null = null;
  let err: string | null = null;
  try { grid = computeLabelGrid(prefs); } catch (e) { err = (e as Error).message; }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Label sheet · A4 grid</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Width (cm)</Label>
              <Input type="number" step="0.1" value={prefs.widthCm}
                onChange={(e) => setPrefs({ ...prefs, widthCm: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Height (cm)</Label>
              <Input type="number" step="0.1" value={prefs.heightCm}
                onChange={(e) => setPrefs({ ...prefs, heightCm: Number(e.target.value) })} />
            </div>
          </div>
          {err ? (
            <div className="text-sm text-destructive">{err}</div>
          ) : grid && (
            <div className="rounded-md border p-3 bg-muted/40 text-sm">
              <p>A4 sheet: <span className="font-mono">21.0 × 29.7 cm</span></p>
              <p>Grid: <span className="font-mono">{grid.cols} cols × {grid.rows} rows</span></p>
              <p>Labels per page: <span className="font-mono font-bold">{grid.perPage}</span></p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!!err}>Save prefs</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
