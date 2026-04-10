import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSerialNumbers } from '@/hooks/useSerialNumbers';
import SerialFormDialog from '@/components/serial-grid/SerialFormDialog';
import SerialList from '@/components/serial-grid/SerialList';
import SerialViewDialog from '@/components/serial-grid/SerialViewDialog';
import SerialStatsCards from '@/components/serial-grid/SerialStatsCards';
import type { SerialNumber, SerialFormData } from '@/types/serial-number';

const SerialGrid: React.FC = () => {
  const { serials, addSerial, updateSerial, deleteSerial } = useSerialNumbers();
  const [formOpen, setFormOpen] = useState(false);
  const [editSerial, setEditSerial] = useState<SerialNumber | null>(null);
  const [viewSerial, setViewSerial] = useState<SerialNumber | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const handleCreate = (data: SerialFormData) => {
    const now = new Date().toISOString();
    // [JWT] Replace with POST /api/inventory/serial-numbers
    addSerial({ ...data, id: crypto.randomUUID(), created_at: now, updated_at: now });
  };

  const handleUpdate = (data: SerialFormData) => {
    if (!editSerial) return;
    // [JWT] Replace with PUT /api/inventory/serial-numbers/:id
    updateSerial(editSerial.id, data);
    setEditSerial(null);
  };

  const handleEdit = (s: SerialNumber) => { setEditSerial(s); setFormOpen(true); };
  const handleView = (s: SerialNumber) => { setViewSerial(s); setViewOpen(true); };
  const handleDelete = (id: string) => {
    // [JWT] Replace with DELETE /api/inventory/serial-numbers/:id
    deleteSerial(id);
  };

  return (
    <AppLayout title="Serial Grid">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Serial Grid</h1>
            <p className="text-sm text-muted-foreground">Track individual serialised units with extended identity fields</p>
          </div>
          <Button size="sm" onClick={() => { setEditSerial(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Serial
          </Button>
        </div>

        <SerialStatsCards serials={serials} />
        <SerialList serials={serials} onEdit={handleEdit} onDelete={handleDelete} onView={handleView} />

        <SerialFormDialog
          open={formOpen}
          onOpenChange={open => { setFormOpen(open); if (!open) setEditSerial(null); }}
          onSubmit={editSerial ? handleUpdate : handleCreate}
          editSerial={editSerial}
        />
        <SerialViewDialog open={viewOpen} onOpenChange={setViewOpen} serial={viewSerial} />
      </div>
    </AppLayout>
  );
};

export default SerialGrid;
