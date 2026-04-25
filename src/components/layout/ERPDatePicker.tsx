import { useState } from 'react';
import { CalendarIcon, ChevronDown, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useGlobalDateRange } from '@/hooks/GlobalDateRangeContext';
import { PRESET_LABELS, type DatePreset } from '@/hooks/useGlobalDateRange.types';
import type { DateRange as RDPRange } from 'react-day-picker';

const PRESET_GROUPS: { label: string; presets: DatePreset[] }[] = [
  { label: 'Daily', presets: ['today', 'yesterday'] },
  { label: 'Weekly', presets: ['this_week', 'last_week'] },
  { label: 'Monthly', presets: ['this_month', 'last_month'] },
  { label: 'Quarterly', presets: ['this_quarter', 'last_quarter'] },
  { label: 'Rolling', presets: ['last_7_days', 'last_30_days', 'last_90_days'] },
  { label: 'Financial Year', presets: ['cur_fy', 'pre_fy'] },
];

export function ERPDatePicker() {
  const dr = useGlobalDateRange();
  const [open, setOpen] = useState(false);

  // Label shown on the button — always visible like Tally's period indicator
  const displayLabel = dr.preset !== 'custom'
    ? PRESET_LABELS[dr.preset]
    : `${format(dr.range.from, 'dd MMM yy')} – ${format(dr.range.to, 'dd MMM yy')}`;

  function handlePreset(key: DatePreset) {
    dr.setPreset(key);
    if (key !== 'custom') setOpen(false);
  }

  function handleCalendar(range: RDPRange | undefined) {
    if (range?.from && range?.to) dr.setCustomRange(range.from, range.to);
    else if (range?.from) dr.setCustomRange(range.from, range.from);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-8 gap-1.5 text-xs bg-muted/30 border-border hover:bg-muted/50 font-normal'>
          <CalendarIcon className='h-3.5 w-3.5 text-muted-foreground' />
          {/* Period label — always visible like Tally */}
          <span className='font-medium whitespace-nowrap hidden sm:inline'>{displayLabel}</span>
          <Badge variant='secondary' className='text-[9px] px-1 py-0 h-4 hidden md:inline-flex font-mono'>
            {dr.durationDays}d
          </Badge>
          {dr.crossesFY && <AlertTriangle className='h-3 w-3 text-warning hidden md:block' />}
          <ChevronDown className='h-3 w-3 text-muted-foreground' />
        </Button>
      </PopoverTrigger>

      <PopoverContent className='w-auto p-0' align='start' sideOffset={8}>
        <div className='flex'>
          {/* Left: FY Selector + Preset Groups */}
          <div className='w-44 border-r border-border p-2 space-y-1'>
            {/* FY selector */}
            <div className='px-1 pb-2'>
              <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1'>
                Financial Year
              </p>
              <Select value={dr.selectedFY} onValueChange={dr.setSelectedFY}>
                <SelectTrigger className='h-7 text-xs'><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dr.availableFYs.map(fy => (
                    <SelectItem key={fy} value={fy} className='text-xs'>{fy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            {/* Preset groups */}
            {PRESET_GROUPS.map(group => (
              <div key={group.label}>
                <p className='text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1'>
                  {group.label}
                </p>
                {group.presets.map(key => (
                  <button
                    key={key}
                    onClick={() => handlePreset(key)}
                    className={cn(
                      'w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors',
                      dr.preset === key
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-muted/50 text-foreground'
                    )}>
                    {PRESET_LABELS[key]}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Right: Date inputs + calendar */}
          <div className='p-3'>
            {/* From / To display */}
            <div className='flex items-center gap-2 mb-3'>
              {[{label:'From',d:dr.range.from},{label:'To',d:dr.range.to}].map(({label,d}) => (
                <div key={label} className='flex-1'>
                  <p className='text-[10px] text-muted-foreground mb-1'>{label}</p>
                  <div className='text-xs px-2 py-1.5 rounded-md border bg-primary/10 border-primary/30 font-medium font-mono'>
                    {format(d, 'dd MMM yyyy')}
                  </div>
                </div>
              ))}
            </div>
            <div className='mt-4'>
              <Badge variant='outline' className='text-[10px] font-mono'>
                <Clock className='h-2.5 w-2.5 mr-1' />
                {dr.durationDays}d
              </Badge>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {dr.crossesFY && (
          <div className='flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded-md bg-warning/10 border border-warning/30'>
            <AlertTriangle className='h-3 w-3 text-warning shrink-0' />
            <p className='text-[10px] text-warning'>Range crosses Financial Year boundary</p>
          </div>
        )}
        {dr.isFuture && (
          <div className='flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/30'>
            <Clock className='h-3 w-3 text-blue-500 shrink-0' />
            <p className='text-[10px] text-blue-500'>End date is in the future — data may be incomplete</p>
          </div>
        )}

        {/* 2-month calendar */}
        <Calendar
          mode='range'
          selected={{ from: dr.range.from, to: dr.range.to }}
          onSelect={handleCalendar}
          numberOfMonths={2}
          initialFocus
        />

        {/* Comparison mode slot — Phase 2 */}
        {/* <ComparisonPanel /> will be inserted here when reports are built */}
        <div className='flex justify-between items-center mt-3 pt-3 border-t border-border'>
          <p className='text-[10px] text-muted-foreground italic'>
            Comparison mode available in Phase 2 (reports)
          </p>
          <Button size='sm' className='h-7 text-xs' onClick={() => setOpen(false)}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
