/**
 * @file     MSMEAlerts.tsx
 * @purpose  Operator-facing MSME 43B(h) Alerts dashboard.
 *           4 KPI cards · 3 tabs (Breached · Breaching Soon · Within Deadline) ·
 *           drill-to-pay action that deep-links into VendorPaymentEntry.
 * @sprint   T-T8.5-MSME-Compliance (Group B Sprint B.5)
 * @whom     Routed from PayOutSidebar "MSME Compliance" entry.
 *
 * Reads exclusively via msme-43bh-engine (pure query). No mutations.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle, Users, Clock, AlertOctagon, IndianRupee, ArrowRight,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import {
  getMSMEBreaches,
  compute43BhSummary,
  disallowedAmountForFY,
  type MSMEBreach,
} from '@/lib/msme-43bh-engine';

const inr = (paise: number): string =>
  '₹' + (paise || 0).toLocaleString('en-IN');

function currentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  // FY starts Apr 1
  const start = now.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

function fyOptions(): string[] {
  const cur = currentFY();
  const startCur = parseInt(cur.split('-')[0], 10);
  return [
    `${startCur - 1}-${String(startCur % 100).padStart(2, '0')}`,
    cur,
    `${startCur + 1}-${String((startCur + 2) % 100).padStart(2, '0')}`,
  ];
}

interface PanelProps { entityCode: string; }

function MSMEAlertsPanel({ entityCode }: PanelProps) {
  const navigate = useNavigate();
  const [fy, setFy] = useState<string>(currentFY());

  const summary = useMemo(() => compute43BhSummary(entityCode), [entityCode]);
  const breaches = useMemo(() => getMSMEBreaches(entityCode), [entityCode]);
  const disallowedFY = useMemo(
    () => disallowedAmountForFY(entityCode, fy),
    [entityCode, fy],
  );

  const breached = breaches.filter(b => b.status === 'breached');
  const breachingSoon = breaches.filter(b => b.status === 'breaching_soon');
  const withinDeadline = breaches.filter(b => b.status === 'within_deadline');

  const handlePayNow = (b: MSMEBreach): void => {
    navigate(
      `/erp/payout/vendor-payment?vendorId=${encodeURIComponent(b.vendor_id)}&amount=${b.unpaid_amount}&billRef=${encodeURIComponent(b.invoice_id)}`,
    );
  };

  const kpiCards = [
    {
      label: 'Total MSME Vendors',
      value: String(summary.total_msme_vendors),
      icon: Users,
      tone: 'text-blue-600',
      sub: 'Micro + Small registered',
    },
    {
      label: 'Breaching Soon',
      value: String(summary.breaching_soon_count),
      icon: Clock,
      tone: 'text-amber-600',
      sub: 'Within 5 days of deadline',
    },
    {
      label: 'Breached',
      value: String(summary.breached_count),
      icon: AlertOctagon,
      tone: 'text-destructive',
      sub: 'Past 15/45-day deadline',
    },
    {
      label: `Disallowed (FY ${fy})`,
      value: inr(disallowedFY),
      icon: IndianRupee,
      tone: 'text-destructive',
      sub: 'Sec 43B(h) inadmissible',
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            MSME 43B(h) Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time tracking of MSME (Micro / Small) vendor payment deadlines per
            Income Tax Act Sec 43B(h) · 15-day rule (no agreement) · 45-day rule
            (with agreement, proxy: creditDays &gt; 15)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Financial Year:</span>
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fyOptions().map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.tone}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{card.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">MSME Open Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="breached">
            <TabsList>
              <TabsTrigger value="breached">
                Breached <Badge variant="outline" className="ml-2 text-[9px]">{breached.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="breaching_soon">
                Breaching Soon <Badge variant="outline" className="ml-2 text-[9px]">{breachingSoon.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="within_deadline">
                Within Deadline <Badge variant="outline" className="ml-2 text-[9px]">{withinDeadline.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="breached" className="mt-4">
              <BreachTable rows={breached} onPay={handlePayNow} emptyMsg="No breached MSME bills · 43B(h) compliant" />
            </TabsContent>
            <TabsContent value="breaching_soon" className="mt-4">
              <BreachTable rows={breachingSoon} onPay={handlePayNow} emptyMsg="No bills approaching deadline" />
            </TabsContent>
            <TabsContent value="within_deadline" className="mt-4">
              <BreachTable rows={withinDeadline} onPay={handlePayNow} emptyMsg="No open MSME bills" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="pt-4">
          <p className="text-[11px] text-muted-foreground">
            <strong>Note:</strong> This dashboard is the operational layer for 43B(h)
            tracking. Audit-time disallowance (Form 3CD Cl.25) and 43B-Liabilities
            checkpoint continue to be computed by the existing Audit engine ·
            unchanged. Hard payment-block · email/SMS/WhatsApp notifications ·
            configurable deadline rules · approval routing on breach are deferred to
            the Support &amp; Back Office horizon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface BreachTableProps {
  rows: MSMEBreach[];
  onPay: (b: MSMEBreach) => void;
  emptyMsg: string;
}

function BreachTable({ rows, onPay, emptyMsg }: BreachTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-10">
        {emptyMsg}
      </div>
    );
  }
  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Vendor</TableHead>
            <TableHead className="text-xs">MSME</TableHead>
            <TableHead className="text-xs">Invoice No</TableHead>
            <TableHead className="text-xs">Inv Date</TableHead>
            <TableHead className="text-xs text-right">Amount</TableHead>
            <TableHead className="text-xs text-right">Paid</TableHead>
            <TableHead className="text-xs text-right">Unpaid</TableHead>
            <TableHead className="text-xs">Deadline</TableHead>
            <TableHead className="text-xs">Rule</TableHead>
            <TableHead className="text-xs text-right">Days</TableHead>
            <TableHead className="text-xs text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(b => {
            const overdue = b.days_overdue > 0;
            return (
              <TableRow key={b.invoice_id}>
                <TableCell className="text-xs">{b.vendor_name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      b.msme_category === 'micro'
                        ? 'bg-violet-500/10 text-violet-700 border-violet-500/30 text-[9px]'
                        : 'bg-blue-500/10 text-blue-700 border-blue-500/30 text-[9px]'
                    }
                  >
                    {b.msme_category}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">{b.invoice_no}</TableCell>
                <TableCell className="text-xs">{b.invoice_date}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(b.invoice_amount)}</TableCell>
                <TableCell className="text-xs text-right font-mono text-muted-foreground">{inr(b.paid_amount)}</TableCell>
                <TableCell className="text-xs text-right font-mono font-bold">{inr(b.unpaid_amount)}</TableCell>
                <TableCell className="text-xs">{b.deadline.deadline_date}</TableCell>
                <TableCell className="text-[10px] text-muted-foreground">
                  {b.deadline.days_allowed}-day
                </TableCell>
                <TableCell className={`text-xs text-right font-mono ${overdue ? 'text-destructive font-bold' : ''}`}>
                  {b.days_overdue > 0 ? `+${b.days_overdue}` : b.days_overdue}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={overdue ? 'destructive' : 'outline'}
                    className="h-7 text-[10px]"
                    onClick={() => onPay(b)}
                  >
                    Pay Now <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function MSMEAlerts() {
  const { entityCode } = useEntityCode();
  return entityCode
    ? <MSMEAlertsPanel entityCode={entityCode} />
    : <SelectCompanyGate title="Select a company to view MSME 43B(h) Alerts" />;
}
