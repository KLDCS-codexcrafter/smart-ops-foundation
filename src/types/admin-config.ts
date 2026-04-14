/** admin-config.ts — Sprint 16 Admin, ESS and Monitoring types */

export type AdminTab = 'ess' | 'access' | 'templates' | 'activity';

// ── ESS Configuration ─────────────────────────────────────────────
export interface ESSConfig {
  id: string;
  payslipAccess: boolean;
  leaveApplicationAccess: boolean;
  attendanceViewAccess: boolean;
  itDeclarationAccess: boolean;
  reimbursementAccess: boolean;
  profileEditAccess: boolean;
  documentDownloadAccess: boolean;
  announcementsAccess: boolean;
  updated_at: string;
}

// ── Access Role ────────────────────────────────────────────────────
export type RoleLevel = 'superadmin' | 'hr_admin' | 'hr_manager' | 'manager' | 'employee';

export const ROLE_LEVEL_LABELS: Record<RoleLevel, string> = {
  superadmin:  'Super Admin',
  hr_admin:    'HR Admin',
  hr_manager:  'HR Manager',
  manager:     'Line Manager',
  employee:    'Employee (ESS)',
};

export interface RolePermission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface AccessRole {
  id: string;
  roleCode: string;
  roleName: string;
  level: RoleLevel;
  description: string;
  permissions: RolePermission[];
  assignedEmployeeIds: string[];
  isSystemRole: boolean;
  created_at: string;
  updated_at: string;
}

// ── Email Template ─────────────────────────────────────────────────
export type TemplateEvent =
  | 'offer_letter' | 'joining_confirmation' | 'salary_revision'
  | 'leave_approval' | 'leave_rejection' | 'payslip_generated'
  | 'appraisal_reminder' | 'certification_expiry' | 'anniversary'
  | 'birthday' | 'probation_completion' | 'custom';

export const TEMPLATE_EVENT_LABELS: Record<TemplateEvent, string> = {
  offer_letter:         'Offer Letter',
  joining_confirmation: 'Joining Confirmation',
  salary_revision:      'Salary Revision Letter',
  leave_approval:       'Leave Approval',
  leave_rejection:      'Leave Rejection',
  payslip_generated:    'Payslip Generated',
  appraisal_reminder:   'Appraisal Reminder',
  certification_expiry: 'Certification Expiry Alert',
  anniversary:          'Work Anniversary',
  birthday:             'Birthday Wishes',
  probation_completion: 'Probation Completion',
  custom:               'Custom / Other',
};

export interface EmailTemplate {
  id: string;
  templateCode: string;
  event: TemplateEvent;
  name: string;
  subject: string;
  bodyHtml: string;
  placeholders: string[];
  isActive: boolean;
  lastUsed: string;
  created_at: string;
  updated_at: string;
}

// ── Activity Log ───────────────────────────────────────────────────
export type ActivityCategory = 'productive' | 'neutral' | 'unproductive';

export const ACTIVITY_CATEGORY_COLORS: Record<ActivityCategory, string> = {
  productive:   'bg-green-500',
  neutral:      'bg-amber-500',
  unproductive: 'bg-red-500',
};

export interface ActivityLog {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  productiveHours: number;
  neutralHours: number;
  unproductiveHours: number;
  totalTrackedHours: number;
  productivityScore: number;
  topApplications: string[];
  notes: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export const ACCESS_ROLES_KEY     = 'erp_access_roles';
export const EMAIL_TEMPLATES_KEY  = 'erp_email_templates';
export const ACTIVITY_LOGS_KEY    = 'erp_activity_logs';
export const ESS_CONFIG_KEY       = 'erp_ess_config';

// ── Default seeded roles ──────────────────────────────────────────
export const DEFAULT_MODULES = [
  'payroll','employees','leaves','attendance','assets',
  'recruitment','performance','learning','compliance','reports',
];

export function makeDefaultRoles(): Omit<AccessRole,"id"|"created_at"|"updated_at">[] {
  const allPerms = (canAll: boolean): RolePermission[] => DEFAULT_MODULES.map(m => ({
    module: m, canView: true, canCreate: canAll, canEdit: canAll,
    canDelete: canAll, canApprove: canAll,
  }));
  const viewOnly: RolePermission[] = DEFAULT_MODULES.map(m => ({
    module: m, canView: true, canCreate: false, canEdit: false,
    canDelete: false, canApprove: false,
  }));
  return [
    { roleCode:'ROLE-001', roleName:'Super Admin',    level:'superadmin', description:'Full system access',                permissions:allPerms(true),  assignedEmployeeIds:[], isSystemRole:true  },
    { roleCode:'ROLE-002', roleName:'HR Admin',       level:'hr_admin',   description:'Full HR module access',             permissions:allPerms(true),  assignedEmployeeIds:[], isSystemRole:true  },
    { roleCode:'ROLE-003', roleName:'HR Manager',     level:'hr_manager', description:'HR operations — no delete/config',  permissions:allPerms(false), assignedEmployeeIds:[], isSystemRole:true  },
    { roleCode:'ROLE-004', roleName:'Line Manager',   level:'manager',    description:'Team view + leave approval',        permissions:viewOnly,        assignedEmployeeIds:[], isSystemRole:true  },
    { roleCode:'ROLE-005', roleName:'Employee (ESS)', level:'employee',   description:'Self-service only',                 permissions:viewOnly,        assignedEmployeeIds:[], isSystemRole:true  },
  ];
}
