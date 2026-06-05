/**
 * @file        src/pages/erp/webstorex/commerce/LoyaltyPage.tsx
 * @sprint      Sprint 150 · T-WebStoreX-A11.2 · DP-WS-9 · APPEND-ONLY ledger
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  getLoyaltyRule, upsertLoyaltyRule, listPointEntries,
  getPointsBalance, reversePointEntry,
} from '@/lib/webstorex-commerce-engine';
import type { WsLoyaltyRule, WsPointsEntry } from '@/types/webstorex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';

export function LoyaltyPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [lookup, setLookup] = useState('');
  const [reverseFor, setReverseFor] = useState<WsPointsEntry | null>(null);
  const [reason, setReason] = useState('');

  const rule = useMemo<WsLoyaltyRule | null>(
    () => entityCode ? getLoyaltyRule(entityCode) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );
  const entries = useMemo<WsPointsEntry[]>(
    () => entityCode ? listPointEntries(entityCode, lookup || undefined) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, lookup, tick],
  );
  const balance = entityCode && lookup ? getPointsBalance(entityCode, lookup) : 0;

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const onSaveRule = (data: Omit<WsLoyaltyRule, 'entityId' | 'updatedAt'>): void => {
    try { upsertLoyaltyRule(entityCode, data); toast.success('Rule saved'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const onReverse = (): void => {
    if (!reverseFor) return;
    try {
      reversePointEntry(entityCode, reverseFor.id, reason);
      toast.success('Reversal entry posted');
      setReverseFor(null); setReason(''); reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <h1 className="text-xl font-semibold">Loyalty</h1>

      <RuleCard rule={rule} onSave={onSaveRule} />

      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1"><Label>Party ID</Label><Input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="P-101" /></div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="text-2xl font-bold font-mono">{balance} pts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No entries.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>At</TableHead><TableHead>Party</TableHead>
                  <TableHead>Kind</TableHead><TableHead>Points</TableHead>
                  <TableHead>Ref</TableHead><TableHead className="w-12">Rev</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.at.slice(0, 16).replace('T', ' ')}</TableCell>
                    <TableCell className="font-mono text-xs">{e.partyId}</TableCell>
                    <TableCell><Badge variant="outline">{e.kind}</Badge></TableCell>
                    <TableCell className="font-mono">{e.points}</TableCell>
                    <TableCell className="font-mono text-xs">{e.orderRef ?? '—'}</TableCell>
                    <TableCell>
                      {e.kind !== 'reversal' && (
                        <Button size="sm" variant="ghost" onClick={() => setReverseFor(e)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reverseFor} onOpenChange={(o) => !o && setReverseFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reverse entry</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Append-only ledger. Corrections require a reversal entry with reason.</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (mandatory)" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReverseFor(null)}>Cancel</Button>
            <Button onClick={onReverse}>Reverse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleCard(props: { rule: WsLoyaltyRule | null; onSave: (d: Omit<WsLoyaltyRule, 'entityId' | 'updatedAt'>) => void }): JSX.Element {
  const [earn, setEarn] = useState(String(props.rule?.earnPointsPerRupee ?? 0.01));
  const [minOrd, setMinOrd] = useState(String(props.rule?.minOrderValue ?? 0));
  const [redeem, setRedeem] = useState(String(props.rule?.redeemValuePerPoint ?? 1));
  const [exp, setExp] = useState(String(props.rule?.expiryMonths ?? 12));
  const [active, setActive] = useState(props.rule?.isActive ?? true);

  return (
    <Card className="glass-card">
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div><Label>Earn pts/₹</Label><Input type="number" step="0.01" value={earn} onChange={(e) => setEarn(e.target.value)} /></div>
        <div><Label>Min order ₹</Label><Input type="number" value={minOrd} onChange={(e) => setMinOrd(e.target.value)} /></div>
        <div><Label>₹ per point</Label><Input type="number" value={redeem} onChange={(e) => setRedeem(e.target.value)} /></div>
        <div><Label>Expiry (months)</Label><Input type="number" value={exp} onChange={(e) => setExp(e.target.value)} /></div>
        <Button onClick={() => props.onSave({
          earnPointsPerRupee: Number(earn), minOrderValue: Number(minOrd),
          redeemValuePerPoint: Number(redeem),
          expiryMonths: exp === '' ? null : Number(exp), isActive: active,
        })}>Save rule</Button>
        <label className="text-xs flex items-center gap-1 col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
      </CardContent>
    </Card>
  );
}
