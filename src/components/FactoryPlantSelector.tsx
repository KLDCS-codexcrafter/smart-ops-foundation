/**
 * FactoryPlantSelector.tsx — Sticky CC top-bar factory selector (D-574)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1
 */
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Factory as FactoryIcon } from 'lucide-react';
import { useOptionalFactoryContext } from '@/contexts/FactoryContext';

export function FactoryPlantSelector(): JSX.Element | null {
  const ctx = useOptionalFactoryContext();
  if (!ctx) return null;
  const { allFactories, selectedFactoryId, selectFactory, template } = ctx;

  if (allFactories.length === 0) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <FactoryIcon className="h-3 w-3" />
        No factories
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <FactoryIcon className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedFactoryId ?? ''} onValueChange={selectFactory}>
        <SelectTrigger className="w-64 h-8 text-xs">
          <SelectValue placeholder="Select factory..." />
        </SelectTrigger>
        <SelectContent>
          {allFactories.map(f => (
            <SelectItem key={f.id} value={f.id} className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono">{f.code}</span>
                <span>{f.name}</span>
                {!f.manufacturing_config && (
                  <Badge variant="outline" className="text-[10px]">Unconfigured</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {template && <Badge variant="outline" className="text-[10px]">{template.name}</Badge>}
    </div>
  );
}
