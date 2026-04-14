/** contract-manpower.ts — Sprint 21 Contract Labour Management */

export type ContractTab = 'agencies' | 'workers' | 'orders' | 'compliance';

// ── Labour Contractor (Agency) ────────────────────────────────────
export interface LabourContractor {
  id: string;
  agencyCode: string;          // AGY-000001
  agencyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  stateCode: string;
  // Statutory registrations
  panNumber: string;
  gstNumber: string;
  pfRegistrationNo: string;    // PF code number of the agency
  esicRegistrationNo: string;  // ESIC sub-code of the agency
  clraLicenceNo: string;       // Contractor licence under CLRA 1970
  clraLicenceExpiry: string;   // YYYY-MM-DD
  // Terms
  serviceChargePct: number;    // agency markup % on wages
  paymentTermsDays: number;    // invoice payment terms
  status: 'active' | 'inactive' | 'blacklisted';
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Contract Worker ───────────────────────────────────────────────
export type WorkerSkillCategory = 'unskilled' | 'semi_skilled' | 'skilled' | 'highly_skilled' | 'supervisor';

export const WORKER_SKILL_LABELS: Record<WorkerSkillCategory, string> = {
  unskilled: 'Unskilled', semi_skilled: 'Semi-Skilled', skilled: 'Skilled',
  highly_skilled: 'Highly Skilled', supervisor: 'Supervisor',
};

export interface ContractWorker {
  id: string;
  workerCode: string;          // CW-000001
  agencyId: string;
  agencyName: string;
  firstName: string;
  lastName: string;
  displayName: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  mobile: string;
  aadhaar: string;
  uan: string;                 // Universal Account Number (PF)
  esicIpNo: string;            // ESIC Insurance Person Number
  skillCategory: WorkerSkillCategory;
  designation: string;         // e.g. "Security Guard", "Housekeeping Staff"
  deployedDepartment: string;
  deployedLocation: string;
  dailyWage: number;           // declared wage per day for PF/ESIC computation
  pfApplicable: boolean;       // true if wage <= PF ceiling
  esicApplicable: boolean;     // true if monthly wage <= 21,000
  deploymentStartDate: string;
  deploymentEndDate: string;   // empty if ongoing
  status: 'active' | 'inactive' | 'relieved';
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Work Order ────────────────────────────────────────────────────
export type WorkOrderStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface WorkOrder {
  id: string;
  orderCode: string;           // WO-000001
  agencyId: string;
  agencyName: string;
  description: string;        // scope of work
  department: string;
  location: string;
  fromDate: string;
  toDate: string;
  approvedHeadcount: number;
  skillCategory: WorkerSkillCategory;
  ratePerDay: number;          // agreed daily rate per worker
  totalOrderValue: number;     // computed: ratePerDay × approvedHeadcount × workingDays
  status: WorkOrderStatus;
  approvedBy: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Contract Invoice ──────────────────────────────────────────────
export type InvoiceStatus = 'received' | 'verified' | 'approved' | 'paid' | 'disputed';

export interface ContractInvoice {
  id: string;
  invoiceCode: string;         // INV-CL-000001
  workOrderId: string;
  workOrderCode: string;
  agencyId: string;
  agencyName: string;
  invoiceNumber: string;       // agency's own invoice number
  invoiceDate: string;
  billingMonth: string;        // YYYY-MM
  manDaysWorked: number;
  basicWages: number;
  serviceCharge: number;       // agency markup
  pfContribution: number;      // employer PF paid by agency
  esicContribution: number;    // employer ESIC paid by agency
  gstAmount: number;
  totalInvoiceAmount: number;
  verifiedManDays: number;     // after attendance reconciliation
  varianceAmount: number;      // invoice vs verified difference
  status: InvoiceStatus;
  paymentDate: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Contract Attendance ───────────────────────────────────────────
// Monthly summary per worker — tracks days present for PF/ESIC computation
export interface ContractAttendance {
  id: string;
  workerId: string;
  workerCode: string;
  workerName: string;
  agencyId: string;
  workOrderId: string;
  billingMonth: string;        // YYYY-MM
  totalDays: number;           // calendar days in month
  daysPresent: number;
  daysAbsent: number;
  overtimeDays: number;
  dailyWage: number;
  grossWages: number;          // computed: dailyWage × daysPresent
  pfWage: number;              // capped at 15,000/month for PF
  empPF: number;               // 12% of pfWage
  erPF: number;                // 12% of pfWage (employer)
  esicWage: number;
  empESIC: number;             // 0.75% of esicWage
  erESIC: number;              // 3.25% of esicWage
  created_at: string;
  updated_at: string;
}

export const LABOUR_CONTRACTORS_KEY  = 'erp_labour_contractors';
export const CONTRACT_WORKERS_KEY    = 'erp_contract_workers';
export const WORK_ORDERS_KEY         = 'erp_work_orders';
export const CONTRACT_INVOICES_KEY   = 'erp_contract_invoices';
export const CONTRACT_ATTENDANCE_KEY = 'erp_contract_attendance';

// Statutory constants for contract workers
export const CONTRACT_PF_CEILING = 15000;    // PF wage ceiling ₹15,000/month
export const CONTRACT_ESIC_CEILING = 21000;  // ESIC applicability ceiling ₹21,000/month
export const CONTRACT_EMP_PF_RATE = 0.12;
export const CONTRACT_ER_PF_RATE  = 0.12;
export const CONTRACT_EMP_ESI_RATE = 0.0075;
export const CONTRACT_ER_ESI_RATE  = 0.0325;

// Compute PF and ESIC for a contract worker given monthly wage
export function computeContractStatutory(dailyWage: number, daysPresent: number) {
  const grossWages   = Math.round(dailyWage * daysPresent);
  const pfWage       = Math.min(grossWages, CONTRACT_PF_CEILING);
  const esicWage     = grossWages <= CONTRACT_ESIC_CEILING ? grossWages : 0;
  const empPF        = Math.round(pfWage * CONTRACT_EMP_PF_RATE);
  const erPF         = Math.round(pfWage * CONTRACT_ER_PF_RATE);
  const empESIC      = Math.round(esicWage * CONTRACT_EMP_ESI_RATE);
  const erESIC       = Math.round(esicWage * CONTRACT_ER_ESI_RATE);
  return { grossWages, pfWage, esicWage, empPF, erPF, empESIC, erESIC };
}

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  received: 'bg-slate-500/10 text-slate-600 border-slate-400/30',
  verified: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  approved: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  paid:     'bg-green-500/10 text-green-700 border-green-500/30',
  disputed: 'bg-red-500/10 text-red-700 border-red-500/30',
};

export const WORK_ORDER_STATUS_COLORS: Record<WorkOrderStatus, string> = {
  draft:     'bg-slate-500/10 text-slate-600 border-slate-400/30',
  active:    'bg-green-500/10 text-green-700 border-green-500/30',
  completed: 'bg-violet-500/10 text-violet-600 border-violet-400/30',
  cancelled: 'bg-red-500/10 text-red-700 border-red-500/30',
};
