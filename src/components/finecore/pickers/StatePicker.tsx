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

export interface StateRow {
  code: string;        // '27'
  name: string;        // 'Maharashtra'
  type: 'state' | 'ut';
}

// Complete list — 28 states + 8 UTs. GST state codes per GSTN portal.
export const INDIA_STATES: StateRow[] = [
  { code: '01', name: 'Jammu & Kashmir', type: 'ut' },
  { code: '02', name: 'Himachal Pradesh', type: 'state' },
  { code: '03', name: 'Punjab', type: 'state' },
  { code: '04', name: 'Chandigarh', type: 'ut' },
  { code: '05', name: 'Uttarakhand', type: 'state' },
  { code: '06', name: 'Haryana', type: 'state' },
  { code: '07', name: 'Delhi', type: 'ut' },
  { code: '08', name: 'Rajasthan', type: 'state' },
  { code: '09', name: 'Uttar Pradesh', type: 'state' },
  { code: '10', name: 'Bihar', type: 'state' },
  { code: '11', name: 'Sikkim', type: 'state' },
  { code: '12', name: 'Arunachal Pradesh', type: 'state' },
  { code: '13', name: 'Nagaland', type: 'state' },
  { code: '14', name: 'Manipur', type: 'state' },
  { code: '15', name: 'Mizoram', type: 'state' },
  { code: '16', name: 'Tripura', type: 'state' },
  { code: '17', name: 'Meghalaya', type: 'state' },
  { code: '18', name: 'Assam', type: 'state' },
  { code: '19', name: 'West Bengal', type: 'state' },
  { code: '20', name: 'Jharkhand', type: 'state' },
  { code: '21', name: 'Odisha', type: 'state' },
  { code: '22', name: 'Chhattisgarh', type: 'state' },
  { code: '23', name: 'Madhya Pradesh', type: 'state' },
  { code: '24', name: 'Gujarat', type: 'state' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu', type: 'ut' },
  { code: '27', name: 'Maharashtra', type: 'state' },
  { code: '28', name: 'Andhra Pradesh (Old)', type: 'state' },
  { code: '29', name: 'Karnataka', type: 'state' },
  { code: '30', name: 'Goa', type: 'state' },
  { code: '31', name: 'Lakshadweep', type: 'ut' },
  { code: '32', name: 'Kerala', type: 'state' },
  { code: '33', name: 'Tamil Nadu', type: 'state' },
  { code: '34', name: 'Puducherry', type: 'ut' },
  { code: '35', name: 'Andaman & Nicobar Islands', type: 'ut' },
  { code: '36', name: 'Telangana', type: 'state' },
  { code: '37', name: 'Andhra Pradesh', type: 'state' },
  { code: '38', name: 'Ladakh', type: 'ut' },
  { code: '97', name: 'Other Territory', type: 'ut' },
  { code: '99', name: 'Centre Jurisdiction', type: 'ut' },
];

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
