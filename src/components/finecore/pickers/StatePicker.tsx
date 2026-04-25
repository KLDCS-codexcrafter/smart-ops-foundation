/**
 * StatePicker.tsx — Indian states + UTs with GST state codes.
 *
 * PURPOSE      Place-of-Supply on Sales Invoice, Purchase Invoice, etc.
 *              GSTIN first 2 digits are the state code — this picker returns both.
 *
 * INPUT        value (state_code like '27'), onChange, placeholder
 * OUTPUT       (state_code, state_name)
 *
 * DEPENDENCIES shadcn Command + Popover
 *
 * TALLY-ON-TOP BEHAVIOR
 * Pure UI; no storage interaction; identical behaviour in both modes.
 *
 * SPEC DOC     FinCore Voucher Deep Audit (Apr 2026) — master picker gaps
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INDIA_STATES } from './StatePicker.types';


interface StatePickerProps {
  value: string;                                        // state_code
  onChange: (stateCode: string, stateName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  compact?: boolean;
}

export function StatePicker({
  value, onChange, placeholder = 'Select state',
  disabled, id, compact,
}: StatePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return INDIA_STATES;
    const s = search.toLowerCase();
    return INDIA_STATES.filter(st =>
      st.name.toLowerCase().includes(s) ||
      st.code.includes(s),
    );
  }, [search]);

  const selected = INDIA_STATES.find(s => s.code === value);

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
              <span className="font-mono text-xs text-muted-foreground">{selected.code}</span>
              <span className="truncate">{selected.name}</span>
            </span>
          ) : placeholder}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search state / code..." value={search} onValueChange={setSearch} className="h-9" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty className="py-4 text-xs text-muted-foreground">No match.</CommandEmpty>
            <CommandGroup>
              {filtered.map(st => (
                <CommandItem key={st.code} value={st.code}
                  onSelect={() => { onChange(st.code, st.name); setOpen(false); setSearch(''); }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground w-8">{st.code}</span>
                    <span className="truncate text-sm">{st.name}</span>
                  </div>
                  {value === st.code && <Check className="h-3.5 w-3.5 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
