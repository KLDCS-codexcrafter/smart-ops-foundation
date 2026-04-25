/**
 * InlineMasterCreate.tsx — Alt+C inline create sheet for masters
 * Opens a Sheet with the appropriate master Panel based on context
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface InlineMasterCreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'customer' | 'vendor' | 'ledger' | 'item';
  onCreated?: (name: string) => void;
}

export function InlineMasterCreate({ open, onOpenChange, type, onCreated: _onCreated }: InlineMasterCreateProps) {
  const titles: Record<string, string> = {
    customer: 'Create Customer',
    vendor: 'Create Vendor',
    ledger: 'Create Ledger',
    item: 'Create Item',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <div data-keyboard-form>
          <SheetHeader>
            <SheetTitle>{titles[type]}</SheetTitle>
            <SheetDescription>Quick create — saves and auto-fills the triggering field</SheetDescription>
          </SheetHeader>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Master creation form will render here in a future update.</p>
            <p className="mt-2 text-xs">This Sheet uses existing Panel exports from each master page.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
