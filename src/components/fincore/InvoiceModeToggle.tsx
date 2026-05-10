/**
 * InvoiceModeToggle.tsx — Item Invoice / Accounting Invoice toggle
 */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InvoiceModeToggleProps {
  mode: 'item' | 'accounting';
  onToggle: (mode: 'item' | 'accounting') => void;
  hasLines: boolean;
}

export function InvoiceModeToggle({ mode, onToggle, hasLines }: InvoiceModeToggleProps) {
  const handleToggle = () => {
    if (hasLines) {
      if (!window.confirm('Switching mode will clear existing lines. Continue?')) return;
    }
    onToggle(mode === 'item' ? 'accounting' : 'item');
  };

  return (
    <div className="flex items-center gap-1 border rounded-md p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => mode !== 'item' && handleToggle()}
        className={cn('h-7 text-xs px-3', mode === 'item' && 'bg-primary/10 text-primary')}
      >
        Item Invoice
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => mode !== 'accounting' && handleToggle()}
        className={cn('h-7 text-xs px-3', mode === 'accounting' && 'bg-primary/10 text-primary')}
      >
        Accounting Invoice
      </Button>
    </div>
  );
}
