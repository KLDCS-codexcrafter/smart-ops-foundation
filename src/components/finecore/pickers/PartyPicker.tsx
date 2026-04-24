/**
 * PartyPicker.tsx — Reusable customer/vendor picker.
 *
 * PURPOSE      Single component serves both customer AND vendor lookup, via `mode` prop.
 * INPUT        value (party_id), onChange, entityCode, mode ('customer'|'vendor'|'both')
 * OUTPUT       Full row including addresses[], gstin, credit-hold flags
 *
 * DEPENDENCIES shadcn Command + Popover + Badge
 *              InlineMasterCreate for on-the-fly party creation
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
import { Plus, ChevronsUpDown, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { InlineMasterCreate } from '@/components/finecore/InlineMasterCreate';

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

/**
 * Maps a PartyMode literal to the `_partyType` discriminant rows it can yield.
 * T-H1.5-D-D3: lets existing call sites (Receipt mode='customer', JournalEntry
 * mode='both') keep their narrower setState typings without modification.
 */
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

function loadParties(_entityCode: string, mode: PartyMode): PartyPickerRow[] {
  const out: PartyPickerRow[] = [];
  try {
    if (mode === 'customer' || mode === 'both') {
      // [JWT] GET /api/masters/customers?entityCode=...
      const raw = localStorage.getItem('erp_group_customer_master');
      if (raw) {
        const rows = JSON.parse(raw) as Omit<PartyPickerRow, '_partyType'>[];
        out.push(...rows.map(r => ({ ...r, _partyType: 'customer' as const })));
      }
    }
    if (mode === 'vendor' || mode === 'both') {
      // [JWT] GET /api/masters/vendors?entityCode=...
      const raw = localStorage.getItem('erp_group_vendor_master');
      if (raw) {
        const rows = JSON.parse(raw) as Omit<PartyPickerRow, '_partyType'>[];
        out.push(...rows.map(r => ({ ...r, _partyType: 'vendor' as const })));
      }
    }
    // T-H1.5-D-D3: borrowing mode loads from ledger-definitions
    if (mode === 'borrowing') {
      // [JWT] GET /api/accounting/ledger-definitions?type=borrowing
      const raw = localStorage.getItem('erp_group_ledger_definitions');
      if (raw) {
        const all = JSON.parse(raw) as Array<{
          id: string;
          ledgerType?: string;
          name?: string;
          code?: string;
          status?: string;
        }>;
        const borrowings = all.filter(l =>
          l.ledgerType === 'borrowing' && l.status === 'active',
        );
        for (const b of borrowings) {
          out.push({
            id: b.id,
            partyName: b.name ?? 'Unnamed Borrowing',
            partyCode: b.code ?? '',
            _partyType: 'borrowing',
          });
        }
      }
    }
  } catch { /* ignore */ }
  return out;
}

export function PartyPicker<M extends PartyMode>({
  value, onChange, entityCode, mode,
  placeholder, disabled, id, compact, allowCreate = true,
}: PartyPickerProps<M>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const parties = useMemo(() => loadParties(entityCode, mode), [entityCode, mode, open]);
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
  // T-H1.5-D-D3: borrowing mode cannot inline-create — InlineMasterCreate has no
  // 'borrowing' branch and we will not fork it. Direct users to LedgerMaster.
  const effectiveAllowCreate = mode === 'borrowing' ? false : allowCreate;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            id={id}
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              compact ? 'h-8 text-sm' : 'h-9',
              !selected && 'text-muted-foreground',
            )}
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
                  <Button variant="link" size="sm" className="ml-1 h-6"
                    onClick={() => {
                      setOpen(false);
                      // TODO (Polish 1.5): remove this toast once InlineMasterCreate ships its real form.
                      toast.info('Party creation form coming soon. For now, please create from Customer/Vendor Master.');
                      setCreateOpen(true);
                    }}>
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
              {allowCreate && filtered.length > 0 && (
                <div className="p-1 border-t">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs"
                    onClick={() => {
                      setOpen(false);
                      // TODO (Polish 1.5): remove this toast once InlineMasterCreate ships its real form.
                      toast.info('Party creation form coming soon. For now, please create from Customer/Vendor Master.');
                      setCreateOpen(true);
                    }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create new {createType}
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {allowCreate && (
        <InlineMasterCreate
          open={createOpen}
          onOpenChange={setCreateOpen}
          type={createType}
          onCreated={() => {
            setCreateOpen(false);
          }}
        />
      )}
    </>
  );
}
