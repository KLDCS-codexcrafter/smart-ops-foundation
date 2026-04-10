export type RFIDTagStatus = 'unassigned' | 'assigned' | 'read' | 'lost' | 'decommissioned';

export interface RFIDTag {
  id: string;
  tag_uid: string;
  item_id?: string | null;
  item_code?: string | null;
  item_name?: string | null;
  serial_number?: string | null;
  batch_number?: string | null;
  godown_id?: string | null;
  godown_name?: string | null;
  bin_label_id?: string | null;
  assigned_date?: string | null;
  last_read_date?: string | null;
  last_read_location?: string | null;
  status: RFIDTagStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RFIDEvent {
  id: string;
  tag_uid: string;
  event_type: 'write' | 'read' | 'bulk_scan';
  location?: string | null;
  reader_id?: string | null;
  timestamp: string;
}
