/**
 * LedgerPicker.tsx — Reusable ledger picker for all FinCore vouchers.
 *
 * PURPOSE
 * Replaces raw <Input> text fields for ledger selection. Every voucher screen
 * (Receipt, Payment, Contra, JV, SI, PI, CN, DN) historically used text inputs
 * which provided no validation and allowed typos. This picker enforces
 * master-data integrity.
 *
 * INPUT        value (ledger_id), onChange, entityCode, allowedGroups (filter)
 * OUTPUT       Fires onChange with (ledger_id, ledger_name, ledger_code)
 *
 * DEPENDENCIES shadcn Command + Popover + Button + Badge
 *              InlineMasterCreate for on-the-fly ledger creation
 *
 * TALLY-ON-TOP BEHAVIOR
 * No special mode logic here. Picker reads from erp_group_ledger_definitions_<entity>
 * which is the single source of truth for both standalone and tally_bridge modes.
 * (In tally_bridge mode, the Bridge keeps this store in sync with Tally company.)
 *
 * SPEC DOC     FinCore Voucher Deep Audit (Apr 2026) — master picker gaps section
 */
import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { InlineMasterCreate } from '@/components/finecore/InlineMasterCreate';

/** Minimal projection of a ledger row — works with the existing
 *  erp_group_ledger_definitions_<entity> localStorage shape (untyped in codebase). */
export interface LedgerPickerRow {
  id: string;
  name: string;
  code?: string;
  alias?: string;
  parentGroupCode?: string;
  parentGroupName?: string;
  ledgerType?: string;  // cash | bank | expense | income | asset | liability | ...
  status?: 'active' | 'inactive';
}

interface LedgerPickerProps {
  /** Controlled value — the selected ledger_id. Empty string = no selection. */
  value: string;
  /** Called with the selected row identifiers. */
  onChange: (ledgerId: string, ledgerName: string, ledgerCode?: string) => void;
  /** Entity code to scope ledger read (erp_group_ledger_definitions_<entity>). */
  entityCode: string;
  /** Optional filter: restrict to these parentGroupCodes (e.g. ['CASH', 'BANK']). */
  allowedGroups?: string[];
  /** Optional filter: restrict to these ledgerType values. */
  allowedLedgerTypes?: string[];
  /** Placeholder text. */
  placeholder?: string;
  /** Disable picker. */
  disabled?: boolean;
  /** HTML id for Label association. */
  id?: string;
  /** Render compact (h-8) vs default (h-9). */
  compact?: boolean;
  /** Show "Create new" inline option at end of list. Default: true. */
  allowCreate?: boolean;
}

const LEDGERS_KEY = (e: string) => `erp_group_ledger_definitions_${e}`;
const LEGACY_LEDGERS_KEY = 'erp_group_ledger_definitions';

function loadLedgers(entityCode: string): LedgerPickerRow[] {
  try {
    // [JWT] GET /api/masters/ledgers?entityCode=...
    const scoped = localStorage.getItem(LEDGERS_KEY(entityCode));
    if (scoped) {
      const all = JSON.parse(scoped) as LedgerPickerRow[];
      return all.filter(l => l.status !== 'inactive');
    }
    // Fallback to group-level ledger definitions (entity-setup-service writes here)
    const legacy = localStorage.getItem(LEGACY_LEDGERS_KEY);
    if (!legacy) return [];
    const all = JSON.parse(legacy) as LedgerPickerRow[];
    return all.filter(l => l.status !== 'inactive');
  } catch { return []; }
}

export function LedgerPicker({
  value, onChange, entityCode,
  allowedGroups, allowedLedgerTypes,
  placeholder = 'Select ledger', disabled, id, compact, allowCreate = true,
}: LedgerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Cleanup-1a: `open` intentionally re-triggers loadLedgers so the picker
  // shows ledgers added since last open (e.g., via inline LedgerCreateDialog).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: refresh on dialog open
  const ledgers = useMemo(() => loadLedgers(entityCode), [entityCode, open]);

  const filtered = useMemo(() => {
    let list = ledgers;
    if (allowedGroups && allowedGroups.length > 0) {
      list = list.filter(l => l.parentGroupCode && allowedGroups.includes(l.parentGroupCode));
    }
    if (allowedLedgerTypes && allowedLedgerTypes.length > 0) {
      list = list.filter(l => l.ledgerType && allowedLedgerTypes.includes(l.ledgerType));
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(s) ||
        (l.alias ?? '').toLowerCase().includes(s) ||
        (l.code ?? '').toLowerCase().includes(s),
      );
    }
    return list;
  }, [ledgers, allowedGroups, allowedLedgerTypes, search]);

  const selected = useMemo(() => ledgers.find(l => l.id === value), [ledgers, value]);

  const handleSelect = useCallback((l: LedgerPickerRow) => {
    onChange(l.id, l.name, l.code);
    setOpen(false);
    setSearch('');
  }, [onChange]);

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
                <span className="truncate">{selected.name}</span>
                {selected.alias && <Badge variant="outline" className="text-[10px]">{selected.alias}</Badge>}
              </span>
            ) : placeholder}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search ledger..."
              value={search}
              onValueChange={setSearch}
              className="h-9"
            />
            <CommandList className="max-h-[320px]">
              <CommandEmpty className="py-4 text-xs text-muted-foreground">
                No matching ledger.
                {allowCreate && (
                  <Button variant="link" size="sm" className="ml-1 h-6"
                    onClick={() => {
                      setOpen(false);
                      // TODO (Polish 1.5): remove this toast once InlineMasterCreate ships its real form.
                      toast.info('Ledger creation form coming soon. For now, please create from Ledger Master.');
                      setCreateOpen(true);
                    }}>
                    Create "{search}"
                  </Button>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map(l => (
                  <CommandItem key={l.id} value={l.id} onSelect={() => handleSelect(l)} className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm">{l.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {l.parentGroupName} {l.code && `· ${l.code}`}
                      </span>
                    </div>
                    {value === l.id && <Check className="h-3.5 w-3.5 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
              {allowCreate && filtered.length > 0 && (
                <div className="p-1 border-t">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs"
                    onClick={() => {
                      setOpen(false);
                      // TODO (Polish 1.5): remove this toast once InlineMasterCreate ships its real form.
                      toast.info('Ledger creation form coming soon. For now, please create from Ledger Master.');
                      setCreateOpen(true);
                    }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create new ledger
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
          type="ledger"
          onCreated={() => {
            // InlineMasterCreate (current stub) only signals creation; re-open will reload list
            setCreateOpen(false);
          }}
        />
      )}
    </>
  );
}
