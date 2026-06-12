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
 * DEPENDENCIES shadcn Command + Popover + Button + Badge + Dialog
 *              Inline create dialog writes through the SAME ledger engine
 *              (erp_group_ledger_definitions key · same record shape) the
 *              LedgerMaster page persists into.
 *
 * SPEC DOC     FinCore Voucher Deep Audit (Apr 2026) — master picker gaps section
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
import { Plus, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface LedgerPickerRow {
  id: string;
  name: string;
  code?: string;
  alias?: string;
  parentGroupCode?: string;
  parentGroupName?: string;
  ledgerType?: string;
  status?: 'active' | 'inactive';
}

interface LedgerPickerProps {
  value: string;
  onChange: (ledgerId: string, ledgerName: string, ledgerCode?: string) => void;
  entityCode: string;
  allowedGroups?: string[];
  allowedLedgerTypes?: string[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  compact?: boolean;
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
    const legacy = localStorage.getItem(LEGACY_LEDGERS_KEY);
    if (!legacy) return [];
    const all = JSON.parse(legacy) as LedgerPickerRow[];
    return all.filter(l => l.status !== 'inactive');
  } catch { return []; }
}

/**
 * Inline-create groups — minimal supported set covering the picker's filter
 * dimension (parentGroupCode / ledgerType pair). Same shape the LedgerMaster
 * page writes via its saveDefinition() helper.
 */
const GROUP_OPTIONS: Array<{ code: string; name: string; ledgerType: string }> = [
  { code: 'CASH',    name: 'Cash-in-Hand',         ledgerType: 'cash' },
  { code: 'BANK',    name: 'Bank Accounts',        ledgerType: 'bank' },
  { code: 'SUNDR-D', name: 'Sundry Debtors',       ledgerType: 'asset' },
  { code: 'SUNDR-C', name: 'Sundry Creditors',     ledgerType: 'liability' },
  { code: 'DIR-EXP', name: 'Direct Expenses',      ledgerType: 'expense' },
  { code: 'IND-EXP', name: 'Indirect Expenses',    ledgerType: 'expense' },
  { code: 'DIR-INC', name: 'Direct Incomes',       ledgerType: 'income' },
  { code: 'IND-INC', name: 'Indirect Incomes',     ledgerType: 'income' },
  { code: 'DUTY',    name: 'Duties & Taxes',       ledgerType: 'duties_tax' },
];

function createLedgerRecord(
  entityCode: string,
  draft: { name: string; groupCode: string },
): LedgerPickerRow {
  const group = GROUP_OPTIONS.find(g => g.code === draft.groupCode) ?? GROUP_OPTIONS[0];
  // [JWT] GET /api/accounting/ledger-definitions
  const raw = localStorage.getItem(LEGACY_LEDGERS_KEY);
  const all = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
  const id = `ldg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const code = 'L-' + String(all.length + 1).padStart(6, '0');
  const record: Record<string, unknown> = {
    id, name: draft.name.trim(), code,
    ledgerType: group.ledgerType,
    parentGroupCode: group.code, parentGroupName: group.name,
    status: 'active',
    entityShortCode: entityCode,
    openingBalance: 0,
  };
  // [JWT] POST /api/accounting/ledger-definitions
  localStorage.setItem(LEGACY_LEDGERS_KEY, JSON.stringify([...all, record]));
  return {
    id, name: String(record.name), code,
    ledgerType: group.ledgerType,
    parentGroupCode: group.code, parentGroupName: group.name,
    status: 'active',
  };
}

export function LedgerPicker({
  value, onChange, entityCode,
  allowedGroups, allowedLedgerTypes,
  placeholder = 'Select ledger', disabled, id, compact, allowCreate = true,
}: LedgerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createReload, setCreateReload] = useState(0);
  const [draftName, setDraftName] = useState('');
  const [draftGroup, setDraftGroup] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ledgers = useMemo(() => loadLedgers(entityCode), [entityCode, open, createReload]);

  const eligibleGroups = useMemo(() => {
    let opts = GROUP_OPTIONS;
    if (allowedGroups && allowedGroups.length > 0) opts = opts.filter(g => allowedGroups.includes(g.code));
    if (allowedLedgerTypes && allowedLedgerTypes.length > 0) opts = opts.filter(g => allowedLedgerTypes.includes(g.ledgerType));
    return opts.length ? opts : GROUP_OPTIONS;
  }, [allowedGroups, allowedLedgerTypes]);

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

  const openCreate = (seedName: string) => {
    setDraftName(seedName);
    setDraftGroup(eligibleGroups[0]?.code ?? '');
    setCreateOpen(true);
    setOpen(false);
  };

  const handleCreate = () => {
    const name = draftName.trim();
    if (!name) { toast.error('Name is required'); return; }
    if (!draftGroup) { toast.error('Group is required'); return; }
    try {
      const created = createLedgerRecord(entityCode, { name, groupCode: draftGroup });
      setCreateOpen(false);
      setCreateReload(n => n + 1);
      onChange(created.id, created.name, created.code);
      toast.success(`Ledger "${name}" created`);
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
                <span className="truncate">{selected.name}</span>
                {selected.alias && <Badge variant="outline" className="text-[10px]">{selected.alias}</Badge>}
              </span>
            ) : placeholder}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search ledger..." value={search} onValueChange={setSearch} className="h-9" />
            <CommandList className="max-h-[320px]">
              <CommandEmpty className="py-4 text-xs text-muted-foreground">
                No matching ledger.
                {allowCreate && (
                  <Button variant="link" size="sm" className="ml-1 h-6" onClick={() => openCreate(search)}>
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
                  <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => openCreate(search)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create new ledger
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {allowCreate && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md" data-testid="ledger-inline-create-dialog">
            <DialogHeader>
              <DialogTitle>Create Ledger</DialogTitle>
              <DialogDescription>Minimal fields · saves through the same ledger store · auto-fills.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="ledger-create-name">Name *</Label>
                <Input id="ledger-create-name" value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Ledger name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ledger-create-group">Group *</Label>
                <Select value={draftGroup} onValueChange={setDraftGroup}>
                  <SelectTrigger id="ledger-create-group"><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {eligibleGroups.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} data-testid="ledger-inline-create-save">Create &amp; select</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
