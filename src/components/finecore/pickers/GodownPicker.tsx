/**
 * GodownPicker.tsx — Reusable godown picker with optional sub-location support.
 *
 * PURPOSE      Every inventory voucher (Stock Adjustment, Stock Transfer, GRN,
 *              DLN, Mfg JV) picks a godown. This picker also exposes optional
 *              filters (ownership, excludeId) for transfer-style screens.
 *
 * INPUT        value (godown_id), onChange, entityCode, ownershipFilter?,
 *              excludeId?, compact?, disabled?
 * OUTPUT       onChange(godown_id, godown_name)
 *
 * DEPENDENCIES shadcn Command + Popover + Badge
 * SPEC DOC     Sprint T10-pre.1b Session A — per FinCore Voucher Deep Audit gap
 */
import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Godown, GodownOwnershipType } from '@/types/godown';
import { OWNERSHIP_LABELS } from '@/types/godown';

export interface GodownPickerOptions {
  value: string;
  onChange: (godownId: string, godownName: string) => void;
  entityCode: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  compact?: boolean;
  /** Filter to specific ownership types. */
  ownershipFilter?: GodownOwnershipType[];
  /** Hide one godown (e.g. source godown when picking destination). */
  excludeId?: string;
}

function loadGodowns(entityCode: string): Godown[] {
  try {
    // [JWT] GET /api/masters/godowns?entityCode=...
    const raw = localStorage.getItem(`erp_group_godowns_${entityCode}`)
      ?? localStorage.getItem('erp_group_godowns')
      ?? localStorage.getItem('erp_godowns');
    if (!raw) return [];
    const rows = JSON.parse(raw) as Godown[];
    return rows.filter(g => g.status !== 'inactive');
  } catch { return []; }
}

export function GodownPicker({
  value, onChange, entityCode,
  placeholder = 'Select godown', disabled, id, compact,
  ownershipFilter, excludeId,
}: GodownPickerOptions) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const godowns = useMemo(() => loadGodowns(entityCode), [entityCode]);

  const filtered = useMemo(() => {
    let list = godowns;
    if (excludeId) list = list.filter(g => g.id !== excludeId);
    if (ownershipFilter && ownershipFilter.length > 0) {
      list = list.filter(g => g.ownership_type && ownershipFilter.includes(g.ownership_type));
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(g =>
        g.name.toLowerCase().includes(s) ||
        (g.code ?? '').toLowerCase().includes(s),
      );
    }
    return list;
  }, [godowns, ownershipFilter, excludeId, search]);

  const selected = useMemo(() => godowns.find(g => g.id === value), [godowns, value]);

  const handleSelect = useCallback((g: Godown) => {
    onChange(g.id, g.name);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  return (
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
              {selected.ownership_type && (
                <Badge variant="outline" className="text-[10px]">
                  {OWNERSHIP_LABELS[selected.ownership_type].split(' - ')[0]}
                </Badge>
              )}
            </span>
          ) : placeholder}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search godown..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList className="max-h-[320px]">
            <CommandEmpty className="py-4 text-xs text-muted-foreground">
              No matching godown.
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(g => (
                <CommandItem
                  key={g.id}
                  value={g.id}
                  onSelect={() => handleSelect(g)}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm">{g.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {g.code && `${g.code} · `}
                      {g.ownership_type && OWNERSHIP_LABELS[g.ownership_type]}
                    </span>
                  </div>
                  {value === g.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
