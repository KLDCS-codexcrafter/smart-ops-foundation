/**
 * DepartmentPicker.tsx — Division-grouped department picker.
 *
 * PURPOSE      Stock Transfer Dispatch has 2 department fields (source + dest).
 *              Journal Voucher optionally uses one. Future inventory + payroll
 *              vouchers also need departments.
 *
 * INPUT        value (department_id), onChange, placeholder?, excludeId?,
 *              showInactive?, compact?
 * OUTPUT       onChange(department_id, department_name, division_id?)
 *
 * DEPENDENCIES shadcn Command + Popover + Badge + useOrgStructure hook
 * SPEC DOC     Sprint T10-pre.1b Session A
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
import { useOrgStructure } from '@/hooks/useOrgStructure';

export interface DepartmentPickerOptions {
  value: string;
  onChange: (departmentId: string, departmentName: string, divisionId?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  compact?: boolean;
  /** Hide this department from the list (e.g. dest-picker excludes source dept). */
  excludeId?: string;
  /** Default false — only active departments are shown. */
  showInactive?: boolean;
}

export function DepartmentPicker({
  value, onChange, placeholder = 'Select department',
  disabled, id, compact, excludeId, showInactive = false,
}: DepartmentPickerOptions) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { departments, divisions } = useOrgStructure();

  const divisionMap = useMemo(() => {
    const m = new Map<string, string>();
    divisions.forEach(d => m.set(d.id, d.name));
    return m;
  }, [divisions]);

  const filtered = useMemo(() => {
    let list = departments;
    if (!showInactive) list = list.filter(d => d.status === 'active');
    if (excludeId) list = list.filter(d => d.id !== excludeId);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(s) ||
        (d.code ?? '').toLowerCase().includes(s),
      );
    }
    return list;
  }, [departments, showInactive, excludeId, search]);

  const selected = useMemo(() => departments.find(d => d.id === value), [departments, value]);
  const selectedDivisionName = selected?.division_id
    ? divisionMap.get(selected.division_id)
    : undefined;

  const handleSelect = useCallback((deptId: string, deptName: string, divId: string | null) => {
    onChange(deptId, deptName, divId ?? undefined);
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
              {selectedDivisionName && (
                <Badge variant="outline" className="text-[10px]">{selectedDivisionName}</Badge>
              )}
            </span>
          ) : placeholder}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search department..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList className="max-h-[320px]">
            <CommandEmpty className="py-4 text-xs text-muted-foreground">
              No matching department.
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(d => (
                <CommandItem
                  key={d.id}
                  value={d.id}
                  onSelect={() => handleSelect(d.id, d.name, d.division_id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm">{d.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {d.code}
                      {d.division_id && divisionMap.has(d.division_id) && ` · ${divisionMap.get(d.division_id)}`}
                    </span>
                  </div>
                  {value === d.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
