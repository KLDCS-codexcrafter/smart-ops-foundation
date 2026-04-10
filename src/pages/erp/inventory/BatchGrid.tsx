import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Grid3X3, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableRow, TableHead, TableHeader, TableCell } from '@/components/ui/table';
import { BatchRule, DEFAULT_BATCH_RULES } from '@/types/batch-rule';
import { BatchList } from '@/components/batch-grid/BatchList';

/** Panel variant — renders inside CommandCenterPage without SidebarProvider/ERPHeader wrapper */
export function BatchGridPanel() {
  const [batchRules] = useState<BatchRule[]>(DEFAULT_BATCH_RULES);
  // [JWT] Replace with GET /api/inventory/batch-rules
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3X3 className="h-6 w-6" /> Batch Grid
          </h1>
          <p className="text-sm text-muted-foreground">
            Batch tracking, lot numbers, QC hold and expiry management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRulesOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> Batch Rules
          </Button>
        </div>
      </div>
      <BatchList />

      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Batch Rules</DialogTitle>
            <DialogDescription>Auto-generation patterns and enforcement settings</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Format Example</TableHead>
                <TableHead>FEFO</TableHead>
                <TableHead>Expiry Warning</TableHead>
                <TableHead>Default</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchRules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.rule_name}</TableCell>
                  <TableCell className="font-mono">{rule.prefix}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {rule.prefix
                      + '-'
                      + (rule.include_year ? new Date().getFullYear().toString().slice(-2) : '')
                      + (rule.include_month ? String(new Date().getMonth() + 1).padStart(2, '0') : '')
                      + '-' + '0'.repeat(rule.sequence_digits - 1) + '1'}
                  </TableCell>
                  <TableCell>
                    {rule.fefo_enforcement
                      ? <Badge className="text-xs">ON</Badge>
                      : <Badge variant="secondary" className="text-xs">OFF</Badge>}
                  </TableCell>
                  <TableCell>{rule.expiry_warning_days} days</TableCell>
                  <TableCell>
                    {rule.is_default && <Badge variant="outline" className="text-xs">Default</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* [JWT] Full CRUD when API is ready */}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BatchGrid() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1 p-6">
          <BatchGridPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
