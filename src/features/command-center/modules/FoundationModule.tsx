import { Database } from 'lucide-react';

export function FoundationModule() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
        <Database className="w-7 h-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Foundation Masters</h2>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
        Foundation masters are being designed module by module.
        This section will be activated as each master is
        designed and handed over to the developer.
      </p>
      <p className="text-xs text-muted-foreground/60 mt-4">
        Organisation · Geography · Accounting · Inventory · Sales · HR
      </p>
    </div>
  );
}
