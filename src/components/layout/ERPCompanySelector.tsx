import { useCallback } from 'react';
import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ERPCompany {
  id: string;
  name: string;
  gstin?: string;
}

interface ERPCompanySelectorProps {
  companies?: ERPCompany[];
  value: string;
  onChange: (id: string) => void;
}

// Persists company selection across sessions
const STORAGE_KEY = 'erp-selected-company';

export function useERPCompany(): [string, (id: string) => void] {
  const stored = localStorage.getItem(STORAGE_KEY) ?? 'all';
  const set = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
  }, []);
  return [stored, set];
}

export function ERPCompanySelector({ companies = [], value, onChange }: ERPCompanySelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className='w-[180px] h-8 text-xs bg-muted/30 border-border hidden md:flex gap-1.5'>
        <Building2 className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
        <SelectValue placeholder='All Companies' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='all'>
          <span className='text-xs'>All Companies</span>
        </SelectItem>
        {companies.length > 0 && (
          <div className='border-t border-border/50 my-1' />
        )}
        {companies.map(c => (
          <SelectItem key={c.id} value={c.id}>
            <div className='flex flex-col'>
              <span className='text-xs font-medium'>{c.name}</span>
              {c.gstin && <span className='text-[10px] text-muted-foreground font-mono'>{c.gstin}</span>}
            </div>
          </SelectItem>
        ))}
        {/* Division / Branch sub-selector — Phase 2 slot */}
        {/* When Foundation masters are built, a second Select will appear here */}
      </SelectContent>
    </Select>
  );
}
