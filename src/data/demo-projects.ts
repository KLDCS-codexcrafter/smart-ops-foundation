/**
 * demo-projects.ts — Sprint T-Phase-1.1.2-a · ProjX foundation seed
 * 5 demo Project Centres + 5 demo Projects across realistic Indian customer base.
 */
import type { ProjectCentre } from '@/types/projx/project-centre';
import type { Project, ProjectStatusEvent } from '@/types/projx/project';
import type { ProjectMilestone } from '@/types/projx/project-milestone';
import type { ProjectResource } from '@/types/projx/project-resource';
import type { TimeEntry } from '@/types/projx/time-entry';
import type { ProjectInvoiceSchedule } from '@/types/projx/project-invoice-schedule';

const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);

function evt(toStatus: Project['status']): ProjectStatusEvent {
  return {
    id: `pse-seed-${toStatus}-${Math.random().toString(36).slice(2, 8)}`,
    from_status: null,
    to_status: toStatus,
    changed_by_id: 'system',
    changed_by_name: 'Demo Seed',
    changed_at: NOW,
    note: 'Project created (demo seed)',
  };
}

export const DEMO_PROJECT_CENTRES: ProjectCentre[] = [
  { id: 'pc-demo-001', code: 'PCT-0001', name: 'Coal Conveyor System', category: 'turnkey',
    parent_project_centre_id: null, division_id: null, department_id: null,
    customer_id: null, customer_name: 'Sinha Industries',
    status: 'active', description: 'Sinha — coal handling turnkey project', entity_id: null,
    created_at: NOW, updated_at: NOW },
  { id: 'pc-demo-002', code: 'PCT-0002', name: 'UPS Installation Project', category: 'product_implementation',
    parent_project_centre_id: null, division_id: null, department_id: null,
    customer_id: null, customer_name: 'Smartpower Solutions',
    status: 'active', description: 'GRSE UPS deployment', entity_id: null,
    created_at: NOW, updated_at: NOW },
  { id: 'pc-demo-003', code: 'PCT-0003', name: 'Vending Machine Rollout Q1', category: 'product_implementation',
    parent_project_centre_id: null, division_id: null, department_id: null,
    customer_id: null, customer_name: 'Cherise India',
    status: 'active', description: 'Q1 vending machine rollout', entity_id: null,
    created_at: NOW, updated_at: NOW },
  { id: 'pc-demo-004', code: 'PCT-0004', name: 'BCPL ERP Implementation', category: 'consulting',
    parent_project_centre_id: null, division_id: null, department_id: null,
    customer_id: null, customer_name: 'BCPL',
    status: 'active', description: 'ERP rollout for BCPL', entity_id: null,
    created_at: NOW, updated_at: NOW },
  { id: 'pc-demo-005', code: 'PCT-0005', name: 'Showroom Renovation', category: 'turnkey',
    parent_project_centre_id: null, division_id: null, department_id: null,
    customer_id: null, customer_name: 'Amith Enterprises',
    status: 'active', description: 'Showroom renovation turnkey', entity_id: null,
    created_at: NOW, updated_at: NOW },
];

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'prj-demo-001', entity_id: '', project_no: 'PRJ/24-25/0001',
    project_name: 'Sinha Coal Conveyor System', project_code: 'SINHA-CCS-01',
    project_type: 'turnkey', status: 'active',
    customer_id: null, customer_name: 'Sinha Industries',
    project_centre_id: 'pc-demo-001',
    source_quotation_id: null, source_quotation_no: null, source_so_id: null, source_so_no: null,
    reference_project_id: null, estimation_snapshot_id: null, is_export_project: false,
    start_date: '2025-04-15', target_end_date: '2025-12-31', actual_end_date: null,
    original_contract_value: 15000000, current_contract_value: 15000000, contract_value: 15000000,
    billed_to_date: 4500000, cost_to_date: 3200000, margin_pct: 28.89, change_request_count: 0,
    project_manager_id: null, project_manager_name: null,
    milestone_count: 0, milestones_completed: 0, schedule_risk_index: null,
    status_history: [evt('active')],
    description: 'Coal handling conveyor system turnkey delivery for Sinha Industries.',
    is_active: true, created_at: NOW, updated_at: NOW,
    deleted_at: null, deleted_by_id: null, deletion_reason: null,
  },
  {
    id: 'prj-demo-002', entity_id: '', project_no: 'PRJ/24-25/0002',
    project_name: 'Smartpower UPS @ GRSE', project_code: 'SMPW-GRSE-UPS',
    project_type: 'turnkey', status: 'active',
    customer_id: null, customer_name: 'Smartpower Solutions',
    project_centre_id: 'pc-demo-002',
    source_quotation_id: null, source_quotation_no: null, source_so_id: null, source_so_no: null,
    reference_project_id: null, estimation_snapshot_id: null, is_export_project: false,
    start_date: '2025-06-01', target_end_date: '2025-09-30', actual_end_date: null,
    original_contract_value: 2500000, current_contract_value: 2500000, contract_value: 2500000,
    billed_to_date: 0, cost_to_date: 0, margin_pct: 0, change_request_count: 0,
    project_manager_id: null, project_manager_name: null,
    milestone_count: 0, milestones_completed: 0, schedule_risk_index: null,
    status_history: [evt('active')],
    description: 'UPS installation at GRSE shipyard.',
    is_active: true, created_at: NOW, updated_at: NOW,
    deleted_at: null, deleted_by_id: null, deletion_reason: null,
  },
  {
    id: 'prj-demo-003', entity_id: '', project_no: 'PRJ/24-25/0003',
    project_name: 'Cherise Q1 Vending Rollout', project_code: 'CHR-Q1-VEND',
    project_type: 'product_implementation', status: 'planning',
    customer_id: null, customer_name: 'Cherise India',
    project_centre_id: 'pc-demo-003',
    source_quotation_id: null, source_quotation_no: null, source_so_id: null, source_so_no: null,
    reference_project_id: null, estimation_snapshot_id: null, is_export_project: false,
    start_date: '2025-07-01', target_end_date: '2025-10-31', actual_end_date: null,
    original_contract_value: 8000000, current_contract_value: 8000000, contract_value: 8000000,
    billed_to_date: 0, cost_to_date: 0, margin_pct: 0, change_request_count: 0,
    project_manager_id: null, project_manager_name: null,
    milestone_count: 0, milestones_completed: 0, schedule_risk_index: null,
    status_history: [evt('planning')],
    description: 'Q1 rollout of vending machines across Mumbai retail outlets.',
    is_active: true, created_at: NOW, updated_at: NOW,
    deleted_at: null, deleted_by_id: null, deletion_reason: null,
  },
  {
    id: 'prj-demo-004', entity_id: '', project_no: 'PRJ/24-25/0004',
    project_name: 'BCPL ERP Implementation', project_code: 'BCPL-ERP',
    project_type: 'consulting', status: 'on_hold',
    customer_id: null, customer_name: 'BCPL',
    project_centre_id: 'pc-demo-004',
    source_quotation_id: null, source_quotation_no: null, source_so_id: null, source_so_no: null,
    reference_project_id: null, estimation_snapshot_id: null, is_export_project: false,
    start_date: '2025-03-01', target_end_date: '2026-02-28', actual_end_date: null,
    original_contract_value: 6000000, current_contract_value: 6000000, contract_value: 6000000,
    billed_to_date: 1200000, cost_to_date: 950000, margin_pct: 20.83, change_request_count: 0,
    project_manager_id: null, project_manager_name: null,
    milestone_count: 0, milestones_completed: 0, schedule_risk_index: null,
    status_history: [evt('on_hold')],
    description: 'ERP implementation paused awaiting customer feedback.',
    is_active: true, created_at: NOW, updated_at: NOW,
    deleted_at: null, deleted_by_id: null, deletion_reason: null,
  },
  {
    id: 'prj-demo-005', entity_id: '', project_no: 'PRJ/24-25/0005',
    project_name: 'Amith Showroom Renovation', project_code: 'AMITH-SHWR',
    project_type: 'turnkey', status: 'completed',
    customer_id: null, customer_name: 'Amith Enterprises',
    project_centre_id: 'pc-demo-005',
    source_quotation_id: null, source_quotation_no: null, source_so_id: null, source_so_no: null,
    reference_project_id: null, estimation_snapshot_id: null, is_export_project: false,
    start_date: '2024-10-01', target_end_date: '2025-01-31', actual_end_date: '2025-02-15',
    original_contract_value: 3500000, current_contract_value: 3500000, contract_value: 3500000,
    billed_to_date: 3500000, cost_to_date: 2800000, margin_pct: 20, change_request_count: 0,
    project_manager_id: null, project_manager_name: null,
    milestone_count: 0, milestones_completed: 0, schedule_risk_index: null,
    status_history: [evt('completed')],
    description: 'Showroom renovation completed and handed over.',
    is_active: true, created_at: NOW, updated_at: NOW,
    deleted_at: null, deleted_by_id: null, deletion_reason: null,
  },
];

// ─── Sprint 1.1.2-b transactional seed ────────────────────────────────

function ms(id: string, projectId: string, projectCentreId: string,
  no: string, name: string, target: string, status: ProjectMilestone['status'],
  pct: number, billed: boolean, contractValue: number,
  actualDate: string | null = null): ProjectMilestone {
  return {
    id, entity_id: '', project_id: projectId, project_centre_id: projectCentreId,
    milestone_no: no, milestone_name: name, description: name,
    target_date: target, actual_completion_date: actualDate, status,
    invoice_pct: pct, invoice_amount: Math.round(contractValue * pct) / 100,
    is_billed: billed, invoice_voucher_id: null, invoice_voucher_no: null,
    blocks_milestone_ids: [],
    created_at: NOW, updated_at: NOW,
  };
}

export const DEMO_PROJECT_MILESTONES: ProjectMilestone[] = [
  // PRJ-001 Sinha Coal Conveyor — 4 milestones
  ms('ms-001-1', 'prj-demo-001', 'pc-demo-001', 'M-01', 'Site Survey & Design', '2025-05-15', 'completed', 15, true,  15000000, '2025-05-12'),
  ms('ms-001-2', 'prj-demo-001', 'pc-demo-001', 'M-02', 'Equipment Delivery',    '2025-07-30', 'completed', 30, true,  15000000, '2025-08-02'),
  ms('ms-001-3', 'prj-demo-001', 'pc-demo-001', 'M-03', 'Erection & Commissioning', '2025-10-31', 'in_progress', 40, false, 15000000),
  ms('ms-001-4', 'prj-demo-001', 'pc-demo-001', 'M-04', 'Final Handover',         '2025-12-31', 'pending',     15, false, 15000000),
  // PRJ-002 Smartpower UPS — 3 milestones
  ms('ms-002-1', 'prj-demo-002', 'pc-demo-002', 'M-01', 'Mobilization',           '2025-06-15', 'pending', 20, false, 2500000),
  ms('ms-002-2', 'prj-demo-002', 'pc-demo-002', 'M-02', 'UPS Installation',       '2025-08-15', 'pending', 60, false, 2500000),
  ms('ms-002-3', 'prj-demo-002', 'pc-demo-002', 'M-03', 'Commissioning',          '2025-09-30', 'pending', 20, false, 2500000),
  // PRJ-004 BCPL ERP — 2 milestones
  ms('ms-004-1', 'prj-demo-004', 'pc-demo-004', 'M-01', 'Discovery Phase',        '2025-04-30', 'completed',  20, true,  6000000, '2025-04-28'),
  ms('ms-004-2', 'prj-demo-004', 'pc-demo-004', 'M-02', 'Module Build',           '2025-09-30', 'blocked',    50, false, 6000000),
  // PRJ-005 Amith Showroom — completed
  ms('ms-005-1', 'prj-demo-005', 'pc-demo-005', 'M-01', 'Demolition & Layout',    '2024-11-15', 'completed', 30, true, 3500000, '2024-11-10'),
  ms('ms-005-2', 'prj-demo-005', 'pc-demo-005', 'M-02', 'Civil & Interiors',      '2025-01-15', 'completed', 50, true, 3500000, '2025-01-20'),
  ms('ms-005-3', 'prj-demo-005', 'pc-demo-005', 'M-03', 'Handover',               '2025-02-10', 'completed', 20, true, 3500000, '2025-02-15'),
];

function res(id: string, projectId: string, projectCentreId: string,
  personId: string, code: string, name: string, role: string,
  pct: number, from: string, until: string | null, daily: number): ProjectResource {
  return {
    id, entity_id: '', project_id: projectId, project_centre_id: projectCentreId,
    person_id: personId, person_code: code, person_name: name,
    role_on_project: role, allocation_pct: pct,
    allocated_from: from, allocated_until: until, daily_cost_rate: daily,
    is_active: true, created_at: NOW, updated_at: NOW,
  };
}

export const DEMO_PROJECT_RESOURCES: ProjectResource[] = [
  res('pr-001', 'prj-demo-001', 'pc-demo-001', 'sam-pm-01', 'SAM-PM01', 'Rajesh Kumar',  'Project Manager',    50, '2025-04-15', '2025-12-31', 4500),
  res('pr-002', 'prj-demo-001', 'pc-demo-001', 'sam-en-01', 'SAM-EN01', 'Anjali Sharma',  'Lead Engineer',      75, '2025-04-15', '2025-12-31', 3500),
  res('pr-003', 'prj-demo-002', 'pc-demo-002', 'sam-en-02', 'SAM-EN02', 'Vikram Singh',   'Site Engineer',     100, '2025-06-01', '2025-09-30', 3000),
  res('pr-004', 'prj-demo-003', 'pc-demo-003', 'sam-pm-01', 'SAM-PM01', 'Rajesh Kumar',   'Project Lead',       40, '2025-07-01', '2025-10-31', 4500),
  res('pr-005', 'prj-demo-004', 'pc-demo-004', 'sam-cn-01', 'SAM-CN01', 'Priya Mehta',    'Lead Consultant',    60, '2025-03-01', '2026-02-28', 5500),
  res('pr-006', 'prj-demo-004', 'pc-demo-004', 'sam-cn-02', 'SAM-CN02', 'Arvind Iyer',    'Solution Architect', 50, '2025-03-01', '2026-02-28', 5000),
];

function te(id: string, projectId: string, projectNo: string, projectCentreId: string,
  personId: string, personName: string, date: string, hours: number,
  task: string, rate: number, status: TimeEntry['status']): TimeEntry {
  return {
    id, entity_id: '', project_id: projectId, project_no: projectNo,
    project_centre_id: projectCentreId,
    milestone_id: null, person_id: personId, person_name: personName,
    entry_date: date, hours, task_description: task,
    is_billable: true, hourly_rate: rate, status,
    approved_by_id: status === 'approved' ? 'system' : null,
    approved_by_name: status === 'approved' ? 'Demo Approver' : null,
    approved_at: status === 'approved' ? NOW : null,
    rejection_reason: null,
    created_at: NOW, updated_at: NOW,
  };
}

export const DEMO_TIME_ENTRIES: TimeEntry[] = [
  te('te-001', 'prj-demo-001', 'PRJ/24-25/0001', 'pc-demo-001', 'sam-pm-01', 'Rajesh Kumar', '2025-04-20', 8, 'Site survey coordination',           600, 'approved'),
  te('te-002', 'prj-demo-001', 'PRJ/24-25/0001', 'pc-demo-001', 'sam-en-01', 'Anjali Sharma', '2025-04-22', 8, 'Design drawings preparation',       450, 'approved'),
  te('te-003', 'prj-demo-001', 'PRJ/24-25/0001', 'pc-demo-001', 'sam-en-01', 'Anjali Sharma', '2025-05-05', 7, 'Equipment specification finalization', 450, 'approved'),
  te('te-004', 'prj-demo-002', 'PRJ/24-25/0002', 'pc-demo-002', 'sam-en-02', 'Vikram Singh',  '2025-06-05', 8, 'Site mobilization',                  400, 'submitted'),
  te('te-005', 'prj-demo-004', 'PRJ/24-25/0004', 'pc-demo-004', 'sam-cn-01', 'Priya Mehta',   '2025-04-10', 6, 'Discovery workshops with BCPL',      700, 'approved'),
  te('te-006', 'prj-demo-004', 'PRJ/24-25/0004', 'pc-demo-004', 'sam-cn-02', 'Arvind Iyer',   '2025-04-12', 8, 'As-is process documentation',        650, 'approved'),
  te('te-007', 'prj-demo-005', 'PRJ/24-25/0005', 'pc-demo-005', 'sam-en-01', 'Anjali Sharma', '2024-12-15', 6, 'Civil work supervision',             450, 'approved'),
  te('te-008', 'prj-demo-001', 'PRJ/24-25/0001', 'pc-demo-001', 'sam-pm-01', 'Rajesh Kumar',  '2025-09-20', 5, 'Stakeholder review meeting',         600, 'draft'),
];

function sch(id: string, projectId: string, projectCentreId: string,
  msId: string | null, date: string, amount: number, desc: string,
  invoiced: boolean): ProjectInvoiceSchedule {
  return {
    id, entity_id: '', project_id: projectId, project_centre_id: projectCentreId,
    milestone_id: msId, scheduled_date: date, amount, description: desc,
    is_invoiced: invoiced, invoiced_voucher_id: null, invoiced_voucher_no: null,
    invoiced_at: invoiced ? NOW : null,
    created_at: NOW, updated_at: NOW,
  };
}

export const DEMO_PROJECT_INVOICE_SCHEDULES: ProjectInvoiceSchedule[] = [
  sch('pis-001', 'prj-demo-001', 'pc-demo-001', 'ms-001-1', '2025-05-15', 2250000, 'Invoice — Site Survey & Design', true),
  sch('pis-002', 'prj-demo-001', 'pc-demo-001', 'ms-001-2', '2025-07-30', 4500000, 'Invoice — Equipment Delivery',  true),
  sch('pis-003', 'prj-demo-001', 'pc-demo-001', 'ms-001-3', '2025-10-31', 6000000, 'Invoice — Erection',            false),
  sch('pis-004', 'prj-demo-001', 'pc-demo-001', 'ms-001-4', '2025-12-31', 2250000, 'Invoice — Handover',            false),
  sch('pis-005', 'prj-demo-002', 'pc-demo-002', 'ms-002-1', '2025-06-15',  500000, 'Invoice — Mobilization',        false),
  sch('pis-006', 'prj-demo-004', 'pc-demo-004', 'ms-004-1', '2025-04-30', 1200000, 'Invoice — Discovery',           true),
  sch('pis-007', 'prj-demo-005', 'pc-demo-005', 'ms-005-3', '2025-02-10',  700000, 'Invoice — Final Handover',      true),
];

void TODAY;

