/**
 * CommissionRegister.tsx — UPRA-1 Phase C · V2 canonical
 * UniversalRegisterGrid<CommissionEntry> consumer.
 *
 * Payment workflow extracted to actions/CommissionPaymentDialog.tsx (byte-identical parity).
 * Display extracted to detail/CommissionDetailPanel.tsx.
 *
 * Post-GL-Voucher and Pay-Agent workflows preserved verbatim in this file
 * (decimal-helpers · generateVoucherNo · postVoucher calls unchanged).
 *
 * Export name `CommissionRegisterPanel` and Props { entityCode } preserved
 * (SalesXPage import unchanged).
 *
 * [JWT] GET /api/salesx/commission-register
 */

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Wallet, FileCheck, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type {
  RegisterColumn, RegisterMeta, SummaryCard, StatusOption,
} from '@/components/registers/UniversalRegisterTypes';
import {
  commissionRegisterKey,
  type CommissionEntry,
} from '@/types/commission-register';
import { generateVoucherNo, postVoucher } from '@/lib/fincore-engine';
import { dAdd, round2 } from '@/lib/decimal-helpers';
import { computeCommissionGL } from '@/lib/commission-engine';
import { comply360SAMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { Voucher } from '@/types/voucher';
import { CommissionPaymentDialog } from './actions/CommissionPaymentDialog';
import { AgentInvoiceDialog } from './actions/AgentInvoiceDialog';
import { CommissionDetailPanel } from './detail/CommissionDetailPanel';

interface Props { entityCode: string }

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;
const todayISO = () => new Date().toISOString().split('T')[0];

const STATUS_COLOR: Record<CommissionEntry['status'], string> = {
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  partial: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  paid: 'bg-green-500/15 text-green-700 border-green-500/30',
  reversed: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

function loadRegister(entityCode: string): CommissionEntry[] {
  try {
    // [JWT] GET /api/salesx/commission-register?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(commissionRegisterKey(entityCode)) || '[]');
  } catch { return []; }
}
function saveRegister(entityCode: string, list: CommissionEntry[]): void {
  // [JWT] PATCH /api/salesx/commission-register
  localStorage.setItem(commissionRegisterKey(entityCode), JSON.stringify(list));
}

export function CommissionRegisterPanel({ entityCode }: Props) {
  const [tick, setTick] = useState(0);
  const register = useMemo<CommissionEntry[]>(
    () => loadRegister(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  const samCfg = useMemo<SAMConfig | null>(() => {
    try {
      // [JWT] GET /api/compliance/comply360/sam/:entityCode
      const raw = localStorage.getItem(comply360SAMKey(entityCode));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [entityCode]);

  const reload = useCallback(() => setTick(t => t + 1), []);

  const [payEntry, setPayEntry] = useState<CommissionEntry | null>(null);
  const [viewEntry, setViewEntry] = useState<CommissionEntry | null>(null);

  // Sprint 4 — Post GL voucher (byte-identical · lifted verbatim)
  const handlePostGLVoucher = useCallback((entry: CommissionEntry) => {
    const glResult = computeCommissionGL(
      entry,
      samCfg?.commissionLedgerSales ?? '',
      'Commission on Sales',
    );
    if ('error' in glResult) { toast.error(glResult.error); return; }
    const pvNo = generateVoucherNo('PV', entityCode);
    const pv: Voucher = {
      id: `v-${Date.now()}`,
      voucher_no: pvNo,
      voucher_type_id: '',
      voucher_type_name: 'Payment',
      base_voucher_type: 'Payment',
      entity_id: entityCode,
      date: todayISO(),
      party_name: entry.person_name,
      ref_voucher_no: entry.voucher_no,
      vendor_bill_no: '',
      net_amount: glResult.netPayableToAgent + glResult.tdsPayableAmount,
      narration: `Commission payment - ${entry.voucher_no}`,
      terms_conditions: '', payment_enforcement: '',
      payment_instrument: '', from_ledger_name: '',
      to_ledger_name: entry.person_name,
      from_godown_name: '', to_godown_name: '',
      ledger_lines: glResult.expenseLines,
      gross_amount: glResult.netPayableToAgent + glResult.tdsPayableAmount,
      total_discount: 0, total_taxable: 0,
      total_cgst: 0, total_sgst: 0, total_igst: 0,
      total_cess: 0, total_tax: 0, round_off: 0,
      tds_applicable: entry.tds_applicable,
      status: 'draft',
      created_by: 'current-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      // [JWT] POST /api/accounting/vouchers (commission GL)
      postVoucher(pv, entityCode);
      const list = loadRegister(entityCode);
      const idx = list.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          commission_expense_voucher_id: pv.id,
          commission_expense_voucher_no: pvNo,
          updated_at: new Date().toISOString(),
        };
        saveRegister(entityCode, list);
        reload();
      }
      toast.success(`GL voucher ${pvNo} posted`);
    } catch { toast.error('Failed to post GL voucher'); }
  }, [entityCode, samCfg, reload]);

  // Sprint 5 — Pay Agent bank payout (byte-identical · lifted verbatim)
  const handlePayAgent = useCallback((entry: CommissionEntry) => {
    if (!entry.commission_expense_voucher_id) {
      toast.error('Post GL Voucher first before bank payout');
      return;
    }
    if (entry.bank_payment_voucher_id) {
      toast.error('Bank payment already recorded');
      return;
    }
    const netPayable = round2(dAdd(entry.net_paid_to_date, entry.collection_bonus_amount ?? 0));
    if (netPayable <= 0) {
      toast.error('No commission payable for bank payout');
      return;
    }
    const bankLedger = (samCfg?.commissionLedgerSales ?? '').trim();
    const pvNo = generateVoucherNo('PV', entityCode);
    const today = todayISO();
    const pv: Voucher = {
      id: `v-bank-${Date.now()}`,
      voucher_no: pvNo,
      voucher_type_id: '',
      voucher_type_name: 'Payment',
      base_voucher_type: 'Payment',
      entity_id: entityCode,
      date: today,
      party_name: entry.person_name,
      ref_voucher_no: entry.commission_expense_voucher_no ?? entry.voucher_no,
      vendor_bill_no: '',
      net_amount: netPayable,
      narration: `Commission bank payout - ${entry.person_name} - ${entry.voucher_no}`,
      terms_conditions: '', payment_enforcement: '',
      payment_instrument: 'NEFT',
      from_ledger_name: 'Bank',
      to_ledger_name: entry.person_name,
      from_godown_name: '', to_godown_name: '',
      ledger_lines: [
        {
          id: `bp-${Date.now()}-1`,
          ledger_id: '',
          ledger_code: '',
          ledger_name: entry.person_name,
          ledger_group_code: 'CRED',
          dr_amount: netPayable,
          cr_amount: 0,
          narration: `Commission paid - ${entry.voucher_no}`,
        },
        {
          id: `bp-${Date.now()}-2`,
          ledger_id: bankLedger,
          ledger_code: '',
          ledger_name: 'Bank',
          ledger_group_code: 'BANK',
          dr_amount: 0,
          cr_amount: netPayable,
          narration: `Bank payout - ${entry.person_name}`,
        },
      ],
      gross_amount: netPayable,
      total_discount: 0, total_taxable: 0,
      total_cgst: 0, total_sgst: 0, total_igst: 0,
      total_cess: 0, total_tax: 0, round_off: 0,
      tds_applicable: false,
      status: 'draft',
      created_by: 'current-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      // [JWT] POST /api/accounting/vouchers (commission bank payout)
      postVoucher(pv, entityCode);
      const list = loadRegister(entityCode);
      const idx = list.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          bank_payment_voucher_id: pv.id,
          bank_payment_voucher_no: pvNo,
          bank_payment_date: today,
          updated_at: new Date().toISOString(),
        };
        saveRegister(entityCode, list);
        reload();
      }
      toast.success(`Bank payout ${pvNo} recorded · ₹${inrFmt.format(netPayable)}`);
    } catch { toast.error('Failed to record bank payout'); }
  }, [entityCode, samCfg, reload]);

  const meta: RegisterMeta<CommissionEntry> = {
    registerCode: 'commission_register',
    title: 'Commission Register',
    description: 'Commission earned on amount received with TDS write-back',
    dateAccessor: r => r.voucher_date,
  };

  const columns: RegisterColumn<CommissionEntry>[] = [
    { key: 'voucher_no', label: 'Invoice', clickable: true, render: r => r.voucher_no, exportKey: 'voucher_no' },
    { key: 'date', label: 'Date', render: r => r.voucher_date, exportKey: 'voucher_date' },
    { key: 'customer', label: 'Customer', render: r => r.customer_name, exportKey: 'customer_name' },
    {
      key: 'person', label: 'SAM Person',
      render: r => (
        <div>
          <div className="font-medium">{r.person_name}</div>
          <div className="text-[10px] text-muted-foreground capitalize">
            {r.person_type}
            {r.tds_applicable && r.tds_section && ` · TDS ${r.tds_section} @ ${r.tds_rate}%`}
          </div>
        </div>
      ),
      exportKey: 'person_name',
    },
    { key: 'net_inv', label: 'Net Inv ₹', align: 'right', render: r => inrFmt.format(r.net_invoice_amount), exportKey: r => r.net_invoice_amount },
    { key: 'commission', label: 'Commission ₹', align: 'right', render: r => inrFmt.format(r.net_total_commission), exportKey: r => r.net_total_commission },
    { key: 'received', label: 'Received ₹', align: 'right', render: r => inrFmt.format(r.amount_received_to_date), exportKey: r => r.amount_received_to_date },
    { key: 'net_paid', label: 'Net Paid ₹', align: 'right', render: r => inrFmt.format(r.net_paid_to_date), exportKey: r => r.net_paid_to_date },
    {
      key: 'status', label: 'Status',
      render: r => (
        <>
          <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLOR[r.status])}>
            {r.status}
          </Badge>
          {r.commission_expense_voucher_no && (
            <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
              GL: {r.commission_expense_voucher_no}
            </div>
          )}
        </>
      ),
      exportKey: 'status',
    },
    {
      key: 'actions', label: 'Actions',
      render: r => {
        const isReversed = r.status === 'reversed';
        if (isReversed) return <span className="text-[10px] text-muted-foreground italic">reversed</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {(r.status === 'pending' || r.status === 'partial') && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => setPayEntry(r)}>
                <Wallet className="h-3 w-3 mr-1" /> Log
              </Button>
            )}
            {(r.status === 'paid' || r.status === 'partial') && !r.commission_expense_voucher_id && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => handlePostGLVoucher(r)}>
                <FileCheck className="h-3 w-3 mr-1" /> Post GL
              </Button>
            )}
            {r.commission_expense_voucher_id && !r.bank_payment_voucher_id && (
              <Button data-primary size="sm" className="h-7 text-[10px] px-2 bg-orange-500 hover:bg-orange-600" onClick={() => handlePayAgent(r)}>
                <Banknote className="h-3 w-3 mr-1" /> Pay Agent
              </Button>
            )}
            {r.bank_payment_voucher_no && (
              <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">
                Paid: {r.bank_payment_voucher_no}
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  const statusOptions: StatusOption[] = (
    ['pending', 'partial', 'paid', 'reversed', 'cancelled'] as CommissionEntry['status'][]
  ).map(s => ({ value: s, label: s }));

  const summaryBuilder = (f: CommissionEntry[]): SummaryCard[] => {
    const t = f.reduce((acc, e) => {
      acc.commission += e.total_commission;
      acc.received += e.amount_received_to_date;
      acc.earned += e.commission_earned_to_date;
      acc.tds += e.tds_deducted_to_date;
      acc.net += e.net_paid_to_date;
      return acc;
    }, { commission: 0, received: 0, earned: 0, tds: 0, net: 0 });
    return [
      { label: 'Total Commission', value: formatINR(t.commission) },
      { label: 'Received',         value: formatINR(t.received) },
      { label: 'Earned',           value: formatINR(t.earned), tone: 'positive' },
      { label: 'TDS Deducted',     value: formatINR(t.tds), tone: 'warning' },
      { label: 'Net Paid',         value: formatINR(t.net), tone: 'positive' },
    ];
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      <UniversalRegisterGrid<CommissionEntry>
        entityCode={entityCode}
        meta={meta}
        rows={register}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setViewEntry}
      />

      <Dialog open={!!viewEntry} onOpenChange={o => !o && setViewEntry(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewEntry && <CommissionDetailPanel entry={viewEntry} />}
        </DialogContent>
      </Dialog>

      <CommissionPaymentDialog
        entityCode={entityCode}
        entry={payEntry}
        open={!!payEntry}
        onClose={() => setPayEntry(null)}
        onPaymentComplete={() => reload()}
      />
    </div>
  );
}

export default function CommissionRegister(props: Props) {
  return <CommissionRegisterPanel {...props} />;
}
