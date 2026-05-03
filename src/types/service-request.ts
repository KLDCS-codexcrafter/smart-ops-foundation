/**
 * @file        service-request.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     Service Request type · 3-track flow per Q-Final-2
 * @decisions   D-218, D-220, D-230, D-232
 * @disciplines SD-13, SD-15, SD-16
 * @[JWT]       erp_service_requests_<entityCode>
 */
import type { IndentStatus, Priority, ApprovalEvent } from './material-indent';

export type ServiceTrack = 'auto_po' | 'direct_po' | 'standard_enquiry';
export type ServiceCategory = 'maintenance' | 'service' | 'operational';
export type ServiceSubType =
  | 'breakdown' | 'preventive' | 'shutdown' | 'spare'
  | 'amc' | 'repair' | 'consultancy' | 'labour' | 'freight';

export interface ServiceRequestLine {
  id: string;
  line_no: number;
  service_id: string;
  service_name: string;
  description: string;
  qty: number;
  uom: string;
  estimated_rate: number;
  estimated_value: number;
  required_date: string;
  sla_days: number;
  remarks: string;
}

export interface ServiceRequest {
  id: string;
  entity_id: string;
  voucher_type_id: string;
  voucher_no: string;
  date: string;
  branch_id: string;
  division_id: string;
  originating_department_id: string;
  originating_department_name: string;
  cost_center_id: string;
  category: ServiceCategory;
  sub_type: ServiceSubType;
  priority: Priority;
  service_track: ServiceTrack;
  vendor_id: string | null;
  requested_by_user_id: string;
  requested_by_name: string;
  hod_user_id: string;
  project_id: string | null;
  lines: ServiceRequestLine[];
  total_estimated_value: number;
  status: IndentStatus;
  approval_tier: 1 | 2 | 3;
  pending_approver_user_id: string | null;
  approval_history: ApprovalEvent[];
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

// [JWT] GET/PUT /api/requestx/service-requests?entityCode=...
export const serviceRequestsKey = (entityCode: string) => `erp_service_requests_${entityCode}`;
