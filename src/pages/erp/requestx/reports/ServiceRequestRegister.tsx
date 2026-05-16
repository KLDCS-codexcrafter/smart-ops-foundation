/**
 * ServiceRequestRegister.tsx — UPRA-2 Phase A · T1-2 · Cross-domain (RequestX)
 * Canonical UniversalRegisterGrid<ServiceRequest> consumer.
 * Sidebar route: rpt-service-request-register (mounted in RequestX, NOT Production · Q1=(A))
 * [JWT] GET /api/requestx/service-requests/:entityCode
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, SummaryCard, StatusOption } from '@/components/registers/UniversalRegisterTypes';
import { serviceRequestsKey, type ServiceRequest, type ServiceTrack } from '@/types/service-request';
import { ServiceRequestDetailPanel } from './detail/ServiceRequestDetailPanel';
import { ServiceRequestPrint } from './print/ServiceRequestPrint';

// Composite taxonomy defined IN V2 FILE ONLY (per UPRA-2 Phase A spec · service-request.ts stays 0-diff)
type ServiceRequestRowStatus = ServiceTrack;

const TRACK_LABELS: Record<ServiceRequestRowStatus, string> = {
  auto_po: 'Auto PO',
  direct_po: 'Direct PO',
  standard_enquiry: 'Standard Enquiry',
};

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

function seedIfEmpty(entity: string): ServiceRequest[] {
  try {
    const raw = localStorage.getItem(serviceRequestsKey(entity));
    const list = raw ? (JSON.parse(raw) as ServiceRequest[]) : [];
    if (list.length > 0) return list;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const base = {
      entity_id: entity, fiscal_year_id: 'FY-2025-26',
      voucher_type_id: 'vt-sr', branch_id: 'br-1', division_id: 'div-1',
      originating_department_id: 'dep-1', originating_department_name: 'Plant Maintenance',
      cost_center_id: 'cc-1', vendor_id: null, hod_user_id: 'u-hod',
      project_id: null, approval_tier: 1 as const, pending_approver_user_id: null,
      approval_history: [], status: 'pending_approval' as const,
      created_at: now, created_by: 'sys', updated_at: now, updated_by: 'sys',
    };
    const seed: ServiceRequest[] = [
      {
        ...base, id: 'sr-seed-1', voucher_no: 'SR/2026/0001', date: today,
        category: 'maintenance', sub_type: 'breakdown', priority: 'high', service_track: 'auto_po',
        requested_by_user_id: 'u-1', requested_by_name: 'Ravi Kumar',
        lines: [{
          id: 'l1', line_no: 1, service_id: 's-1', service_name: 'Motor rewinding',
          description: 'Burnt motor — urgent rewinding', qty: 1, uom: 'NOS',
          estimated_rate: 12000, estimated_value: 12000, required_date: today, sla_days: 1, remarks: '',
        }],
        total_estimated_value: 12000,
      },
      {
        ...base, id: 'sr-seed-2', voucher_no: 'SR/2026/0002', date: today,
        category: 'service', sub_type: 'amc', priority: 'medium', service_track: 'direct_po',
        requested_by_user_id: 'u-2', requested_by_name: 'Priya Sharma',
        lines: [{
          id: 'l1', line_no: 1, service_id: 's-2', service_name: 'AC AMC quarterly',
          description: 'Q2 AMC visit for 8 ACs', qty: 8, uom: 'NOS',
          estimated_rate: 1500, estimated_value: 12000, required_date: today, sla_days: 7, remarks: '',
        }],
        total_estimated_value: 12000,
      },
      {
        ...base, id: 'sr-seed-3', voucher_no: 'SR/2026/0003', date: today,
        category: 'operational', sub_type: 'consultancy', priority: 'low', service_track: 'standard_enquiry',
        requested_by_user_id: 'u-3', requested_by_name: 'Amit Verma',
        lines: [{
          id: 'l1', line_no: 1, service_id: 's-3', service_name: 'Process audit',
          description: 'External ISO process audit', qty: 1, uom: 'JOB',
          estimated_rate: 75000, estimated_value: 75000, required_date: today, sla_days: 30, remarks: '',
        }],
        total_estimated_value: 75000,
      },
    ];
    localStorage.setItem(serviceRequestsKey(entity), JSON.stringify(seed));
    return seed;
  } catch { return []; }
}

export function ServiceRequestRegisterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [printing, setPrinting] = useState<ServiceRequest | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { seedIfEmpty(safeEntity); setTick(t => t + 1); }, [safeEntity]);

  const rows = useMemo<ServiceRequest[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(serviceRequestsKey(safeEntity)) || '[]') as ServiceRequest[];
    } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEntity, tick]);

  const meta: RegisterMeta<ServiceRequest> = {
    registerCode: 'service_request_register',
    title: 'Service Request Register',
    description: 'All service requests · Tally-Prime register · maintenance / service / operational',
    dateAccessor: r => r.date,
  };

  const columns: RegisterColumn<ServiceRequest>[] = [
    { key: 'voucher_no', label: 'Doc No', clickable: true, render: r => r.voucher_no, exportKey: 'voucher_no' },
    { key: 'date', label: 'Date', render: r => r.date, exportKey: 'date' },
    { key: 'requester', label: 'Requester', render: r => r.requested_by_name, exportKey: 'requested_by_name' },
    { key: 'department', label: 'Department', render: r => r.originating_department_name, exportKey: 'originating_department_name' },
    { key: 'track', label: 'Track', render: r => <Badge variant="outline" className="text-[10px]">{TRACK_LABELS[r.service_track]}</Badge>, exportKey: 'service_track' },
    { key: 'category', label: 'Category', render: r => r.category, exportKey: 'category' },
    { key: 'sub_type', label: 'Sub-Type', render: r => r.sub_type, exportKey: 'sub_type' },
    { key: 'value', label: 'Est ₹', align: 'right', render: r => fmtINR(r.total_estimated_value), exportKey: r => r.total_estimated_value },
    { key: 'priority', label: 'Priority', render: r => r.priority, exportKey: 'priority' },
  ];

  const statusOptions: StatusOption[] = (Object.keys(TRACK_LABELS) as ServiceRequestRowStatus[])
    .map(s => ({ value: s, label: TRACK_LABELS[s] }));

  const summaryBuilder = (f: ServiceRequest[]): SummaryCard[] => {
    const auto = f.filter(r => r.service_track === 'auto_po').length;
    const direct = f.filter(r => r.service_track === 'direct_po').length;
    const std = f.filter(r => r.service_track === 'standard_enquiry').length;
    const total = f.reduce((a, r) => a + r.total_estimated_value, 0);
    return [
      { label: 'Total Requests', value: String(f.length) },
      { label: 'Auto PO', value: String(auto) },
      { label: 'Direct PO', value: String(direct) },
      { label: 'Standard Enquiry', value: String(std) },
      { label: 'Total Estimated ₹', value: fmtINR(total), tone: 'positive' },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<ServiceRequest>
        entityCode={safeEntity}
        meta={meta}
        rows={rows}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="service_track"
        summaryBuilder={summaryBuilder}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <ServiceRequestDetailPanel request={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <ServiceRequestPrint request={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ServiceRequestRegisterPanel;
