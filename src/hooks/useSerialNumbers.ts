import { useState } from 'react';
import { toast } from 'sonner';
import type { SerialNumber, SerialFormData } from '@/types/serial-number';

const STORAGE_KEY = 'erp_serial_numbers';

function loadSerials(): SerialNumber[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveSerials(serials: SerialNumber[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serials));
  // [JWT] Replace with POST/PUT/DELETE /api/inventory/serial-numbers
}

export function useSerialNumbers() {
  const [serials, setSerials] = useState<SerialNumber[]>(loadSerials());
  const [isLoading, setIsLoading] = useState(false);
  // [JWT] Replace with GET /api/inventory/serial-numbers

  const createSerial = (data: SerialFormData) => {
    const newSerial: SerialNumber = {
      ...data,
      id: `serial-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newSerial, ...serials];
    setSerials(updated);
    saveSerials(updated);
    toast.success('Serial number created');
    // [JWT] Replace with POST /api/inventory/serial-numbers
  };

  const updateSerial = (id: string, data: Partial<SerialFormData>) => {
    const updated = serials.map(s =>
      s.id === id ? { ...s, ...data, updated_at: new Date().toISOString() } : s
    );
    setSerials(updated);
    saveSerials(updated);
    toast.success('Serial number updated');
    // [JWT] Replace with PATCH /api/inventory/serial-numbers/:id
  };

  const deleteSerial = (id: string) => {
    const updated = serials.filter(s => s.id !== id);
    setSerials(updated);
    saveSerials(updated);
    toast.success('Serial number deleted');
    // [JWT] Replace with DELETE /api/inventory/serial-numbers/:id
  };

  return { serials, isLoading, createSerial, updateSerial, deleteSerial };
}
