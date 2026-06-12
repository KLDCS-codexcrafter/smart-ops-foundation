/**
 * PartyPicker.tsx — Reusable customer/vendor picker.
 *
 * PURPOSE      Single component serves both customer AND vendor lookup, via `mode` prop.
 * INPUT        value (party_id), onChange, entityCode, mode ('customer'|'vendor'|'both')
 * OUTPUT       Full row including addresses[], gstin, credit-hold flags
 *
 * DEPENDENCIES shadcn Command + Popover + Badge + Dialog
 *              Inline create dialog writes through the SAME master engines
 *              (erp_group_customer_master / erp_group_vendor_master) the full
 *              Customer/Vendor Master forms persist into — same storage key,
 *              same record shape. Picker loadParties is the consume mirror.
 *
 * TALLY-ON-TOP BEHAVIOR
 * Reads master-data stores only (erp_group_customer_master / erp_group_vendor_master).
 * Both standalone and tally_bridge modes share the same master store.
 *
 * SPEC DOC     FinCore Voucher Deep Audit (Apr 2026)
 */
import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, ChevronsUpDown, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface PartyPickerRow {
  id: string;
  partyName: string;
  partyCode?: string;
  gstin?: string;
  pan?: string;
  /** For customers only — affects UI warnings. */
  creditLimit?: number;
  warningLimit?: number;
  credit_hold_mode?: 'off' | 'warning' | 'hard' | null;
  /** From customer/vendor master — array of addresses. */
  addresses?: Array<{
    id: string;
    label: string;
    addressLine: string;
    stateName: string;
    pinCode: string;
    isBilling?: boolean;
    isDefaultShipTo?: boolean;
  }>;
  /** Internal classification — filled by the loader. */
  _partyType: 'customer' | 'vendor' | 'borrowing';
}

export type PartyMode = 'customer' | 'vendor' | 'borrowing' | 'both';

type PartyTypeForMode<M extends PartyMode> =
  M extends 'customer' ? 'customer'
  : M extends 'vendor' ? 'vendor'
  : M extends 'borrowing' ? 'borrowing'
  : 'customer' | 'vendor';

export type PartyPickerRowFor<M extends PartyMode> = Omit<PartyPickerRow, '_partyType'> & {
  _partyType: PartyTypeForMode<M>;
};

interface PartyPickerProps<M extends PartyMode> {
  value: string;
  onChange: (row: PartyPickerRowFor<M> | null) => void;
  entityCode: string;
  mode: M;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  compact?: boolean;
  allowCreate?: boolean;
}

const CUSTOMER_KEY = 'erp_group_customer_master';
const VENDOR_KEY = 'erp_group_vendor_master';

function loadParties(_entityCode: string, mode: PartyMode): PartyPickerRow[] {
  const out: PartyPickerRow[] = [];
  try {
    if (mode === 'customer' || mode === 'both') {
      // [JWT] GET /api/masters/customers?entityCode=...
      const raw = localStorage.getItem(CUSTOMER_KEY);
      if (raw) {
        const rows = JSON.parse(raw) as Omit<PartyPickerRow, '_partyType'>[];
        out.push(...rows.map(r => ({ ...r, _partyType: 'customer' as const })));
      }
    }
    if (mode === 'vendor' || mode === 'both') {
      // [JWT] GET /api/masters/vendors?entityCode=...
      const raw = localStorage.getItem(VENDOR_KEY);
      if (raw) {
        const rows = JSON.parse(raw) as Omit<PartyPickerRow, '_partyType'>[];
        out.push(...rows.map(r => ({ ...r, _partyType: 'vendor' as const })));
      }
    }
    if (mode === 'borrowing') {
      // [JWT] GET /api/accounting/ledger-definitions?type=borrowing
      const raw = localStorage.getItem('erp_group_ledger_definitions');
      if (raw) {
        const all = JSON.parse(raw) as Array<{
          id: string; ledgerType?: string; name?: string; code?: string; status?: string;
        }>;
        const borrowings = all.filter(l => l.ledgerType === 'borrowing' && l.status === 'active');
        for (const b of borrowings) {
          out.push({ id: b.id, partyName: b.name ?? 'Unnamed Borrowing', partyCode: b.code ?? '', _partyType: 'borrowing' });
        }
      }
    }
  } catch { /* ignore */ }
  return out;
}

/** Write a new party through the SAME master storage the full forms persist into. */
function createPartyRecord(
  type: 'customer' | 'vendor',
  draft: { partyName: string; partyType: string; gstin?: string },
): PartyPickerRow {
  const KEY = type === 'customer' ? CUSTOMER_KEY : VENDOR_KEY;
  // [JWT] GET /api/masters/{customers|vendors}
  const raw = localStorage.getItem(KEY);
  const all = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
  const prefix = type === 'customer' ? 'CUS-' : 'VEN-';
  const partyCode = prefix + String(all.length + 1).padStart(6, '0');
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const gstin = (draft.gstin ?? '').trim().toUpperCase();
  const pan = gstin.length >= 12 ? gstin.slice(2, 12) : '';
  const record: Record<string, unknown> = {
    id, partyCode, partyName: draft.partyName.trim(), mailingName: draft.partyName.trim(),
    gstin, pan, cin: '', aadhaar: '',
    contacts: [], addresses: [],
    status: 'active', default_currency: 'INR', country: 'IN',
    openingBalance: 0, creditDays: 0, creditLimit: 0, warningLimit: 0, warningDays: 0,
    modeOfPaymentId: '', termsOfPaymentId: '',
    gstRegistrationType: 'regular', gstStateCode: gstin.slice(0, 2),
    gstFilingType: 'monthly',
    einvoiceApplicable: false, tdsApplicable: false, tdsSection: '',
    defaultBranch: '', businessMode: 'b2b',
    typeOfBusinessEntity: 'other',
    natureOfBusiness: '', businessActivity: '', businessActivityCustom: '',
    operatingScale: '', referredBy: '', associatedDealer: '', otherReference: '',
    businessHours: '', termsOfDeliveryId: '', dispatchMode: '',
    bankAccounts: [], openingBalanceBills: [],
    saleType: 'credit', freightArrangement: 'charged_separately',
    agreedFreightBasis: null, agreedFreightRate: 0, freightRateTolerance: 0,
    defaultTransporterId: '', defaultCourierId: '',
    is_related_party: false, msmeRegistered: false, msmeUdyamNo: '', msmeCategory: null,
    bankAccountHolder: '', bankAccountNo: '', bankIfsc: '', bankName: '',
    bankBranchName: '', bankBranchCity: '',
    lower_deduction_cert: '', lower_deduction_rate: 0, lower_deduction_expiry: '',
    primary_division_id: '', primary_department_id: '',
    lut_number: '', is_tds_deductor: false, tan_number: '',
    territory_id: null, beat_ids: [], latitude: null, longitude: null,
    credit_hold_mode: null, credit_hold_notes: '',
    hierarchy_node_id: null, upstream_customer_id: null, hierarchy_role: null,
    portal_enabled: false,
  };
  record[type === 'customer' ? 'customerType' : 'vendorType'] = draft.partyType;
  // [JWT] POST /api/masters/{customers|vendors}
  localStorage.setItem(KEY, JSON.stringify([...all, record]));
  return {
    id, partyName: String(record.partyName), partyCode, gstin,
    _partyType: type,
  };
}

const CUSTOMER_TYPES = ['manufacturer', 'trader', 'distributor', 'retailer', 'service', 'government', 'other'];
const VENDOR_TYPES = ['manufacturer', 'trader', 'distributor', 'service_provider', 'individual', 'government', 'other'];

export function PartyPicker<M extends PartyMode>({
  value, onChange, entityCode, mode,
  placeholder, disabled, id, compact, allowCreate = true,
}: PartyPickerProps<M>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createReload, setCreateReload] = useState(0);
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState('');
  const [draftGstin, setDraftGstin] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parties = useMemo(() => loadParties(entityCode, mode), [entityCode, mode, open, createReload]);
  const filtered = useMemo(() => {
    if (!search) return parties;
    const s = search.toLowerCase();
    return parties.filter(p =>
      p.partyName.toLowerCase().includes(s) ||
      (p.partyCode ?? '').toLowerCase().includes(s) ||
      (p.gstin ?? '').toLowerCase().includes(s),
    );
  }, [parties, search]);

  const selected = useMemo(() => parties.find(p => p.id === value), [parties, value]);

  const handleSelect = useCallback((p: PartyPickerRow) => {
    onChange(p as PartyPickerRowFor<M>);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const defaultPlaceholder = mode === 'customer' ? 'Select customer'
    : mode === 'vendor' ? 'Select vendor'
    : mode === 'borrowing' ? 'Select loan/borrowing'
    : 'Select party';

  const createType: 'customer' | 'vendor' = mode === 'vendor' ? 'vendor' : 'customer';
  const effectiveAllowCreate = mode === 'borrowing' ? false : allowCreate;
  const typeOptions = createType === 'vendor' ? VENDOR_TYPES : CUSTOMER_TYPES;

  const openCreate = (seedName: string) => {
    setDraftName(seedName);
    setDraftType(typeOptions[0]);
    setDraftGstin('');
    setCreateOpen(true);
    setOpen(false);
  };

  const handleCreate = () => {
    const name = draftName.trim();
    if (!name) { toast.error('Name is required'); return; }
    if (!draftType) { toast.error('Type is required'); return; }
    try {
      const created = createPartyRecord(createType, { partyName: name, partyType: draftType, gstin: draftGstin });
      setCreateOpen(false);
      setCreateReload(n => n + 1);
      onChange(created as PartyPickerRowFor<M>);
      toast.success(`${createType === 'vendor' ? 'Vendor' : 'Customer'} "${name}" created`);
    } catch (e) {
      toast.error(`Failed to create: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline" role="combobox" id={id} aria-expanded={open} disabled={disabled}
            className={cn('w-full justify-between font-normal',
              compact ? 'h-8 text-sm' : 'h-9',
              !selected && 'text-muted-foreground')}
          >
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <span className="truncate">{selected.partyName}</span>
                {selected._partyType === 'vendor' && <Badge variant="outline" className="text-[10px]">Vendor</Badge>}
                {selected._partyType === 'borrowing' && <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-700 border-indigo-500/30">Borrowing</Badge>}
                {selected.credit_hold_mode === 'hard' && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="h-3 w-3" /> Credit Hold
                  </Badge>
                )}
              </span>
            ) : (placeholder ?? defaultPlaceholder)}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search party..." value={search} onValueChange={setSearch} className="h-9" />
            <CommandList className="max-h-[320px]">
              <CommandEmpty className="py-4 text-xs text-muted-foreground">
                No matching party.
                {effectiveAllowCreate && (
                  <Button variant="link" size="sm" className="ml-1 h-6" onClick={() => openCreate(search)}>
                    Create "{search}"
                  </Button>
                )}
                {mode === 'borrowing' && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Create loans via Ledger Master → Borrowing pill.
                  </p>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map(p => (
                  <CommandItem key={p.id} value={p.id} onSelect={() => handleSelect(p)} className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm">{p.partyName}</span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {p._partyType === 'customer' ? 'Customer' : p._partyType === 'vendor' ? 'Vendor' : 'Borrowing'}
                        {p.gstin && ` · GSTIN ${p.gstin}`}
                        {p.partyCode && ` · ${p.partyCode}`}
                      </span>
                    </div>
                    {value === p.id && <Check className="h-3.5 w-3.5 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
              {effectiveAllowCreate && filtered.length > 0 && (
                <div className="p-1 border-t">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => openCreate(search)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create new {createType}
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {effectiveAllowCreate && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md" data-testid="party-inline-create-dialog">
            <DialogHeader>
              <DialogTitle>Create {createType === 'vendor' ? 'Vendor' : 'Customer'}</DialogTitle>
              <DialogDescription>Minimal fields · saves through the same master store · auto-fills.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="party-create-name">Name *</Label>
                <Input id="party-create-name" value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Legal/trade name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-create-type">Type *</Label>
                <Select value={draftType} onValueChange={setDraftType}>
                  <SelectTrigger id="party-create-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-create-gstin">GSTIN (optional)</Label>
                <Input id="party-create-gstin" value={draftGstin} onChange={e => setDraftGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} className="font-mono" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} data-testid="party-inline-create-save">Create &amp; select</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
