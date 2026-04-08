import { useState, useRef } from 'react';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface SmartDateInputProps {
  value: string; // ISO YYYY-MM-DD (empty string if unset)
  onChange: (iso: string) => void;
  placeholder?: string; // default: DD/MM/YYYY
  disabled?: boolean;
  className?: string;
}

// Parse DD/MM/YYYY display string → Date object (null if invalid)
function parseDisplay(s: string): Date | null {
  const clean = s.replace(/\D/g, '');
  if (clean.length < 8) return null;
  const d = parseInt(clean.slice(0, 2)), m = parseInt(clean.slice(2, 4)) - 1;
  const y = clean.length === 8
    ? parseInt(clean.slice(4, 8))
    : parseInt('20' + clean.slice(4, 6));
  const dt = new Date(y, m, d);
  if (isNaN(dt.getTime()) || dt.getDate() !== d || dt.getMonth() !== m) return null;
  return dt;
}

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function dateToIso(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(iso: string, n: number): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return iso;
  dt.setDate(dt.getDate() + n);
  return dateToIso(dt);
}

export function SmartDateInput({
  value, onChange, placeholder = 'DD/MM/YYYY', disabled, className
}: SmartDateInputProps) {
  const [raw, setRaw] = useState(isoToDisplay(value));
  const [error, setError] = useState('');
  const [calOpen, setCalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Strip non-digits and existing slashes, then reformat
    const digits = rawVal.replace(/\D/g, '').slice(0, 8);
    let display = digits;
    if (digits.length > 2) display = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) display = display.slice(0, 5) + '/' + display.slice(5);
    setRaw(display);
    setError('');
    if (digits.length === 8) {
      const dt = parseDisplay(display);
      if (dt) { onChange(dateToIso(dt)); setError(''); }
      else setError('Invalid date');
    } else if (digits.length === 6) {
      // 6 digits: assume DD/MM/YY → 20YY
      const dt = parseDisplay(display + new Date().getFullYear().toString().slice(0, 2));
      if (dt) { onChange(dateToIso(dt)); }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const today = new Date();
    if (e.key === 'T' || e.key === 't') {
      e.preventDefault();
      const iso = dateToIso(today);
      setRaw(isoToDisplay(iso)); onChange(iso); setError('');
    } else if (e.key === 'Y' || e.key === 'y') {
      e.preventDefault();
      const dt = new Date(today); dt.setDate(today.getDate() - 1);
      const iso = dateToIso(dt);
      setRaw(isoToDisplay(iso)); onChange(iso); setError('');
    } else if (e.key === '+' && value) {
      e.preventDefault();
      const iso = addDays(value, 1);
      setRaw(isoToDisplay(iso)); onChange(iso);
    } else if (e.key === '-' && value) {
      e.preventDefault();
      const iso = addDays(value, -1);
      setRaw(isoToDisplay(iso)); onChange(iso);
    }
  };

  const handleBlur = () => {
    if (!raw) { onChange(''); return; }
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 6) {
      const dt = parseDisplay(raw);
      if (dt) { const iso = dateToIso(dt); setRaw(isoToDisplay(iso)); onChange(iso); setError(''); }
      else setError('Invalid date — use DD/MM/YYYY');
    }
  };

  const calSelected = value ? new Date(value) : undefined;

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center border border-input rounded-md bg-background
        focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2
        px-3 h-10">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={raw}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          maxLength={10}
        />
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="ml-2 text-muted-foreground hover:text-foreground transition-colors" disabled={disabled}>
              <CalendarIcon className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={calSelected}
              onSelect={(d) => {
                if (!d) return;
                const iso = dateToIso(d);
                setRaw(isoToDisplay(iso));
                onChange(iso);
                setError('');
                setCalOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
      {!error && <p className="text-[10px] text-muted-foreground mt-1">T = today · Y = yesterday · + / − to move days</p>}
    </div>
  );
}
