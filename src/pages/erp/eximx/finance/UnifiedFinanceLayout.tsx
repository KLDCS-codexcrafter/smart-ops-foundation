/**
 * @file        src/pages/erp/eximx/finance/UnifiedFinanceLayout.tsx
 * @purpose     EX-8 parent composition · 5 finance pages under forex-rates slot · EximX.types.ts 0-diff (Q12=a)
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Banknote, TrendingUp, Calendar, BookOpen } from 'lucide-react';
import { TTPaymentDetail } from './TTPaymentDetail';
import { HedgeContractList } from './HedgeContractList';
import { MonthEndRevalDashboard } from './MonthEndRevalDashboard';
import { CustomDayBook } from './CustomDayBook';
import { loadTTPayments, summarizeTTPayments } from '@/lib/tt-payment-engine';
import { loadHedges } from '@/lib/hedge-contract-engine';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type FinanceTab = 'tt-payments' | 'hedge' | 'month-end-reval' | 'day-book';

export function UnifiedFinanceLayout(): JSX.Element {
  const [tab, setTab] = useState<FinanceTab>('tt-payments');
  const [selectedTTId, setSelectedTTId] = useState<string | null>(null);
  const entityCode = 'sinha-trading';
  const tts = loadTTPayments(entityCode);
  const ttSummary = summarizeTTPayments(tts);
  const hedges = loadHedges(entityCode);

  if (selectedTTId) {
    return <TTPaymentDetail ttPaymentId={selectedTTId} onBack={() => setSelectedTTId(null)} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold"><Globe className="w-5 h-5 inline mr-2" />Unified Finance · Forex Operations</h1>
        <p className="text-sm text-muted-foreground">EX-8 · TT Payments + Form 15CA/15CB + Hedge + Month-End Reval + Custom Day Book · D-NEW-FG voucher runtime resolution</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === 'tt-payments' ? 'default' : 'outline'} onClick={() => setTab('tt-payments')}><Banknote className="w-4 h-4 mr-2" />TT Payments ({tts.length})</Button>
        <Button variant={tab === 'hedge' ? 'default' : 'outline'} onClick={() => setTab('hedge')}><TrendingUp className="w-4 h-4 mr-2" />Hedge ({hedges.length})</Button>
        <Button variant={tab === 'month-end-reval' ? 'default' : 'outline'} onClick={() => setTab('month-end-reval')}><Calendar className="w-4 h-4 mr-2" />Month-End Reval</Button>
        <Button variant={tab === 'day-book' ? 'default' : 'outline'} onClick={() => setTab('day-book')}><BookOpen className="w-4 h-4 mr-2" />Day Book</Button>
      </div>

      {tab === 'tt-payments' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{ttSummary.total}</div><div className="text-xs text-muted-foreground">Total TTs</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{ttSummary.by_status.credited_to_beneficiary ?? 0}</div><div className="text-xs text-muted-foreground">Credited</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-warning">{ttSummary.by_status.in_transit ?? 0}</div><div className="text-xs text-muted-foreground">In Transit</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">₹{ttSummary.total_outflow_inr.toLocaleString('en-IN')}</div><div className="text-xs text-muted-foreground">Outflow</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>TT Payment Register</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>TT No</TableHead><TableHead>ImportPO</TableHead><TableHead>Vendor</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Form 15CA</TableHead><TableHead className="text-right">INR</TableHead></TableRow></TableHeader>
                <TableBody>
                  {tts.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedTTId(t.id)}>
                      <TableCell className="font-mono">{t.tt_payment_no}</TableCell>
                      <TableCell className="font-mono text-xs">{t.related_import_po_no}</TableCell>
                      <TableCell className="font-mono text-xs">{t.related_foreign_vendor_id}</TableCell>
                      <TableCell className="font-mono">{t.amount_foreign.toLocaleString('en-IN')} {t.currency_code}</TableCell>
                      <TableCell><Badge variant="outline">{t.status.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{t.related_form_15ca_submission_id ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{t.total_debit_inr.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
      {tab === 'hedge' && <HedgeContractList />}
      {tab === 'month-end-reval' && <MonthEndRevalDashboard />}
      {tab === 'day-book' && <CustomDayBook />}
    </div>
  );
}
