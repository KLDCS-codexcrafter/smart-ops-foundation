/**
 * @file        src/pages/erp/eximx/masters/CTHRefreshDialog.tsx
 * @purpose     Manual CTH refresh dialog · simulated DGFT/CBIC API
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q6=a manual refresh button
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function CTHRefreshDialog({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refresh CTH Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>Simulated DGFT/CBIC fetch · last refresh: <strong>2026-04-01</strong> · checksum: <code className="font-mono">sha256:cth-seed-v1</code></p>
          <p className="text-muted-foreground">Phase 1 simulated. Real ICEGATE-DGFT API integration in Phase 2 EX-API-1.</p>
        </div>
        <Button onClick={onClose}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh now (simulated)
        </Button>
      </DialogContent>
    </Dialog>
  );
}
