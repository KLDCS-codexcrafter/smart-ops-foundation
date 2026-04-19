/**
 * DeliveryNote.tsx — Full Delivery Note form with SAM injection (Sprint 5)
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Send, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { InventoryLineGrid } from '@/components/finecore/InventoryLineGrid';
import { generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';
import { useOrders } from '@/hooks/useOrders';
import { calculateInvoiceCommission } from '@/lib/sam-engine';
import type { CommissionResult } from '@/lib/sam-engine';
import { isCommissionAlreadyBooked } from '@/lib/commission-engine';
import type { CommissionEntry } from '@/types/commission-register';
import { commissionRegisterKey } from '@/types/commission-register';
import type { SAMPerson } from '@/types/sam-person';
import { samPersonsKey } from '@/types/sam-person';
import { comply360SAMKey } from '@/pages/erp/accounting/Comply360Config';
import type { SAMConfig } from '@/pages/erp/accounting/Comply360Config';
import { computePackingSlip } from '@/lib/packing-slip-engine';
import { packingSlipsKey, type PackingSlip } from '@/types/packing-slip';
import type { ItemPacking } from '@/types/item-packing';

interface LogisticMasterLite {
  id: string;
  partyName: string;
  gstin: string;
  logisticType: string;
}

interface DeliveryNotePanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function DeliveryNotePanel({ onSaveDraft }: DeliveryNotePanelProps) {
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : 'SMRT';

  const [voucherNo] = useState(() => generateVoucherNo('DLN', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [againstSI, setAgainstSI] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [logisticId, setLogisticId] = useState<string | null>(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverNo, setDriverNo] = useState('');
  const [distance, setDistance] = useState('');
  const [inventoryLines, setInventoryLines] = useState<VoucherInventoryLine[]>([]);
  const [narration, setNarration] = useState('');

  // SAM state
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [samSalesmanId, setSamSalesmanId] = useState<string | null>(null);
  const [samSalesmanName, setSamSalesmanName] = useState<string | null>(null);
  const [samAgentId, setSamAgentId] = useState<string | null>(null);
  const [samAgentName, setSamAgentName] = useState<string | null>(null);
  const [commissionBanner, setCommissionBanner] = useState<string | null>(null);

  const customers = useMemo<Array<{ id: string; partyName: string }>>(() => {
    try {
      // [JWT] GET /api/masters/customers
      return JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]');
    } catch { return []; }
  }, []);

  const samCfg = useMemo<SAMConfig | null>(() => {
    try {
      // [JWT] GET /api/compliance/comply360/sam/:entityCode
      const raw = localStorage.getItem(comply360SAMKey(entityCode));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [entityCode]);

  const samPersons = useMemo<SAMPerson[]>(() => {
    try {
      // [JWT] GET /api/salesx/sam/persons
      const raw = localStorage.getItem(samPersonsKey(entityCode));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [entityCode]);

  const { getOpenOrdersForLookup } = useOrders(entityCode);
  const openSOs = useMemo(
    () => getOpenOrdersForLookup('Sales Order'),
    [getOpenOrdersForLookup],
  );

  const ledgerFlags = useMemo<Record<string, boolean>>(() => {
    try {
      // [JWT] GET /api/accounting/ledger-definitions
      const raw = localStorage.getItem('erp_group_ledger_definitions');
      const defs: Array<{ id: string; allow_commission_base?: boolean }> =
        raw ? JSON.parse(raw) : [];
      return Object.fromEntries(
        defs.filter(d => d.allow_commission_base).map(d => [d.id, true]),
      );
    } catch { return {}; }
  }, []);

  const commissionPreview = useMemo<CommissionResult[]>(() => {
    if (!samCfg?.enableInDeliveryNote || !samCfg?.enableCommissionOnDeliveryNote) return [];
    const assigned = [samSalesmanId, samAgentId]
      .filter(Boolean)
      .map(id => samPersons.find(p => p.id === id))
      .filter((p): p is SAMPerson => !!p);
    if (assigned.length === 0) return [];
    return calculateInvoiceCommission(
      assigned, inventoryLines, [], ledgerFlags, date, samCfg,
    );
  }, [samCfg, samSalesmanId, samAgentId, samPersons, inventoryLines, ledgerFlags, date]);

  const handleCustomerSelect = useCallback((cid: string) => {
    const c = customers.find(x => x.id === cid);
    if (!c) return;
    setCustomerId(cid);
    setPartyName(c.partyName);
  }, [customers]);

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Buyer name is required'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Delivery Note', base_voucher_type: 'Delivery Note',
        entity_id: entityCode, date, party_name: partyName, ref_voucher_no: againstSI,
        vendor_bill_no: '', net_amount: 0, narration,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        from_ledger_name: '', to_ledger_name: '',
        from_godown_name: '', to_godown_name: '',
        ledger_lines: [], inventory_lines: inventoryLines,
        gross_amount: 0, total_discount: 0, total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0,
        total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
        status: 'posted', created_by: 'current-user', created_at: now, updated_at: now,
        so_ref: againstSI || undefined,
      };

      // SAM fields on voucher
      if (samCfg?.enableInDeliveryNote) {
        voucher.sam_salesman_id = samSalesmanId;
        voucher.sam_salesman_name = samSalesmanName;
        voucher.sam_agent_id = samAgentId;
        voucher.sam_agent_name = samAgentName;
      }

      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));

      // Commission booking at DN stage (if configured)
      if (
        samCfg?.enableCommissionOnDeliveryNote &&
        commissionPreview.length > 0
      ) {
        const regStore: CommissionEntry[] = (() => {
          try {
            // [JWT] GET /api/salesx/commission-register
            return JSON.parse(localStorage.getItem(commissionRegisterKey(entityCode)) || '[]');
          } catch { return []; }
        })();

        if (!isCommissionAlreadyBooked(voucher.voucher_no, regStore)) {
          const now2 = new Date().toISOString();
          commissionPreview.forEach(result => {
            const person = samPersons.find(p => p.id === result.person_id);
            const entry: CommissionEntry = {
              id: `cr-dn-${Date.now()}-${result.person_id}`,
              entity_id: entityCode,
              voucher_id: voucher.id,
              voucher_no: voucher.voucher_no,
              voucher_date: voucher.date,
              customer_id: customerId,
              customer_name: partyName,
              person_id: result.person_id,
              person_name: result.person_name,
              person_type: result.person_type,
              person_pan: person?.pan ?? null,
              deductee_type: person?.pan ? 'individual' : 'no_pan',
              invoice_amount: 0,
              base_amount: result.base_amount,
              commission_rate: result.rate_used,
              total_commission: result.commission_amount,
              method: result.method,
              tds_applicable: !!person?.tds_deductible,
              tds_section: person?.tds_section ?? null,
              tds_rate: 0,
              amount_received_to_date: 0,
              commission_earned_to_date: 0,
              tds_deducted_to_date: 0,
              net_paid_to_date: 0,
              payments: [],
              credit_note_amount: 0,
              credit_note_refs: [],
              net_invoice_amount: 0,
              net_total_commission: result.commission_amount,
              commission_expense_ledger_id: person?.commission_expense_ledger_id ?? null,
              commission_expense_ledger_name: person?.commission_expense_ledger_name ?? null,
              commission_expense_voucher_id: null,
              commission_expense_voucher_no: null,
              agent_invoice_no: null, agent_invoice_date: null,
              agent_invoice_gross_amount: null, agent_invoice_gst_amount: null,
              agent_invoice_status: null, agent_invoice_variance: null,
              agent_invoice_dispute_reason: null,
              catchup_tds_required: false, catchup_tds_amount: 0,
              source_document: 'delivery_note',
              bank_payment_voucher_id: null,
              bank_payment_voucher_no: null,
              bank_payment_date: null,
              collection_bonus_earned: false,
              collection_bonus_window_days: 0,
              collection_bonus_amount: 0,
              receipt_within_window: false,
              status: 'pending',
              created_at: now2,
              updated_at: now2,
            };
            regStore.push(entry);
          });
          // [JWT] POST /api/salesx/commission-register
          localStorage.setItem(commissionRegisterKey(entityCode), JSON.stringify(regStore));
          setCommissionBanner(
            `Commission preview recorded for ${commissionPreview.length} person(s). ` +
            `Will be earned on receipt.`,
          );
        }
      }

      toast.success('Delivery Note posted');
    } catch { toast.error('Failed to save'); }
  }, [
    partyName, date, voucherNo, againstSI, inventoryLines, narration, entityCode,
    samCfg, samSalesmanId, samSalesmanName, samAgentId, samAgentName,
    commissionPreview, customerId, samPersons,
  ]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-delivery-note',
        label: `DLN ${partyName || 'New'}`, voucherTypeName: 'Delivery Note',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date]);

  return (
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Delivery Note</h2>
          <p className="text-xs text-muted-foreground">Outward goods dispatch</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{voucherNo}</Badge>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Party (Buyer)</Label>
              <Select value={customerId ?? '__none__'} onValueChange={v => {
                if (v !== '__none__') handleCustomerSelect(v);
              }}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.partyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Against Sales Order</Label>
              <Select value={againstSI || '__none__'} onValueChange={v => setAgainstSI(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select SO (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {openSOs.map(so => (
                    <SelectItem key={so.id} value={so.order_no}>
                      {so.order_no} — {so.party_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SAM assignment selectors */}
      {samCfg?.enableInDeliveryNote && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sales Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {samCfg.enableCompanySalesMan && (
                <div>
                  <Label className="text-xs">Salesman</Label>
                  <Select
                    value={samSalesmanId ?? '__none__'}
                    onValueChange={v => {
                      if (v === '__none__') { setSamSalesmanId(null); setSamSalesmanName(null); return; }
                      const p = samPersons.find(x => x.id === v);
                      setSamSalesmanId(v); setSamSalesmanName(p?.display_name ?? null);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select salesman" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {samPersons
                        .filter(p => p.person_type === 'salesman' && p.is_active)
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {samCfg.enableAgentModule && (
                <div>
                  <Label className="text-xs">Agent</Label>
                  <Select
                    value={samAgentId ?? '__none__'}
                    onValueChange={v => {
                      if (v === '__none__') { setSamAgentId(null); setSamAgentName(null); return; }
                      const p = samPersons.find(x => x.id === v);
                      setSamAgentId(v); setSamAgentName(p?.display_name ?? null);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {samPersons
                        .filter(p => (p.person_type === 'agent' || p.person_type === 'broker') && p.is_active)
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {(samSalesmanName || samAgentName) && (
              <Card className="border-orange-500/20 bg-orange-500/5">
                <CardContent className="pt-3 pb-3 space-y-1 text-xs">
                  <p className="font-semibold text-orange-700">Sales Assignment</p>
                  {samSalesmanName && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Salesman</span>
                      <span>{samSalesmanName}</span>
                    </div>
                  )}
                  {samAgentName && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Agent</span>
                      <span>{samAgentName}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      <InventoryLineGrid lines={inventoryLines} onChange={setInventoryLines} mode="delivery" showTax={false} />

      {/* Commission preview (guarded by enableCommissionOnDeliveryNote) */}
      {samCfg?.enableCommissionOnDeliveryNote && commissionPreview.length > 0 && (
        <Collapsible defaultOpen>
          <Card className="border-orange-500/30">
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-orange-700 hover:bg-orange-500/5 rounded-t-lg">
                Commission Preview (at Delivery Note stage)
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-3 space-y-1">
                {commissionPreview.map(r => (
                  <div key={r.person_id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                    <span><span className="font-medium">{r.person_name}</span><span className="text-muted-foreground ml-2">({r.person_type})</span></span>
                    <span className="font-mono font-semibold text-orange-600">
                      ₹{r.commission_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground pt-1">
                  Pending until receipt collected. No GL entry at this stage.
                </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {commissionBanner && (
        <Alert className="border-orange-500/30 bg-orange-500/5">
          <AlertDescription className="text-xs text-orange-700">
            ✓ {commissionBanner}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-5 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transport Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Transporter Name</Label>
              <Input value={transporterName} onChange={e => setTransporterName(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Vehicle No</Label>
              <Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} onKeyDown={onEnterNext} placeholder="MH 01 AB 1234" />
            </div>
            <div>
              <Label className="text-xs">Driver Contact</Label>
              <Input value={driverNo} onChange={e => setDriverNo(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Distance (km)</Label>
              <Input type="number" value={distance} onChange={e => setDistance(e.target.value)} onKeyDown={onEnterNext} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="Delivery narration" />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        {onSaveDraft && <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>}
        <Button variant="outline" onClick={() => toast.info('Discarded')}>Cancel</Button>
        <Button data-primary onClick={handlePost}><Send className="h-4 w-4 mr-2" />Post</Button>
      </div>
    </div>
  );
}

export default function DeliveryNote() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Delivery Note' }]} showDatePicker={false} showCompany={false} />
        <main><DeliveryNotePanel /></main>
      </div>
    </SidebarProvider>
  );
}
