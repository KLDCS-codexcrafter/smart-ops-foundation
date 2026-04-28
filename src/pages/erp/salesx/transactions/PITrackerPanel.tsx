/**
 * PITrackerPanel.tsx — Proforma Invoice Tracker · Sprint 1.1.1k-followup
 * [JWT] GET /api/salesx/quotations?stage=proforma
 *
 * Lists quotations in 'proforma' stage with status (active / converted-to-SO / expired)
 * and one-click access to PI print + Convert-to-SO actions.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Receipt, Printer, ArrowRight, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuotations } from '@/hooks/useQuotations';
import { useOrders } from '@/hooks/useOrders';
import { quotationToOrderInput } from '@/lib/quote-to-so-converter';
import type { Quotation } from '@/types/quotation';

interface Props { entityCode: string }

type StatusFilter = 'all' | 'active' | 'converted' | 'expired';

const todayISO = () => new Date().toISOString().split('T')[0];

export function PITrackerPanelComponent({ entityCode }: Props) {
  const navigate = useNavigate();
  const { quotations, markConvertedToSO } = useQuotations(entityCode);
  const { createOrder } = useOrders(entityCode);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const pis = useMemo(() =>
    quotations.filter(q => q.proforma_converted_at !== null),
  [quotations]);

  const today = todayISO();

  const enriched = useMemo(() => pis.map(q => {
    let derivedStatus: 'active' | 'converted' | 'expired';
    if (q.so_id) derivedStatus = 'converted';
    else if (q.valid_until_date && q.valid_until_date < today) derivedStatus = 'expired';
    else derivedStatus = 'active';
    return { ...q, derivedStatus };
  }), [pis, today]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (statusFilter !== 'all') list = list.filter(q => q.derivedStatus === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(q =>
        q.proforma_no?.toLowerCase().includes(s) ||
        q.quotation_no.toLowerCase().includes(s) ||
        q.customer_name?.toLowerCase().includes(s),
      );
    }
    return [...list].sort((a, b) =>
      (b.proforma_date ?? '').localeCompare(a.proforma_date ?? ''));
  }, [enriched, statusFilter, search]);

  const stats = useMemo(() => ({
    total:     enriched.length,
    active:    enriched.filter(q => q.derivedStatus === 'active').length,
    converted: enriched.filter(q => q.derivedStatus === 'converted').length,
    expired:   enriched.filter(q => q.derivedStatus === 'expired').length,
    totalValue: enriched.reduce((s, q) => s + q.total_amount, 0),
  }), [enriched]);

  const handleConvert = useCallback((q: Quotation) => {
    if (q.so_id) { toast.error(`Already converted to ${q.so_no}`); return; }
    const input = quotationToOrderInput(q, entityCode);
    const newOrder = createOrder(input);
    if (!newOrder) { toast.error('Failed to create Sales Order'); return; }
    markConvertedToSO(q.id, newOrder.id, newOrder.order_no);
  }, [entityCode, createOrder, markConvertedToSO]);

  const handlePrint = useCallback((q: Quotation) => {
    navigate(`/erp/salesx/proforma-print/${q.id}`);
  }, [navigate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">PI Tracker</h2>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total PIs</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Active</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-teal-600">{stats.active}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Converted to SO</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-purple-600">{stats.converted}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Expired</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-amber-600">{stats.expired}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Value</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-mono font-bold text-green-600">₹{stats.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by PI no, quotation no, customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="converted">Converted to SO</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No proforma invoices match the current filters.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[10px] text-muted-foreground border-b bg-muted/30">
                <tr>
                  <th className="text-left p-2">PI No</th>
                  <th className="text-left p-2">PI Date</th>
                  <th className="text-left p-2">Source Quote</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Valid Until</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 font-mono font-semibold">{q.proforma_no ?? '—'}</td>
                    <td className="p-2 font-mono text-[10px]">{q.proforma_date ?? '—'}</td>
                    <td className="p-2 font-mono text-[10px] text-muted-foreground">{q.quotation_no}</td>
                    <td className="p-2">{q.customer_name ?? '—'}</td>
                    <td className="p-2 text-right font-mono">₹{q.total_amount.toLocaleString('en-IN')}</td>
                    <td className="p-2 font-mono text-[10px]">{q.valid_until_date ?? '—'}</td>
                    <td className="p-2">
                      {q.derivedStatus === 'active' && (
                        <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-700 border-teal-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      )}
                      {q.derivedStatus === 'converted' && (
                        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 border-purple-500/30">
                          → {q.so_no}
                        </Badge>
                      )}
                      {q.derivedStatus === 'expired' && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                          <Clock className="h-3 w-3 mr-1" /> Expired
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => handlePrint(q)}>
                          <Printer className="h-3 w-3 mr-1" /> Print
                        </Button>
                        {q.derivedStatus === 'active' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => handleConvert(q)}>
                            <ArrowRight className="h-3 w-3 mr-1" /> Convert to SO
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PITrackerPanelComponent;
