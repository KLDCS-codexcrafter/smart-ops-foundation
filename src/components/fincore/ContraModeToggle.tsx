/**
 * ContraModeToggle.tsx — Bank Transfer / Cash Transfer toggle for Contra entry
 */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContraModeToggleProps {
  mode: 'bank_transfer' | 'cash_transfer';
  onToggle: (mode: 'bank_transfer' | 'cash_transfer') => void;
  hasLines: boolean;
}

export function ContraModeToggle({ mode, onToggle, hasLines }: ContraModeToggleProps) {
  const handleToggle = () => {
    if (hasLines) {
      if (!window.confirm('Switching mode will clear existing entries. Continue?')) return;
    }
    onToggle(mode === 'bank_transfer' ? 'cash_transfer' : 'bank_transfer');
  };

  return (
    <div className="flex items-center gap-1 border rounded-md p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => mode !== 'bank_transfer' && handleToggle()}
        className={cn('h-7 text-xs px-3', mode === 'bank_transfer' && 'bg-primary/10 text-primary')}
      >
        Bank Transfer
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => mode !== 'cash_transfer' && handleToggle()}
        className={cn('h-7 text-xs px-3', mode === 'cash_transfer' && 'bg-primary/10 text-primary')}
      >
        Cash Transfer
      </Button>
    </div>
  );
}
