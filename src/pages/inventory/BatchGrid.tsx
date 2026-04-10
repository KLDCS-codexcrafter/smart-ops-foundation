import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings2 } from 'lucide-react';
import { useBatches } from '@/hooks/useBatches';
import BatchFormDialog from '@/components/batch-grid/BatchFormDialog';
import BatchList from '@/components/batch-grid/BatchList';
import { BatchRule, DEFAULT_BATCH_RULES } from '@/types/batch-rule';
import type { Batch, BatchFormData } from '@/types/batch';

const BatchGrid: React.FC = () => {
  const { batches, addBatch, updateBatch, deleteBatch } = useBatches();
  const [formOpen, setFormOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);

  const [batchRules, setBatchRules] = useState<BatchRule[]>(DEFAULT_BATCH_RULES);
  // [JWT] Replace with GET /api/inventory/batch-rules
  const [rulesOpen, setRulesOpen] = useState(false);

  const handleCreate = (data: BatchFormData) => {
    const now = new Date().toISOString();
    const newBatch: Batch = {
      ...data,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };
    // [JWT] Replace with POST /api/inventory/batches
    addBatch(newBatch);
  };

  const handleUpdate = (data: BatchFormData) => {
    if (!editBatch) return;
    // [JWT] Replace with PUT /api/inventory/batches/:id
    updateBatch(editBatch.id, data);
    setEditBatch(null);
  };

  const handleEdit = (batch: Batch) => {
    setEditBatch(batch);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    // [JWT] Replace with DELETE /api/inventory/batches/:id
    deleteBatch(id);
  };

  return (
    <AppLayout title="Batch Grid">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Batch Grid</h1>
            <p className="text-sm text-muted-foreground">Manage inventory batches, traceability & QC holds</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRulesOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" /> Batch Rules
            </Button>
            <Button size="sm" onClick={() => { setEditBatch(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Batch
            </Button>
          </div>
        </div>

        <BatchList batches={batches} onEdit={handleEdit} onDelete={handleDelete} />

        <BatchFormDialog
          open={formOpen}
          onOpenChange={open => { setFormOpen(open); if (!open) setEditBatch(null); }}
          onSubmit={editBatch ? handleUpdate : handleCreate}
          editBatch={editBatch}
        />

        {/* Batch Rules Dialog */}
        <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Batch Rules</DialogTitle>
              <DialogDescription>Auto-generation patterns and enforcement settings</DialogDescription>
            </DialogHeader>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Example</TableHead>
                <TableHead>FEFO</TableHead>
                <TableHead>Expiry Warning</TableHead>
                <TableHead>Default</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {batchRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.rule_name}</TableCell>
                    <TableCell className="font-mono">{rule.prefix}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {rule.prefix + '-'
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
                      {rule.is_default &&
                        <Badge variant="outline" className="text-xs">Default</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* [JWT] Full CRUD added when API is ready */}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default BatchGrid;
