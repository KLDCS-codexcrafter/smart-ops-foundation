import { useState, useEffect } from 'react';
import type { SerialNumber } from '@/types/serial-number';

const STORAGE_KEY = 'erp_serial_numbers';

const SEED: SerialNumber[] = [
  {
    id: 'sn-001', serial_number: 'SN-2026-00001', stock_item_id: 'si-010',
    stock_item_name: 'Samsung Galaxy S24', status: 'available',
    warranty_start_date: '2026-02-01', warranty_end_date: '2027-02-01',
    purchase_date: '2026-01-28', notes: null,
    created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z',
    imei_1: '356938035643809', imei_2: '356938035643817',
    custom_field_1_label: null, custom_field_1_value: null,
    custom_field_2_label: null, custom_field_2_value: null,
    current_custodian: 'Warehouse A', grn_reference: 'GRN-2026-0045', sales_reference: null,
  },
  {
    id: 'sn-002', serial_number: 'SN-2026-00002', stock_item_id: 'si-011',
    stock_item_name: 'HP ProBook 450 G10', status: 'sold',
    warranty_start_date: '2025-12-15', warranty_end_date: '2027-12-15',
    purchase_date: '2025-12-10', notes: 'Corporate order',
    created_at: '2025-12-15T10:00:00Z', updated_at: '2026-03-01T10:00:00Z',
    imei_1: null, imei_2: null,
    custom_field_1_label: 'Service Tag', custom_field_1_value: 'HP-5CG4321ABC',
    custom_field_2_label: null, custom_field_2_value: null,
    current_custodian: 'Ravi Kumar', grn_reference: 'GRN-2025-0312', sales_reference: 'INV-2026-0088',
  },
  {
    id: 'sn-003', serial_number: 'SN-2026-00003', stock_item_id: 'si-012',
    stock_item_name: 'Bajaj Pulsar NS200', status: 'available',
    warranty_start_date: '2026-03-01', warranty_end_date: '2028-03-01',
    purchase_date: '2026-02-25', notes: null,
    created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-01T10:00:00Z',
    imei_1: null, imei_2: null,
    custom_field_1_label: 'Engine No', custom_field_1_value: 'DHZBSE12345',
    custom_field_2_label: 'Chassis No', custom_field_2_value: 'MD2A15AZ1PCE12345',
    current_custodian: null, grn_reference: 'GRN-2026-0078', sales_reference: null,
  },
  {
    id: 'sn-004', serial_number: 'SN-2025-00010', stock_item_id: 'si-013',
    stock_item_name: 'Canon EOS R6 Mark II', status: 'in_repair',
    warranty_start_date: '2025-06-01', warranty_end_date: '2026-01-01',
    purchase_date: '2025-05-28', notes: 'Sensor issue',
    created_at: '2025-06-01T10:00:00Z', updated_at: '2026-04-01T10:00:00Z',
    imei_1: null, imei_2: null,
    custom_field_1_label: null, custom_field_1_value: null,
    custom_field_2_label: null, custom_field_2_value: null,
    current_custodian: 'Service Center', grn_reference: null, sales_reference: null,
  },
];

export function useSerialNumbers() {
  const [serials, setSerials] = useState<SerialNumber[]>(() => {
    // [JWT] Replace with GET /api/inventory/serial-numbers
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }
    return SEED;
  });

  useEffect(() => {
    // [JWT] Replace with POST/PUT /api/inventory/serial-numbers
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serials));
  }, [serials]);

  const addSerial = (s: SerialNumber) => setSerials(prev => [...prev, s]);
  const updateSerial = (id: string, data: Partial<SerialNumber>) =>
    setSerials(prev => prev.map(s => s.id === id ? { ...s, ...data, updated_at: new Date().toISOString() } : s));
  const deleteSerial = (id: string) => setSerials(prev => prev.filter(s => s.id !== id));

  return { serials, addSerial, updateSerial, deleteSerial };
}
