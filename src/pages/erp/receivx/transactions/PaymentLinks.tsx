/**
 * PaymentLinks.tsx — ReceivX payment link generator + tracker
 * Sprint 8 · Amber-500 accent · localStorage-backed
 * [JWT] GET/POST /api/receivx/payment-links
 */
import { useState, useMemo, useCallback } from 'react';
import {
  CreditCard, Plus, Copy, MessageCircle, QrCode, CheckCircle2, RefreshCw,
  Search, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { onEnterNext } from '@/lib/keyboard';
import {
  paymentLinksKey, type PaymentLinkRecord, type PaymentStatus,
} from '@/types/payment-gateway';
import { receivxConfigKey, type ReceivXConfig } from '@/types/receivx';
import {
  createPaymentRequest, buildWaMePaymentMessage,
} from '@/lib/payment-gateway-engine';
import type { OutstandingEntry } from '@/types/voucher';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { entityCode: string }

const STATUS_CLASS: Record<PaymentStatus, string> = {
  created: 'bg-slate-500/15 text-slate-700 border-slate-500/30',
  pending: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  paid: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  failed: 'bg-destructive/15 text-destructive border-destructive/30',
  expired: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
  refunded: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  cancelled: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
};

function loadLinks(entityCode: string): PaymentLinkRecord[] {
  try {
    // [JWT] GET /api/receivx/payment-links
    return JSON.parse(localStorage.getItem(paymentLinksKey(entityCode)) || '[]');
  } catch { return []; }
}

function saveLinks(entityCode: string, links: PaymentLinkRecord[]) {
  // [JWT] POST /api/receivx/payment-links
  localStorage.setItem(paymentLinksKey(entityCode), JSON.stringify(links));
}

function loadConfig(entityCode: string): ReceivXConfig | null {
  try {
    // [JWT] GET /api/receivx/config
    const raw = localStorage.getItem(receivxConfigKey(entityCode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function loadOpenInvoices(entityCode: string): OutstandingEntry[] {
  try {
    // [JWT] GET /api/accounting/outstanding
    const raw = localStorage.getItem(`erp_outstanding_${entityCode}`);
    const all: OutstandingEntry[] = raw ? JSON.parse(raw) : [];
    return all.filter(o => o.party_type === 'debtor' && (o.status === 'open' || o.status === 'partial'));
  } catch { return []; }
}

export function PaymentLinksPanel({ entityCode }: Props) {
  const [links, setLinks] = useState<PaymentLinkRecord[]>(() => loadLinks(entityCode));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState<PaymentLinkRecord | null>(null);
  const [pickedInvoiceId, setPickedInvoiceId] = useState<string>('');

  const config = useMemo(() => loadConfig(entityCode), [entityCode]);
  const openInvoices = useMemo(() => loadOpenInvoices(entityCode), [entityCode]);

  const filtered = useMemo(() => {
    return links.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!l.party_name.toLowerCase().includes(s) && !l.ref_voucher_no.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [links, statusFilter, search]);

  const refresh = () => setLinks(loadLinks(entityCode));

  const generate = useCallback(() => {
    if (!config) { toast.error('ReceivX config not found'); return; }
    const inv = openInvoices.find(i => i.id === pickedInvoiceId);
    if (!inv) { toast.error('Pick an invoice'); return; }
    const res = createPaymentRequest(
      {
        ref_voucher_id: inv.voucher_id,
        ref_voucher_no: inv.voucher_no,
        party_id: inv.party_id,
        party_name: inv.party_name,
        party_phone: config.wa_default_sender || null,
        party_email: config.email_from_address || null,
        amount: inv.pending_amount,
        narration: `Payment for ${inv.voucher_no}`,
        expiry_days: config.gateway_link_expiry_days,
      },
      config.gateway_provider,
      config.gateway_credentials,
      config.gateway_link_expiry_days,
    );
    if (!res.success || !res.record) {
      toast.error(res.error || 'Failed to generate'); return;
    }
    const record: PaymentLinkRecord = { ...res.record, entity_id: entityCode };
    const next = [record, ...links];
    saveLinks(entityCode, next);
    setLinks(next);
    setDialogOpen(false);
    setPickedInvoiceId('');
    toast.success('Payment link generated');
  }, [config, openInvoices, pickedInvoiceId, links, entityCode]);

  const copyLink = (l: PaymentLinkRecord) => {
    navigator.clipboard.writeText(l.link_url).then(
      () => toast.success('Link copied'),
      () => toast.error('Copy failed'),
    );
  };

  const sendWa = (l: PaymentLinkRecord) => {
    const phone = config?.wa_default_sender || '';
    if (!phone) { toast.error('Set WhatsApp default sender in Config'); return; }
    const url = buildWaMePaymentMessage(phone, l);
    window.open(url, '_blank');
  };

  const markPaid = (l: PaymentLinkRecord) => {
    const next = links.map(x => x.id === l.id ? {
      ...x, status: 'paid' as PaymentStatus, paid_at: new Date().toISOString(),
      paid_amount: x.amount, updated_at: new Date().toISOString(),
    } : x);
    saveLinks(entityCode, next);
    setLinks(next);
    toast.success('Marked as paid');
  };

  const regenerate = (l: PaymentLinkRecord) => {
    if (!config) return;
    const res = createPaymentRequest(
      {
        ref_voucher_id: l.ref_voucher_id, ref_voucher_no: l.ref_voucher_no,
        party_id: l.party_id, party_name: l.party_name,
        party_phone: null, party_email: null,
        amount: l.amount, narration: `Payment for ${l.ref_voucher_no}`,
        expiry_days: config.gateway_link_expiry_days,
      },
      config.gateway_provider, config.gateway_credentials, config.gateway_link_expiry_days,
    );
    if (!res.success || !res.record) { toast.error(res.error || 'Regenerate failed'); return; }
    const next = links.map(x => x.id === l.id ? { ...res.record!, id: x.id, entity_id: entityCode } : x);
    saveLinks(entityCode, next);
    setLinks(next);
    toast.success('Link regenerated');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-500" />Payment Links</h1>
          <p className="text-xs text-muted-foreground">Generate and track customer pay links</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
          <Button data-primary size="sm" onClick={() => setDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="h-3.5 w-3.5 mr-1" />Generate New
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-xs" placeholder="Customer or voucher" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={onEnterNext} />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as PaymentStatus | 'all')}>
            <SelectTrigger className="h-9 text-xs w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Voucher</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Provider</TableHead>
              <TableHead className="text-xs">Created</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">No payment links yet.</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.ref_voucher_no}</TableCell>
                <TableCell className="text-sm">{l.party_name}</TableCell>
                <TableCell className="font-mono text-xs text-right">₹{l.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell><Badge variant="outline" className={STATUS_CLASS[l.status]}>{l.status}</Badge></TableCell>
                <TableCell className="text-xs">{l.provider}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString('en-IN')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(l.status === 'created' || l.status === 'pending') && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyLink(l)}><Copy className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => sendWa(l)}><MessageCircle className="h-3 w-3" /></Button>
                        {l.upi_intent_uri && (
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setQrOpen(l)}><QrCode className="h-3 w-3" /></Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-600" onClick={() => markPaid(l)}><CheckCircle2 className="h-3 w-3" /></Button>
                      </>
                    )}
                    {l.status === 'paid' && (
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyLink(l)}><Eye className="h-3 w-3" /></Button>
                    )}
                    {(l.status === 'failed' || l.status === 'expired') && (
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => regenerate(l)}><RefreshCw className="h-3 w-3" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Generate dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Payment Link</DialogTitle>
            <DialogDescription>Pick an open invoice to generate a payment link via {config?.gateway_provider ?? 'configured gateway'}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Open Invoice</Label>
              <Select value={pickedInvoiceId} onValueChange={setPickedInvoiceId}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Select an invoice" /></SelectTrigger>
                <SelectContent>
                  {openInvoices.length === 0 ? (
                    <SelectItem value="__none__" disabled>No open invoices</SelectItem>
                  ) : openInvoices.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.voucher_no} · {o.party_name} · ₹{o.pending_amount.toLocaleString('en-IN')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button data-primary className="bg-amber-500 hover:bg-amber-600" onClick={generate}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      <Dialog open={!!qrOpen} onOpenChange={(open) => { if (!open) setQrOpen(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>UPI QR — {qrOpen?.ref_voucher_no}</DialogTitle>
            <DialogDescription>Scan with any UPI app · ₹{qrOpen?.amount.toLocaleString('en-IN')}</DialogDescription>
          </DialogHeader>
          {qrOpen?.upi_intent_uri ? (
            <div className="flex flex-col items-center gap-3">
              <img
                alt="UPI QR"
                className="h-48 w-48 border rounded"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrOpen.upi_intent_uri)}`}
              />
              <code className="text-[10px] text-muted-foreground break-all text-center">{qrOpen.upi_intent_uri}</code>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No UPI URI generated. Set Merchant VPA + Name in ReceivX Config.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PaymentLinksPage() {
  return <PaymentLinksPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
