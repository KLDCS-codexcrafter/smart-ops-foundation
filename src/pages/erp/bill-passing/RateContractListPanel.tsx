/**
 * RateContractListPanel.tsx — Sprint T-Phase-1.2.6f-c-3 · Blocks E-G · D-293
 * Vendor-locked rate contracts · view/list panel.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { FileSignature, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listRateContracts, createRateContract, type CreateRateContractInput,
} from '@/lib/rate-contract-engine';
import type { RateContract, RateContractStatus } from '@/types/rate-contract';

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmt(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function statusVariant(s: RateContractStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'active': return 'default';
    case 'draft': return 'secondary';
    case 'expired': case 'cancelled': return 'destructive';
    default: return 'outline';
  }
}

const TODAY = (): string => new Date().toISOString().slice(0, 10);
const PLUS_YEAR = (): string =>
  new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

interface ContractFormState {
  vendor_name: string;
  valid_from: string;
  valid_to: string;
  payment_terms: string;
  delivery_terms: string;
  item_name: string;
  agreed_rate: number;
  ceiling_rate: number;
  min_qty: number;
  max_qty: number;
  tax_pct: number;
}
const blankForm = (): ContractFormState => ({
  vendor_name: '', valid_from: TODAY(), valid_to: PLUS_YEAR(),
  payment_terms: 'NET30', delivery_terms: 'FOR Destination',
  item_name: '', agreed_rate: 0, ceiling_rate: 0,
  min_qty: 1, max_qty: 1000, tax_pct: 18,
});

export function RateContractListPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const all = useMemo(() => listRateContracts(entityCode), [entityCode, tick]);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<RateContract | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ContractFormState>(blankForm);

  const handleCreate = (): void => {
    if (!form.vendor_name.trim() || !form.item_name.trim()) {
      toast.error('Vendor and item are required');
      return;
    }
    if (form.agreed_rate <= 0 || form.ceiling_rate < form.agreed_rate) {
      toast.error('Agreed rate must be > 0 and ceiling >= agreed');
      return;
    }
    try {
      const input: CreateRateContractInput = {
        entity_id: entityCode,
        entity_code: entityCode,
        vendor_id: `vendor-${Date.now()}`,
        vendor_name: form.vendor_name,
        valid_from: form.valid_from,
        valid_to: form.valid_to,
        payment_terms: form.payment_terms,
        delivery_terms: form.delivery_terms,
        lines: [{
          item_id: `item-${Date.now()}`,
          item_name: form.item_name,
          hsn_sac: '', uom: 'NOS',
          agreed_rate: form.agreed_rate,
          ceiling_rate: form.ceiling_rate,
          min_qty: form.min_qty, max_qty: form.max_qty,
          tax_pct: form.tax_pct, notes: '',
        }],
        notes: '',
        created_by: 'mock-user',
      };
      createRateContract(input);
      toast.success('Rate contract created');
      setCreateOpen(false);
      setForm(blankForm());
      setTick((t) => t + 1);
    } catch (e) {
      toast.error(`Create failed: ${(e as Error).message}`);
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (r) =>
        r.contract_no.toLowerCase().includes(term) ||
        r.vendor_name.toLowerCase().includes(term),
    );
  }, [all, q]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Rate Contracts</h1>
        <p className="text-sm text-muted-foreground">
          Vendor-locked rate agreements · feed PO auto-fill (D-293).
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by contract no or vendor…"
          className="max-w-sm"
        />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Contract
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <FileSignature className="h-10 w-10 mx-auto mb-2 opacity-50" />
              No rate contracts.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                    <TableCell className="font-mono">{r.contract_no}</TableCell>
                    <TableCell>{r.vendor_name}</TableCell>
                    <TableCell className="text-xs">
                      {fmt(r.valid_from)} → {fmt(r.valid_to)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{r.lines.length}</TableCell>
                    <TableCell className="text-right font-mono">{inr(r.total_value)}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.contract_no} · {detail?.vendor_name}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Validity:</span>{' '}
                  {fmt(detail.valid_from)} → {fmt(detail.valid_to)}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>{' '}
                  <span className="font-mono">{inr(detail.total_value)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pay Terms:</span>{' '}
                  {detail.payment_terms || '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Delivery:</span>{' '}
                  {detail.delivery_terms || '—'}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead className="text-right">Agreed</TableHead>
                    <TableHead className="text-right">Ceiling</TableHead>
                    <TableHead className="text-right">Qty Range</TableHead>
                    <TableHead className="text-right">Tax %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.item_name}</TableCell>
                      <TableCell className="font-mono text-xs">{l.hsn_sac}</TableCell>
                      <TableCell>{l.uom}</TableCell>
                      <TableCell className="text-right font-mono">{inr(l.agreed_rate)}</TableCell>
                      <TableCell className="text-right font-mono">{inr(l.ceiling_rate)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {l.min_qty} – {l.max_qty}
                      </TableCell>
                      <TableCell className="text-right font-mono">{l.tax_pct}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {detail.notes && (
                <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {detail.notes}
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
