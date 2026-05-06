/**
 * ViewModeSelector.tsx — Canonical polymorphic dashboard header (D-598)
 * Sprint T-Phase-1.3-3-PlantOps-pre-3a · Block G
 */
import { useEffect } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ViewModeOption<T extends string = string> {
  id: T;
  label: string;
  tooltip?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ViewModeSelectorProps<T extends string = string> {
  value: T;
  onChange: (mode: T) => void;
  options: ViewModeOption<T>[];
  storageKey?: string;
  label?: string;
}

export function ViewModeSelector<T extends string = string>({
  value, onChange, options, storageKey, label,
}: ViewModeSelectorProps<T>): JSX.Element {
  useEffect(() => {
    if (!storageKey) return;
    try {
      // [JWT] GET /api/user-preferences/view-mode/:storageKey
      const stored = localStorage.getItem(storageKey);
      if (stored && options.some(o => o.id === stored)) {
        onChange(stored as T);
      }
    } catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const handleChange = (newValue: string) => {
    if (!newValue) return;
    if (storageKey) {
      try {
        // [JWT] PUT /api/user-preferences/view-mode/:storageKey
        localStorage.setItem(storageKey, newValue);
      } catch { /* silent */ }
    }
    onChange(newValue as T);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <ToggleGroup type="single" value={value} onValueChange={handleChange} size="sm">
          {options.map(opt => {
            const Icon = opt.icon;
            return (
              <Tooltip key={opt.id}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value={opt.id} className="text-xs">
                    {Icon && <Icon className="h-3 w-3 mr-1" />}
                    {opt.label}
                  </ToggleGroupItem>
                </TooltipTrigger>
                {opt.tooltip && (
                  <TooltipContent><p className="text-xs max-w-xs">{opt.tooltip}</p></TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </ToggleGroup>
      </div>
    </TooltipProvider>
  );
}
