/**
 * @file        src/pages/erp/eximx/finance/CustomDayBook.tsx
 * @purpose     Custom Day Book · REPORTING surface · queries existing voucher data with filters · Q6=b
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen } from 'lucide-react';
import { loadTTPayments } from '@/lib/tt-payment-engine';

interface DayBookEntry {
  date: string;
  voucher_type: string;
  reference: string;
  ledger: string;
  debit_inr: number;
  credit_inr: number;
  notes: string;
}

export function CustomDayBook(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo, setDateTo] = useState('2026-05-31');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('all');

  const tts = loadTTPayments(entityCode);
  const entries: DayBookEntry[] = tts
    .filter((t) => t.credited_at && t.credited_at.slice(0, 10) >= dateFrom && t.credited_at.slice(0, 10) <= dateTo)
    .map((t) => ({
      date: (t.credited_at ?? '').slice(0, 10),
      voucher_type: 'TT_OUTWARD',
      reference: t.tt_payment_no,
      ledger: `Foreign Vendor · ${t.related_foreign_vendor_id}`,
      debit_inr: t.total_debit_inr,
      credit_inr: 0,
      notes: t.notes,
    }));

  const filtered = voucherTypeFilter === 'all' ? entries : entries.filter((e) => e.voucher_type === voucherTypeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold"><BookOpen className="w-5 h-5 inline mr-2" />Custom Day Book</h2>
        <p className="text-sm text-muted-foreground">Q6=b · REPORTING surface · queries existing vouchers · configurable filters</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
            <div><Label>Voucher Type</Label>
              <select value={voucherTypeFilter} onChange={(e) => setVoucherTypeFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="all">All</option>
                <option value="TT_OUTWARD">TT Outward</option>
                <option value="MONTH_END_REVAL">Month-End Reval</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Day Book Entries · {filtered.length} entries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead>Ledger</TableHead><TableHead className="text-right">Debit (₹)</TableHead><TableHead className="text-right">Credit (₹)</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((e, i) => (
                <TableRow key={`${e.reference}-${i}`}>
                  <TableCell className="font-mono">{e.date}</TableCell>
                  <TableCell><Badge variant="outline">{e.voucher_type}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                  <TableCell className="text-xs">{e.ledger}</TableCell>
                  <TableCell className="text-right font-mono">{e.debit_inr.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right font-mono">{e.credit_inr.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
