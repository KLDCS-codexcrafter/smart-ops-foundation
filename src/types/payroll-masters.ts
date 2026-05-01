/**
 * payroll-masters.ts — Sprint 3 type definitions
 * Shift · Leave Type · Holiday Calendar · Attendance Type
 * Overtime Rule · Loan Type · Bonus Config · Gratuity & NPS
 */

// ── SHIFT ─────────────────────────────────────────────────────────────
export interface Shift {
  id: string; code: string; name: string;
  startTime: string;        // '09:00'
  endTime: string;          // '18:00'
  breakDuration: number;    // minutes
  breakStartTime: string;   // '13:00'
  gracePeriodIn: number;    // minutes
  gracePeriodOut: number;
  weeklyOff: string[];      // ['Sunday']
  rotationPattern: 'none' | 'weekly' | 'fortnightly' | 'monthly';
  overtimeAfter: number;    // hours
  nightShift: boolean;
  halfDayHours: number;
  fullDayHours: number;
  color: string;            // hex e.g. '#6366f1'
  status: 'active' | 'inactive';
  created_at: string; updated_at: string;
}

// ── LEAVE TYPE ────────────────────────────────────────────────────────
export interface LeaveType {
  id: string; code: string; name: string; shortName: string;
  daysPerYear: number;
  carryForward: boolean; maxCarryForward: number; carryForwardExpiryMonths: number;
  encashable: boolean; encashmentRatePct: number; maxEncashmentDays: number;
  applicableFrom: 'joining' | 'confirmation' | 'custom';
  customApplicableAfterDays: number;
  proRata: boolean;
  clubbingAllowed: boolean;
  minDaysAtOnce: number; maxDaysAtOnce: number;
  advanceNoticeDays: number;
  documentRequired: boolean; documentRequiredAfterDays: number;
  applicableGender: 'all' | 'male' | 'female';
  paidLeave: boolean; halfDayAllowed: boolean;
  status: 'active' | 'inactive';
  created_at: string; updated_at: string;
}

// ── HOLIDAY & HOLIDAY CALENDAR ────────────────────────────────────────
export interface Holiday {
  id: string;
  date: string;             // YYYY-MM-DD
  name: string;
  localName: string;        // from Nager API — local language name
  type: 'national' | 'state' | 'company' | 'optional' | 'restricted';
  stateCode: string;        // 2-letter e.g. "MH", "KA", "DL" — empty = all states
  stateName: string;
  counties: string[];       // Nager API counties e.g. ["IN-MH"] — empty = all India
  isOptional: boolean;
  isFixed: boolean;         // from Nager API — true = same date every year
  source: 'manual' | 'api' | 'inherited'; // how this holiday was added
  description: string;
}

export type CalendarLevel = 'national' | 'company' | 'branch';

export interface HolidayCalendar {
  id: string;
  name: string;
  calendarLevel: CalendarLevel;
  // Hierarchy linkage
  parentCalendarId: string;  // empty for national; company points to national; branch points to company
  entityId: string;          // erp_parent_company id / erp_companies id / erp_branch_offices id
  entityType: string;        // "parent_company" | "company" | "branch"
  // Date range (replaces year: number)
  fromDate: string;          // YYYY-MM-DD — required
  toDate: string;            // YYYY-MM-DD — required
  // Location / state context
  stateCode: string;         // 2-letter state code — drives API fetch and inheritance
  stateName: string;
  location: string;          // display label e.g. "Head Office — Mumbai"
  description: string;
  holidays: Holiday[];
  // Computed / resolved holidays from parents — stored for offline use
  inheritedHolidays: Holiday[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ── ATTENDANCE TYPE ───────────────────────────────────────────────────
export interface AttendanceType {
  id: string; code: string; name: string; shortName: string;
  baseType: 'present' | 'absent' | 'half_day' | 'late' | 'early_out'
    | 'overtime' | 'on_duty' | 'work_from_home' | 'compensatory_off';
  paidStatus: 'full_paid' | 'half_paid' | 'unpaid';
  color: string;
  countAsWorkingDay: boolean;
  requiresApproval: boolean;
  allowManualEntry: boolean;
  status: 'active' | 'inactive';
  created_at: string; updated_at: string;
}

// ── OVERTIME RULE ─────────────────────────────────────────────────────
export interface OvertimeSlab {
  id: string;
  fromHours: number; toHours: number;
  rateMultiplier: number;
  dayType: 'weekday' | 'weekend' | 'holiday';
}

export interface OvertimeRule {
  id: string; code: string; name: string; description: string;
  minOvertimeHours: number;
  maxOvertimeHoursDaily: number;
  maxOvertimeHoursWeekly: number;
  maxOvertimeHoursMonthly: number;
  slabs: OvertimeSlab[];
  effectiveFrom: string;
  status: 'active' | 'inactive';
  created_at: string; updated_at: string;
}

// ── LOAN TYPE ─────────────────────────────────────────────────────────
export interface LoanType {
  id: string; code: string; name: string;
  interestRatePct: number;
  interestType: 'simple' | 'compound' | 'nil';
  maxAmountMultiplier: number;  // max loan = N × monthly basic salary
  maxTenureMonths: number;
  eligibleAfterDays: number;   // days of service before eligible
  status: 'active' | 'inactive';
  created_at: string; updated_at: string;
}

// ── BONUS CONFIG ──────────────────────────────────────────────────────
export interface BonusConfig {
  id: string; code: string; name: string;
  bonusType: 'statutory' | 'ex_gratia' | 'performance' | 'festival' | 'annual';
  calculationType: 'percentage_basic' | 'percentage_gross' | 'fixed';
  value: number;
  minPercent: number;         // for statutory: 8.33
  maxPercent: number;         // for statutory: 20
  eligibilityDays: number;    // min working days in year
  eligibilityWageCeiling: number; // ₹21,000/month for statutory
  taxable: boolean;
  effectiveFrom: string;
  status: 'active' | 'inactive';
  created_at: string; updated_at: string;
}

// ── GRATUITY CONFIG ───────────────────────────────────────────────────
export interface GratuityConfig {
  eligibilityYears: number;
  calculationFormula: string;
  maxGratuityAmount: number;
  taxExemptLimit: number;
  applicableAct: 'payment_of_gratuity_act_1972' | 'custom';
  updated_at: string;
}

// ── NPS CONFIG ────────────────────────────────────────────────────────
export interface NPSConfig {
  employeeContributionPct: number;
  employerContributionPct: number;
  tierType: 'tier1' | 'tier2';
  fundManager: string;
  investmentChoice: 'active' | 'auto';
  updated_at: string;
}

export interface GratuityNPSSettings {
  gratuity: GratuityConfig;
  nps: NPSConfig;
}

// ── STORAGE KEYS ──────────────────────────────────────────────────────
export const SHIFTS_KEY            = 'erp_shifts';
export const LEAVE_TYPES_KEY       = 'erp_leave_types';
export const HOLIDAY_CALENDARS_KEY = 'erp_holiday_calendars';
export const ATTENDANCE_TYPES_KEY  = 'erp_attendance_types';
export const OVERTIME_RULES_KEY    = 'erp_overtime_rules';
export const LOAN_TYPES_KEY        = 'erp_loan_types';
export const BONUS_CONFIGS_KEY     = 'erp_bonus_configs';
export const GRATUITY_NPS_KEY      = 'erp_gratuity_nps_config';

// Default gratuity + NPS settings
export const DEFAULT_GRATUITY_NPS: GratuityNPSSettings = {
  gratuity: { eligibilityYears: 5, calculationFormula: '(Basic + DA) × 15/26 × Years of Service',
    maxGratuityAmount: 2000000, taxExemptLimit: 2000000,
    applicableAct: 'payment_of_gratuity_act_1972', updated_at: '' },
  nps: { employeeContributionPct: 10, employerContributionPct: 10,
    tierType: 'tier1', fundManager: 'SBI Pension Fund',
    investmentChoice: 'auto', updated_at: '' },
};

// ── SEED DATA ─────────────────────────────────────────────────────────
export function getShiftSeeds(): Shift[] {
  const now = new Date().toISOString();
  const mk = (id:string,code:string,name:string,start:string,end:string,
    brk:number,brkStart:string,graceIn:number,graceOut:number,
    ot:number,night:boolean,halfH:number,fullH:number,color:string,
    off:string[]): Shift => ({
    id,code,name,startTime:start,endTime:end,breakDuration:brk,
    breakStartTime:brkStart,gracePeriodIn:graceIn,gracePeriodOut:graceOut,
    weeklyOff:off,rotationPattern:'none',overtimeAfter:ot,nightShift:night,
    halfDayHours:halfH,fullDayHours:fullH,color,status:'active',
    created_at:now,updated_at:now
  });
  return [
    mk('sh-seed-01','GEN','General Shift','09:00','18:00',60,'13:00',10,10,9,false,4,8.5,'#6366f1',['Sunday']),
    mk('sh-seed-02','MRN','Morning Shift','06:00','14:00',30,'10:00',10,5,8,false,4,7.5,'#22c55e',['Sunday']),
    mk('sh-seed-03','EVE','Evening Shift','14:00','22:00',30,'18:00',10,5,8,false,4,7.5,'#f59e0b',['Sunday']),
    mk('sh-seed-04','NGT','Night Shift','22:00','06:00',30,'02:00',15,15,8,true,4,7.5,'#8b5cf6',['Sunday']),
  ];
}

export function getLeaveTypeSeeds(): LeaveType[] {
  const now = new Date().toISOString();
  const mk = (id:string,code:string,name:string,short:string,
    days:number,cf:boolean,maxCF:number,cfExp:number,
    enc:boolean,encRate:number,maxEncDays:number,
    from:LeaveType['applicableFrom'],proRata:boolean,
    gender:LeaveType['applicableGender'],paid:boolean,halfDay:boolean
  ):LeaveType => ({
    id,code,name,shortName:short,daysPerYear:days,carryForward:cf,
    maxCarryForward:maxCF,carryForwardExpiryMonths:cfExp,
    encashable:enc,encashmentRatePct:encRate,maxEncashmentDays:maxEncDays,
    applicableFrom:from,customApplicableAfterDays:0,proRata,
    clubbingAllowed:false,minDaysAtOnce:0.5,maxDaysAtOnce:30,
    advanceNoticeDays:1,documentRequired:false,documentRequiredAfterDays:3,
    applicableGender:gender,paidLeave:paid,halfDayAllowed:halfDay,status:'active',
    created_at:now,updated_at:now
  });
  return [
    mk('lt-seed-01','EL','Earned Leave','EL',15,true,45,0,true,100,30,'joining',true,'all',true,true),
    mk('lt-seed-02','CL','Casual Leave','CL',8,false,0,0,false,0,0,'joining',false,'all',true,true),
    mk('lt-seed-03','SL','Sick Leave','SL',7,true,3,12,false,0,0,'joining',false,'all',true,true),
    mk('lt-seed-04','ML','Maternity Leave','ML',182,false,0,0,false,0,0,'confirmation',false,'female',true,false),
    mk('lt-seed-05','PL','Paternity Leave','PL',5,false,0,0,false,0,0,'joining',false,'male',true,false),
    mk('lt-seed-06','CO','Compensatory Off','CO',0,true,30,3,false,0,0,'joining',false,'all',true,true),
    mk('lt-seed-07','OH','Optional Holiday','OH',2,false,0,0,false,0,0,'joining',false,'all',true,false),
  ];
}

export function getAttendanceTypeSeeds(): AttendanceType[] {
  const now = new Date().toISOString();
  const mk = (id:string,code:string,name:string,short:string,base:AttendanceType['baseType'],
    paid:AttendanceType['paidStatus'],color:string,countWD:boolean,reqAppr:boolean
  ):AttendanceType => ({
    id,code,name,shortName:short,baseType:base,paidStatus:paid,color,
    countAsWorkingDay:countWD,requiresApproval:reqAppr,allowManualEntry:true,status:'active',
    created_at:now,updated_at:now
  });
  return [
    mk('at-seed-01','P','Present','P','present','full_paid','#22c55e',true,false),
    mk('at-seed-02','A','Absent','A','absent','unpaid','#ef4444',false,false),
    mk('at-seed-03','HD','Half Day','HD','half_day','half_paid','#f59e0b',true,false),
    mk('at-seed-04','L','Late','L','late','full_paid','#f97316',true,false),
    mk('at-seed-05','EO','Early Out','EO','early_out','full_paid','#f97316',true,false),
    mk('at-seed-06','OT','Overtime','OT','overtime','full_paid','#8b5cf6',true,false),
    mk('at-seed-07','OD','On Duty','OD','on_duty','full_paid','#06b6d4',true,true),
    mk('at-seed-08','WFH','Work From Home','WFH','work_from_home','full_paid','#3b82f6',true,true),
    mk('at-seed-09','CO','Comp Off','CO','compensatory_off','full_paid','#10b981',true,true),
  ];
}

/**
 * GLOBAL KEYS (Sprint T-Phase-1.2.5h-a verified): SHIFTS_KEY, LEAVE_TYPES_KEY,
 * HOLIDAY_CALENDARS_KEY, ATTENDANCE_TYPES_KEY, OVERTIME_RULES_KEY, LOAN_TYPES_KEY,
 * BONUS_CONFIGS_KEY, GRATUITY_NPS_KEY are intentionally tenant-global.
 * Rationale: statutory + company-wide catalogs apply to all entities.
 * Audited: 2026-05-01 · Bucket A — TRULY GLOBAL.
 */
