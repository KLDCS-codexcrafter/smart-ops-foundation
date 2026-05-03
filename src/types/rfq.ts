/**
 * rfq.ts — Request for Quotation per matched (item × vendor) pair
 * Sprint T-Phase-1.2.6f-a · per D-246 hybrid model
 * [JWT] GET /api/procure360/rfqs
 */
import type { RFQFollowUp } from './procure-followup';

export type RFQStatus =
  | 'draft' | 'sent' | 'received_by_vendor' | 'opened'
  | 'quoted' | 'partial_quoted'
  | 'declined' | 'timeout' | 'cancelled' | 'awarded';

export type RFQSendChannel = 'internal' | 'whatsapp' | 'email';

export interface RFQ {
  id: string;
  rfq_no: string;
  parent_enquiry_id: string;
  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  line_item_ids: string[];
  send_channels: RFQSendChannel[];
  primary_channel: RFQSendChannel;
  token_url: string | null;
  token_expires_at: string | null;
  sent_at: string | null;
  received_by_vendor_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  auto_fallback_enabled: boolean;
  timeout_days: number;
  timeout_at: string | null;
  fallback_to_vendor_id: string | null;
  fallback_triggered_at: string | null;
  fallback_reason: 'declined' | 'timeout' | null;
  declined_at: string | null;
  decline_reason: string | null;
  vendor_quotation_id: string | null;
  follow_ups: RFQFollowUp[];
  next_followup_due: string | null;
  followup_count_originating: number;
  followup_count_purchase: number;
  last_followup_at: string | null;
  is_overdue_followup: boolean;
  status: RFQStatus;
  created_at: string;
  updated_at: string;
}

export const rfqsKey = (entityCode: string): string => `erp_rfqs_${entityCode}`;
