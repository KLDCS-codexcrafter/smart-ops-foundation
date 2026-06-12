/**
 * ItemPicker.tsx — Reusable inventory item picker.
 *
 * Reads erp_inventory_items (same store useInventoryItems hook owns).
 * Used by FinCore line grids to replace plain-text Item inputs.
 *
 * SPEC DOC     T10-pre.2 · W1C-2 Block 2 (consume, don't fork)
 */
import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ItemPickerRow {
  id: string;
  code: string;
  name: string;
  uom?: string;
}

interface ItemPickerProps {
  value: string;
  onChange: (row: ItemPickerRow | null) => void;
  entityCode: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  compact?: boolean;
}

const ITEMS_KEY = 'erp_inventory_items';

function loadItems(_entityCode: string): ItemPickerRow[] {
  try {
    // [JWT] GET /api/inventory/items?entityCode=...
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Array<{
      id: string; code?: string; name?: string; base_uom_id?: string | null;
      base_uom_name?: string | null; uom?: string;
    }>;
    return all.map(it => ({
      id: it.id,
      code: it.code ?? '',
      name: it.name ?? it.code ?? it.id,
      uom: it.uom ?? it.base_uom_name ?? undefined,
    }));
  } catch { return []; }
}

export function ItemPicker({
  value, onChange, entityCode,
  placeholder = 'Select item', disabled, id, compact,
}: ItemPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => loadItems(entityCode), [entityCode, open]);
  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(s) ||
      i.code.toLowerCase().includes(s),
    );
  }, [items, search]);

  const selected = useMemo(() => items.find(i => i.id === value), [items, value]);

  const handleSelect = useCallback((row: ItemPickerRow) => {
    onChange(row);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline" role="combobox" id={id} aria-expanded={open} disabled={disabled}
          className={cn('w-full justify-between font-normal',
            compact ? 'h-8 text-sm' : 'h-9',
            !selected && 'text-muted-foreground')}
          data-testid="item-picker-trigger"
        >
          {selected ? (
            <span className="truncate">{selected.name}</span>
          ) : placeholder}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search item..." value={search} onValueChange={setSearch} className="h-9" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty className="py-4 text-xs text-muted-foreground">
              No matching item.
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(i => (
                <CommandItem key={i.id} value={i.id} onSelect={() => handleSelect(i)} className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm">{i.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {i.code} {i.uom && `· ${i.uom}`}
                    </span>
                  </div>
                  {value === i.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
