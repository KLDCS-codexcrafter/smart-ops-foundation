/**
 * @file        IntercompanyTransactionsHubPage.tsx
 * @purpose     Standalone Page #35 — IC Transactions Hub. Create + list IC
 *              transactions across the 4 S106 types. Reads the engine; shows
 *              status, arm's-length price, TP audit badge, reciprocal voucher
 *              refs.
 * @reads       intercompany-transaction-engine · intercompany-group-structure-engine
 * @writes      via createICTransaction + postICTransaction (engine USE-SITE)
 * @sprint      T-Phase-6.C.1.2 · Sprint 106 · Block 5 · Arc 2 · IC Pt 1
 * @scope-wall  DP-A2-9 · NO matching · NO eliminations · NO consolidation.
 */
import { useMemo, useState } from 'react';
import { ArrowLeftRight, Plus, Send, ShieldCheck, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  createICTransaction,
  postICTransaction,
  listICTransactions,
  IC_TRANSACTION_TYPES,
  PRICED_IC_TYPES,
  type ICTransactionType,
  type IntercompanyTransaction,
} from '@/lib/intercompany-transaction-engine';
import { listGroupStructure } from '@/lib/intercompany-group-structure-engine';
import { loadEntities } from '@/data/mock-entities';

interface DraftState {
  txn_type: ICTransactionType;
  from_entity: string;
  to_entity: string;
  item_key: string;
  quantity: number;
  amount: number;
  txn_date: string;
  note: string;
}

const fmtINR = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function statusVariant(s: IntercompanyTransaction['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (s === 'posted' || s === 'settled') return 'default';
  if (s === 'priced') return 'secondary';
  return 'outline';
}

export default function IntercompanyTransactionsHubPage() {
  const [tick, setTick] = useState(0);
  const entities = useMemo(() => loadEntities(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is intentional refresh trigger
  const groupNodes = useMemo(() => listGroupStructure(), [tick]);
  const groupIds = new Set(groupNodes.map((n) => n.entity_id));

  const eligible = entities.filter((e) => groupIds.has(e.id));

  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<DraftState>({
    txn_type: 'stock_transfer',
    from_entity: eligible[0]?.id ?? '',
    to_entity: eligible[1]?.id ?? '',
    item_key: 'ITEM-001',
    quantity: 1,
    amount: 0,
    txn_date: today,
    note: '',
  });

  const txns = useMemo(() => listICTransactions().sort(
    (a, b) => b.created_at.localeCompare(a.created_at),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is intentional refresh trigger
  ), [tick]);

  const onChange = <K extends keyof DraftState>(k: K, v: DraftState[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const create = () => {
    try {
      createICTransaction({
        txn_type: draft.txn_type,
        from_entity: draft.from_entity,
        to_entity: draft.to_entity,
        item_key: PRICED_IC_TYPES.includes(draft.txn_type) ? draft.item_key : undefined,
        quantity: PRICED_IC_TYPES.includes(draft.txn_type) ? Number(draft.quantity) : undefined,
        amount: Number(draft.amount) || 0,
        txn_date: draft.txn_date,
        note: draft.note,
      });
      toast.success('IC transaction created (draft)');
      setTick((t) => t + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const post = (id: string) => {
    try {
      postICTransaction(id);
      toast.success('IC transaction posted · TP audit + reciprocal vouchers booked');
      setTick((t) => t + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const counts = txns.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Intercompany Transactions Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Orchestrates resolvePrice → generateTPAudit → postVoucher across two
            entities. Structure-validated · audit-trailed. (Arc 2 scope wall · no
            matching / eliminations / consolidation.)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono">{txns.length} total</Badge>
          <Badge variant="outline" className="text-[10px] font-mono">{counts.draft ?? 0} draft</Badge>
          <Badge variant="secondary" className="text-[10px] font-mono">{counts.priced ?? 0} priced</Badge>
          <Badge variant="default" className="text-[10px] font-mono">{counts.posted ?? 0} posted</Badge>
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> New IC transaction
          </h2>
          {eligible.length < 2 && (
            <p className="text-xs text-destructive">
              At least 2 entities must be registered in Group Structure first
              (Command Center → Intercompany Group Structure).
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Type</Label>
              <Select value={draft.txn_type} onValueChange={(v) => onChange('txn_type', v as ICTransactionType)}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IC_TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">From entity</Label>
              <Select value={draft.from_entity} onValueChange={(v) => onChange('from_entity', v)}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {eligible.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.shortCode} · {e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">To entity</Label>
              <Select value={draft.to_entity} onValueChange={(v) => onChange('to_entity', v)}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {eligible.filter((e) => e.id !== draft.from_entity).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.shortCode} · {e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Date</Label>
              <Input className="rounded-lg font-mono" type="date"
                value={draft.txn_date}
                onChange={(e) => onChange('txn_date', e.target.value)} />
            </div>
            {PRICED_IC_TYPES.includes(draft.txn_type) && (
              <>
                <div className="space-y-1">
                  <Label className="text-[11px]">Item key</Label>
                  <Input className="rounded-lg font-mono"
                    value={draft.item_key}
                    onChange={(e) => onChange('item_key', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Quantity</Label>
                  <Input className="rounded-lg font-mono" type="number" min={0} step={1}
                    value={draft.quantity}
                    onChange={(e) => onChange('quantity', Number(e.target.value))} />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label className="text-[11px]">
                Amount {PRICED_IC_TYPES.includes(draft.txn_type) ? '(fallback when no rule)' : '(principal)'}
              </Label>
              <Input className="rounded-lg font-mono" type="number" min={0} step={0.01}
                value={draft.amount}
                onChange={(e) => onChange('amount', Number(e.target.value))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-[11px]">Note</Label>
              <Input className="rounded-lg"
                value={draft.note}
                onChange={(e) => onChange('note', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={create} disabled={eligible.length < 2}>
              <Plus className="h-3 w-3 mr-1" /> Create draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">IC ID</TableHead>
                <TableHead className="text-[11px]">Type</TableHead>
                <TableHead className="text-[11px]">From → To</TableHead>
                <TableHead className="text-[11px] text-right">Amount</TableHead>
                <TableHead className="text-[11px]">TP audit</TableHead>
                <TableHead className="text-[11px]">Vouchers</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
                <TableHead className="text-[11px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground text-[11px] py-6">
                    No IC transactions yet. Create one above.
                  </TableCell>
                </TableRow>
              )}
              {txns.map((t) => (
                <TableRow key={t.ic_txn_id}>
                  <TableCell className="text-[11px] font-mono">{t.ic_txn_id}</TableCell>
                  <TableCell className="text-[11px]">{t.txn_type}</TableCell>
                  <TableCell className="text-[11px] font-mono">{t.from_entity} → {t.to_entity}</TableCell>
                  <TableCell className="text-[11px] font-mono text-right">{fmtINR(t.amount)}</TableCell>
                  <TableCell className="text-[11px]">
                    {t.tp_audit_id ? (
                      <Badge variant="default" className="text-[10px]">
                        <ShieldCheck className="h-3 w-3 mr-1" /> §92
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[11px] font-mono">
                    {t.from_voucher_no || t.to_voucher_no ? (
                      <span className="inline-flex items-center gap-1">
                        <Receipt className="h-3 w-3" />
                        {t.from_voucher_no ?? '—'} / {t.to_voucher_no ?? '—'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(t.status)} className="text-[10px]">{t.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {t.status === 'draft' || t.status === 'priced' ? (
                      <Button size="sm" variant="outline" onClick={() => post(t.ic_txn_id)}>
                        <Send className="h-3 w-3 mr-1" /> Post
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground">
        Scope wall (DP-A2-9): transactions + reciprocal postings only · no
        matching · no eliminations · no consolidation — those land in S108 / Arc 3.
      </p>
    </div>
  );
}
