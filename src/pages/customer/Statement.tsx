import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Download, Copy } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';
import type { Voucher } from '@/types/voucher';
import {
  createPaymentRequest, buildUpiIntent, buildWaMePaymentMessage,
} from '@/lib/payment-gateway-engine';
import {
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
  paymentLinksKey, PROVIDER_LABELS,
  type PaymentLinkRecord, type GatewayProvider,
} from '@/types/payment-gateway';

function formatINR(r: number) {
  if (r === 0) return "—";
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

function formatINRAlways(r: number) {
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

interface StatementRow {
  id: string;
  voucher_id: string;
  voucher_no: string;
  date: string;
  due_date: string;
  type: 'invoice' | 'payment';
  ref: string;
  debit: number;
  credit: number;
  balance: number;
  pending_amount: number;
  description: string;
  party_id: string;
  party_name: string;
}

export default function Statement() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const customerId = 'demo-customer-1'; // [JWT] derived from customer auth context
  const entityCode = DEFAULT_ENTITY_SHORTCODE;             // [JWT] derived from customer's entity assignment
  const customerName = 'Demo Customer';

  const [payOpen, setPayOpen] = useState(false);
  const [paySelection, setPaySelection] = useState<StatementRow | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkRecord | null>(null);

  const config = useMemo(() => {
    try {
      // [JWT] GET /api/receivx/config
      const raw = localStorage.getItem(`erp_receivx_config_${entityCode}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [entityCode]);

  const provider: GatewayProvider = config?.gateway_provider ?? 'upi_intent_only';

  const statementRows: StatementRow[] = useMemo(() => {
    let vouchers: Voucher[] = [];
    try {
      // [JWT] GET /api/accounting/vouchers?party_id={customerId}
      vouchers = JSON.parse(localStorage.getItem(`erp_group_vouchers_${entityCode}`) || '[]');
    } catch { /* noop */ }

    const relevant = vouchers.filter(v =>
      v.party_id === customerId && !v.is_cancelled && v.status === 'posted' &&
      ['Sales', 'Receipt', 'Credit Note', 'Debit Note'].includes(v.base_voucher_type),
    );

    const sorted = [...relevant].sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    return sorted.map(v => {
      const isDr = v.base_voucher_type === 'Sales' || v.base_voucher_type === 'Debit Note';
      const amt = v.net_amount;
      if (isDr) bal += amt; else bal -= amt;
      // crude pending = the invoice amount when its an invoice; payments = 0
      const pending = isDr ? amt : 0;
      const due = (() => {
        try {
          const d = new Date(v.date); d.setDate(d.getDate() + 30);
          return d.toISOString().split('T')[0];
        } catch { return v.date; }
      })();
      return {
        id: v.id,
        voucher_id: v.id,
        voucher_no: v.voucher_no,
        date: v.date,
        due_date: due,
        type: isDr ? 'invoice' as const : 'payment' as const,
        ref: v.voucher_no,
        debit: isDr ? amt : 0,
        credit: isDr ? 0 : amt,
        balance: bal,
        pending_amount: pending,
        description: v.narration || `${v.base_voucher_type} ${v.voucher_no}`,
        party_id: v.party_id || customerId,
        party_name: v.party_name || customerName,
      };
    });
  }, [customerId, entityCode]);

  const totalDebits = statementRows.reduce((s, r) => s + r.debit, 0);
  const totalCredits = statementRows.reduce((s, r) => s + r.credit, 0);
  const closingBalance = statementRows[statementRows.length - 1]?.balance ?? 0;
  const totalOutstanding = Math.max(closingBalance, 0);
  const today = new Date().toISOString().split('T')[0];
  const totalOverdue = statementRows
    .filter(r => r.type === 'invoice' && r.pending_amount > 0 && r.due_date < today)
    .reduce((s, r) => s + r.pending_amount, 0);
  const creditAvailable = Math.max(0, 100000 - totalOutstanding); // demo limit

  const upiUri = useMemo(() => {
    if (!paySelection || !config) return null;
    return buildUpiIntent(
      paySelection.pending_amount,
      `Payment for ${paySelection.voucher_no}`,
      config.gateway_credentials?.merchant_vpa ?? null,
      config.gateway_credentials?.merchant_name ?? null,
    );
  }, [paySelection, config]);

  const handleGeneratePaymentLink = useCallback(() => {
    if (!paySelection) return;
    const creds = config?.gateway_credentials ?? {
      provider, key_id: '', key_secret: '', webhook_secret: '',
      is_test_mode: true, merchant_vpa: null, merchant_name: null,
    };
    const expiry = config?.gateway_link_expiry_days ?? 7;
    const res = createPaymentRequest(
      {
        ref_voucher_id: paySelection.voucher_id,
        ref_voucher_no: paySelection.voucher_no,
        party_id: paySelection.party_id,
        party_name: paySelection.party_name,
        party_phone: null, party_email: null,
        amount: paySelection.pending_amount,
        narration: `Payment for ${paySelection.voucher_no}`,
        expiry_days: expiry,
      },
      provider, creds, expiry,
    );
    if (res.success && res.record) {
      setPaymentLink(res.record);
      try {
        // [JWT] POST /api/payment-gateway/create-order
        const key = paymentLinksKey(entityCode);
        const all = JSON.parse(localStorage.getItem(key) || '[]');
        all.push(res.record);
        localStorage.setItem(key, JSON.stringify(all));
      } catch { /* noop */ }
      toast.success('Payment link generated');
    } else {
      toast.error(res.error ?? 'Failed to generate payment link');
    }
  }, [paySelection, config, provider, entityCode]);

  const handleShareOnWhatsApp = useCallback(() => {
    if (!paymentLink) { handleGeneratePaymentLink(); return; }
    window.open(buildWaMePaymentMessage('', paymentLink), '_blank');
  }, [paymentLink, handleGeneratePaymentLink]);

  const openPayDialog = useCallback((row: StatementRow) => {
    setPaySelection(row);
    setPaymentLink(null);
    setPayOpen(true);
  }, []);

  return (
    <CustomerLayout title="Account Statement" subtitle="Ledger statement with all transactions"><div data-keyboard-form>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Input type="date" className="w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} onKeyDown={onEnterNext} />
          <Input type="date" className="w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} onKeyDown={onEnterNext} />
        </div>
        <Button variant="outline" onClick={() => toast("Downloading statement as PDF...")}>
          <Download className="h-4 w-4 mr-1.5" />
          Download Statement
        </Button>
      </div>

      {/* Outstanding Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Outstanding</p>
          <p className="font-mono text-xl font-bold text-foreground">₹{totalOutstanding.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</p>
          <p className="font-mono text-xl font-bold text-destructive">₹{totalOverdue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Credit Available</p>
          <p className="font-mono text-xl font-bold text-success">₹{creditAvailable.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-8 bg-card border border-border rounded-xl p-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Debits</p>
          <p className="font-mono text-lg font-bold text-destructive">{formatINRAlways(totalDebits)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Credits</p>
          <p className="font-mono text-lg font-bold text-success">{formatINRAlways(totalCredits)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Closing Balance</p>
          <p className="font-mono text-lg font-bold text-warning">{formatINRAlways(closingBalance)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Reference</TableHead>
              <TableHead className="text-xs text-right">Debit</TableHead>
              <TableHead className="text-xs text-right">Credit</TableHead>
              <TableHead className="text-xs text-right">Balance</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statementRows.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">No transactions yet.</TableCell></TableRow>
            ) : statementRows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  row.type === "invoice" && "bg-destructive/[0.03]",
                  row.type === "payment" && "bg-success/[0.03]"
                )}
              >
                <TableCell className="text-xs text-muted-foreground">{row.date}</TableCell>
                <TableCell className="text-sm text-foreground">{row.description}</TableCell>
                <TableCell className="font-mono text-xs text-primary">{row.ref}</TableCell>
                <TableCell className="font-mono text-sm text-destructive text-right">{formatINR(row.debit)}</TableCell>
                <TableCell className="font-mono text-sm text-success text-right">{formatINR(row.credit)}</TableCell>
                <TableCell className="font-mono text-sm font-semibold text-foreground text-right">{formatINRAlways(row.balance)}</TableCell>
                <TableCell className="text-right">
                  {row.pending_amount > 0 && (
                    <Button size="sm" variant="default" onClick={() => openPayDialog(row)}>
                      Pay Now
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {/* Closing balance footer */}
            <TableRow className="bg-muted/20 font-bold">
              <TableCell colSpan={5} className="text-sm font-bold">Closing Balance</TableCell>
              <TableCell className="font-mono text-lg font-bold text-warning text-right">{formatINRAlways(closingBalance)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Pay Now Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Pay ₹{paySelection?.pending_amount.toLocaleString('en-IN')}
            </DialogTitle>
            <DialogDescription>
              Invoice {paySelection?.voucher_no} · Due {paySelection?.due_date}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="gateway" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gateway">Gateway</TabsTrigger>
              <TabsTrigger value="upi">UPI QR</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="gateway" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                Pay securely via {PROVIDER_LABELS[provider]}.
              </p>
              <Button className="w-full" onClick={handleGeneratePaymentLink}>
                Generate and Pay via {PROVIDER_LABELS[provider]}
              </Button>
              {paymentLink && (
                <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                  <span className="font-mono text-xs truncate flex-1">{paymentLink.link_url}</span>
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(paymentLink.link_url);
                    toast.success('Copied');
                  }}>
                    <Copy className="h-3 w-3 mr-1" />Copy
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upi" className="space-y-3 pt-3">
              {upiUri ? (
                <>
                  <div className="flex justify-center bg-background rounded-lg p-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}`}
                      alt="UPI QR Code"
                      className="w-60 h-60"
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Scan with any UPI app — GPay, PhonePe, Paytm, BHIM
                  </p>
                  <Button className="w-full" variant="outline" onClick={() => window.open(upiUri, '_blank')}>
                    Open in UPI App
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  UPI QR not available — merchant VPA not configured.
                </p>
              )}
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                Forward this payment link on WhatsApp.
              </p>
              <Button className="w-full" onClick={handleShareOnWhatsApp}>
                Share Payment Link on WhatsApp
              </Button>
              {paymentLink && (
                <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                  <span className="font-mono text-xs truncate flex-1">{paymentLink.link_url}</span>
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(paymentLink.link_url);
                    toast.success('Copied');
                  }}>
                    <Copy className="h-3 w-3 mr-1" />Copy
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div></CustomerLayout>
  );
}
