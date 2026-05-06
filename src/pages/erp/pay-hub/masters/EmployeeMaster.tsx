/**
 * EmployeeMaster.tsx — Pay Hub Sprint 2
 * Full Employee Master: List + Profile (Data Bank) + Create/Edit (8-tab inline form)
 */
import { useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { User, Briefcase, MapPin, Landmark, IndianRupee, Users as UsersIcon, FileText, Settings2, Plus, Trash2, Edit2, ArrowLeft, Loader2, Search, Ban, CheckCircle2, UserPlus, Factory } from 'lucide-react';
import { useMachines } from '@/hooks/useMachines';
import { toast } from 'sonner';
import { useEmployees } from '@/hooks/useEmployees';
import type { Employee, FamilyMember, EquipmentIssued, LoanDetail,
  LICPolicy, PrevEmployerDetail, EmployeeDocument, DocType } from '@/types/employee';
import { BLANK_EMPLOYEE, DOC_TYPE_LABELS, EMPLOYEE_STATUS_COLORS } from '@/types/employee';
import { indianStates, getDistrictsByState, getCitiesByDistrict } from '@/data/india-geography';
import { onEnterNext, useCtrlS, amountInputProps, toIndianFormat } from '@/lib/keyboard';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

type EmployeeView = 'list' | 'profile' | 'create' | 'edit';

// IFSC auto-fetch — identical pattern to VendorMaster.tsx
const fetchIfscDetails = async (
  ifsc: string,
  setFetching: (v: boolean) => void,
  onSuccess: (bank: string, branch: string, city: string) => void
) => {
  const cleaned = ifsc.trim().toUpperCase();
  if (cleaned.length !== 11) return;
  setFetching(true);
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${cleaned}`);
    if (!res.ok) throw new Error("IFSC not found");
    const data = await res.json();
    onSuccess(data.BANK ?? '', data.BRANCH ?? '', data.CITY ?? data.DISTRICT ?? '');
    toast.success(`${data.BANK}, ${data.BRANCH}`);
  } catch {
    toast.error('IFSC details unavailable — fill manually');
  } finally {
    setFetching(false);
  }
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EMP_TYPE_COLORS: Record<string, string> = {
  permanent: 'bg-green-500/10 text-green-700 border-green-500/30',
  contract: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  intern: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  consultant: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  probation: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  retainer: 'bg-teal-500/10 text-teal-700 border-teal-500/30',
};

// ────────────────────────────────────────────────────────────────────────
// MAIN PANEL
// ────────────────────────────────────────────────────────────────────────
export function EmployeeMasterPanel() {
  const [view, setView] = useState<EmployeeView>('list');
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState(BLANK_EMPLOYEE);
  const [customCode, setCustomCode] = useState("");
  const [activeTab, setActiveTab] = useState("identity");
  const [ifscFetching, setIfscFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [revisionReason, setRevisionReason] = useState('');

  const { employees, stats, createEmployee, updateEmployee, toggleStatus, search: searchFn, yearsOfService } = useEmployees();

  // ── SAM context ─────────────────────────────────────────────────────
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all'
    ? selectedCompany : DEFAULT_ENTITY_SHORTCODE;

  const samCfg = useMemo(() => {
    try {
      // [JWT] GET /api/compliance/comply360/sam/:entityCode
      const raw = localStorage.getItem(`erp_comply360_sam_${entityCode}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [entityCode]);

  // ── Cross-module data reads ─────────────────────────────────────────
  const departments: { id: string; name: string; divisionId?: string }[] = useMemo(() => {
    try {
      // [JWT] GET /api/foundation/departments
      const raw = localStorage.getItem("erp_departments");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const divisions: { id: string; name: string }[] = useMemo(() => {
    try {
      // [JWT] GET /api/foundation/divisions
      const raw = localStorage.getItem("erp_divisions");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const salaryStructures: { id: string; code: string; name: string }[] = useMemo(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/salary-structures
      const raw = localStorage.getItem("erp_salary_structures");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const payGrades: { id: string; code: string; name: string }[] = useMemo(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/pay-grades
      const raw = localStorage.getItem("erp_pay_grades");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  // Active employees for reporting manager dropdown
  const activeManagers = useMemo(() =>
    employees.filter(e => e.status === 'active' && e.id !== activeEmployee?.id)
  , [employees, activeEmployee]);

  // ── Filtered list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = searchQuery ? searchFn(searchQuery) : employees;
    if (deptFilter !== "all") result = result.filter(e => e.departmentId === deptFilter);
    if (typeFilter !== "all") result = result.filter(e => e.employmentType === typeFilter);
    if (statusFilter !== "all") result = result.filter(e => e.status === statusFilter);
    return result;
  }, [employees, searchQuery, deptFilter, typeFilter, statusFilter, searchFn]);

  // ── updateField helper ─────────────────────────────────────────────
  const uf = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // ── handleSave ─────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (view !== 'create' && view !== 'edit') return;
    if (!form.firstName.trim()) return toast.error("First name is required");
    if (!form.lastName.trim()) return toast.error("Last name is required");
    if (!form.doj) return toast.error("Date of joining is required");
    if (view === 'edit' && activeEmployee) {
      // Check salary revision
      if (activeEmployee.annualCTC !== form.annualCTC && form.annualCTC > 0) {
        const rev = {
          id: `rev-${Date.now()}`,
          revisionDate: new Date().toISOString().slice(0, 10),
          oldCTC: activeEmployee.annualCTC,
          newCTC: form.annualCTC,
          pctChange: activeEmployee.annualCTC > 0
            ? Math.round(((form.annualCTC - activeEmployee.annualCTC) / activeEmployee.annualCTC) * 100 * 100) / 100
            : 0,
          reason: revisionReason,
          revisedBy: 'Admin',
        };
        uf('salaryRevisions', [...form.salaryRevisions, rev]);
      }
      updateEmployee(activeEmployee.id, form);
      setView('profile');
    } else if (view === 'create') {
      try {
        const emp = createEmployee(form, customCode || undefined);
        setActiveEmployee(emp);
        setView('profile');
      } catch {
        // duplicate code error already toasted
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: uf is a stable field-update helper defined in component scope
  }, [view, form, activeEmployee, customCode, createEmployee, updateEmployee, revisionReason]);

  useCtrlS(handleSave);

  const openCreate = () => {
    setForm(BLANK_EMPLOYEE);
    setCustomCode("");
    setActiveEmployee(null);
    setActiveTab("identity");
    setView('create');
  };

  const openEdit = (emp: Employee) => {
    const { id, empCode, created_at, updated_at, ...rest } = emp;
    setForm(rest);
    setRevisionReason('');
    setCustomCode(empCode);
    setActiveEmployee(emp);
    setActiveTab("identity");
    setView('edit');
  };

  const openProfile = (emp: Employee) => {
    setActiveEmployee(emp);
    setView('profile');
  };

  const goBack = () => {
    setActiveEmployee(null);
    setView('list');
  };

  // ── Render branch ──────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Employee Master</h2>
              <p className="text-xs text-muted-foreground">Active workforce register</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-700 text-white">
            <UserPlus className="h-4 w-4 mr-2" /> Add Employee
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent></Card>
          <Card className="border-green-500/30"><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent></Card>
          <Card className="border-amber-500/30"><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.onNotice}</p>
            <p className="text-xs text-muted-foreground">On Notice</p>
          </CardContent></Card>
          <Card className="border-rose-500/30"><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-rose-600">{stats.relieved}</p>
            <p className="text-xs text-muted-foreground">Relieved</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, code, PAN..." className="pl-9" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Emp Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="permanent">Permanent</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
              <SelectItem value="consultant">Consultant</SelectItem>
              <SelectItem value="probation">Probation</SelectItem>
              <SelectItem value="retainer">Retainer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_notice">On Notice</SelectItem>
              <SelectItem value="relieved">Relieved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Emp Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[120px]">Department</TableHead>
              <TableHead className="w-[80px]">Grade</TableHead>
              <TableHead className="w-[90px]">Emp Type</TableHead>
              <TableHead className="w-[90px]">Date of Joining</TableHead>
              <TableHead className="w-[70px]">Status</TableHead>
              <TableHead className="w-[90px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No employees found. Click "Add Employee" to create one.
              </TableCell></TableRow>
            )}
            {filtered.map(emp => (
              <TableRow key={emp.id} className="cursor-pointer group" onClick={() => openProfile(emp)}>
                <TableCell className="font-mono text-violet-600 text-xs">{emp.empCode}</TableCell>
                <TableCell>
                  <div className="font-semibold text-sm">{emp.displayName}</div>
                  <div className="text-xs text-muted-foreground">{emp.designation || '—'}</div>
                </TableCell>
                <TableCell className="text-xs">{emp.departmentName || '—'}</TableCell>
                <TableCell>
                  {emp.gradeName
                    ? <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-700">{emp.gradeName}</Badge>
                    : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${EMP_TYPE_COLORS[emp.employmentType] ?? ''}`}>
                    {emp.employmentType}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {emp.doj ? new Date(emp.doj).toLocaleDateString('en-IN') : '—'}
                  <div className="text-[10px] text-muted-foreground">{yearsOfService(emp.doj)}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${EMPLOYEE_STATUS_COLORS[emp.status]}`}>
                    {emp.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={e => { e.stopPropagation(); openEdit(emp); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={e => { e.stopPropagation(); toggleStatus(emp.id); }}>
                      {emp.status === 'active' ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── PROFILE VIEW ────────────────────────────────────────────────────
  if (view === 'profile' && activeEmployee) {
    const emp = activeEmployee;
    const fv = (label: string, value: string | number | boolean | undefined) => (
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium">
          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value || '—')}
        </p>
      </div>
    );

    return (
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back to List</Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => openEdit(emp)}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit Employee
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleStatus(emp.id)}>
            {emp.status === 'active' ? <Ban className="h-3.5 w-3.5 mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
            Toggle Status
          </Button>
        </div>

        {/* Profile header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-violet-500/15 flex items-center justify-center text-xl font-bold text-violet-600">
                {emp.firstName[0]}{emp.lastName[0]}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{emp.displayName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="font-mono text-xs">{emp.empCode}</Badge>
                  <span className="text-sm text-muted-foreground">{emp.designation}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {emp.departmentName && <Badge variant="secondary" className="text-[10px]">{emp.departmentName}</Badge>}
                  {emp.divisionName && <Badge variant="secondary" className="text-[10px]">{emp.divisionName}</Badge>}
                  {emp.gradeName && <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-700">{emp.gradeName}</Badge>}
                  <Badge variant="outline" className={`text-[10px] ${EMP_TYPE_COLORS[emp.employmentType] ?? ''}`}>{emp.employmentType}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${EMPLOYEE_STATUS_COLORS[emp.status]}`}>{emp.status.replace('_', ' ')}</Badge>
                </div>
                <div className="grid grid-cols-5 gap-4 mt-4 text-xs">
                  <div><span className="text-muted-foreground">Years of Service:</span> <strong>{yearsOfService(emp.doj)}</strong></div>
                  <div><span className="text-muted-foreground">DOJ:</span> <strong>{emp.doj ? new Date(emp.doj).toLocaleDateString('en-IN') : '—'}</strong></div>
                  <div><span className="text-muted-foreground">Confirmation:</span> <strong>{emp.confirmationDate ? new Date(emp.confirmationDate).toLocaleDateString('en-IN') : '—'}</strong></div>
                  <div><span className="text-muted-foreground">PAN:</span> <strong>{emp.pan || '—'}</strong></div>
                  <div><span className="text-muted-foreground">UAN:</span> <strong>{emp.uan || '—'}</strong></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Identity */}
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-violet-500" /> Identity & Personal</CardTitle></CardHeader>
          <CardContent><div className="grid grid-cols-3 gap-4">
            {fv('DOB', emp.dob ? new Date(emp.dob).toLocaleDateString('en-IN') : '')}
            {fv('Gender', emp.gender)}
            {fv('Blood Group', emp.bloodGroup)}
            {fv('Nationality', emp.nationality)}
            {fv('Marital Status', emp.maritalStatus)}
            {emp.maritalStatus === 'married' && fv('Anniversary', emp.anniversary ? new Date(emp.anniversary).toLocaleDateString('en-IN') : '')}
            {fv('Aadhaar', emp.aadhaar ? `XXXX-XXXX-${emp.aadhaar.slice(-4)}` : '')}
            {fv('PAN', emp.pan)}
            {fv('Passport', emp.passportNo)}
            {fv('Driving Licence', emp.drivingLicenceNo)}
          </div></CardContent>
        </Card>

        {/* Section 2: Employment */}
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-500" /> Employment</CardTitle></CardHeader>
          <CardContent><div className="grid grid-cols-3 gap-4">
            {fv('Employment Type', emp.employmentType)}
            {fv('DOJ', emp.doj ? new Date(emp.doj).toLocaleDateString('en-IN') : '')}
            {fv('Confirmation Date', emp.confirmationDate ? new Date(emp.confirmationDate).toLocaleDateString('en-IN') : '')}
            {fv('Notice Period', `${emp.noticePeriodDays} days`)}
            {fv('Work Location', emp.workLocation)}
            {fv('Reporting Manager', emp.reportingManagerName)}
            {fv('Shift Code', emp.shiftCode)}
            {fv('Weekly Off', emp.weeklyOff.join(', '))}
            {fv('Biometric ID', emp.biometricId)}
            {fv('ESS Login', emp.essLoginEnabled)}
          </div></CardContent>
        </Card>

        {/* Section 3: Contact */}
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-green-500" /> Contact</CardTitle></CardHeader>
          <CardContent><div className="grid grid-cols-3 gap-4">
            {fv('Mobile', emp.personalMobile)}
            {fv('Email', emp.personalEmail)}
            {fv('Emergency Contact', `${emp.emergencyContactName} (${emp.emergencyContactRelation}) ${emp.emergencyContactPhone}`)}
            {fv('Current Address', [emp.currentAddressLine, emp.currentCityName, emp.currentDistrictName, emp.currentStateName, emp.currentPincode].filter(Boolean).join(', '))}
            {fv('Permanent Address', emp.permanentSameAsCurrent ? 'Same as current' : [emp.permanentAddressLine, emp.permanentCityName, emp.permanentDistrictName, emp.permanentStateName, emp.permanentPincode].filter(Boolean).join(', '))}
          </div></CardContent>
        </Card>

        {/* Section 4: Bank & Statutory */}
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4 text-amber-500" /> Bank & Statutory</CardTitle></CardHeader>
          <CardContent><div className="grid grid-cols-3 gap-4">
            {fv('Account Holder', emp.bankAccountHolder)}
            {fv('Account No', emp.bankAccountNo ? `XXXX${emp.bankAccountNo.slice(-4)}` : '')}
            {fv('IFSC', emp.bankIfsc)}
            {fv('Bank Name', emp.bankName)}
            {fv('Branch', emp.bankBranchName)}
            {fv('UAN', emp.uan)}
            {fv('PF Applicable', emp.pfApplicable)}
            {fv('ESI IP No', emp.esiIpNumber)}
            {fv('ESI Applicable', emp.esiApplicable)}
            {fv('PT State', emp.ptStateCode)}
            {fv('TDS Applicable', emp.tdsApplicable)}
            {fv('Tax Regime', emp.taxRegime)}
            {fv('Form 12BB', emp.form12BBSubmitted)}
            {fv('VPF %', emp.vpfPercentage)}
          </div></CardContent>
        </Card>

        {/* Section 5: Salary */}
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><IndianRupee className="h-4 w-4 text-emerald-500" /> Salary & CTC</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {fv('Salary Structure', emp.salaryStructureName)}
              {fv('Annual CTC', emp.annualCTC ? `₹${toIndianFormat(emp.annualCTC)}` : '')}
              {fv('Effective From', emp.ctcEffectiveFrom ? new Date(emp.ctcEffectiveFrom).toLocaleDateString('en-IN') : '')}
            </div>
            {emp.salaryRevisions.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="text-xs font-semibold mb-2">Salary Revision History</p>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Old CTC</TableHead>
                    <TableHead className="text-xs">New CTC</TableHead>
                    <TableHead className="text-xs">Change %</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {emp.salaryRevisions.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{new Date(r.revisionDate).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell className="text-xs">₹{toIndianFormat(r.oldCTC)}</TableCell>
                        <TableCell className="text-xs">₹{toIndianFormat(r.newCTC)}</TableCell>
                        <TableCell className="text-xs">{r.pctChange}%</TableCell>
                        <TableCell className="text-xs">{r.reason || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 6: Family */}
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UsersIcon className="h-4 w-4 text-pink-500" /> Family & Nominees</CardTitle></CardHeader>
          <CardContent>
            {emp.familyMembers.length === 0 ? <p className="text-xs text-muted-foreground">No family members added</p> : (
              <Table><TableHeader><TableRow>
                <TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Relation</TableHead>
                <TableHead className="text-xs">DOB</TableHead><TableHead className="text-xs">PF Nominee %</TableHead>
                <TableHead className="text-xs">Gratuity %</TableHead><TableHead className="text-xs">ESI</TableHead>
                <TableHead className="text-xs">Medical</TableHead>
              </TableRow></TableHeader>
              <TableBody>{emp.familyMembers.map(fm => (
                <TableRow key={fm.id}>
                  <TableCell className="text-xs">{fm.name}</TableCell>
                  <TableCell className="text-xs">{fm.relation}</TableCell>
                  <TableCell className="text-xs">{fm.dob ? new Date(fm.dob).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-xs">{fm.pfNomineePct}%</TableCell>
                  <TableCell className="text-xs">{fm.gratuityNomineePct}%</TableCell>
                  <TableCell className="text-xs">{fm.esiDependent ? '✓' : '—'}</TableCell>
                  <TableCell className="text-xs">{fm.medicalInsDependent ? '✓' : '—'}</TableCell>
                </TableRow>
              ))}</TableBody></Table>
            )}
          </CardContent>
        </Card>

        {/* Section 7: Documents */}
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-500" /> Documents</CardTitle></CardHeader>
          <CardContent>
            {emp.documents.length === 0 ? <p className="text-xs text-muted-foreground">No documents added</p> : (
              <Table><TableHeader><TableRow>
                <TableHead className="text-xs">Type</TableHead><TableHead className="text-xs">Doc Name</TableHead>
                <TableHead className="text-xs">Issue Date</TableHead><TableHead className="text-xs">Expiry Date</TableHead>
                <TableHead className="text-xs">Verified</TableHead>
              </TableRow></TableHeader>
              <TableBody>{emp.documents.map(doc => {
                const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                const isNearExpiry = doc.expiryDate && !isExpired && (new Date(doc.expiryDate).getTime() - Date.now()) < 30 * 24 * 3600 * 1000;
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="text-xs">{DOC_TYPE_LABELS[doc.docType]}</TableCell>
                    <TableCell className="text-xs">{doc.docName}</TableCell>
                    <TableCell className="text-xs">{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell className={`text-xs ${isExpired ? 'text-red-600 font-semibold' : isNearExpiry ? 'text-amber-600 font-semibold' : ''}`}>
                      {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('en-IN') : '—'}
                      {isExpired && ' ⚠ Expired'}
                      {isNearExpiry && ' ⚠ Expiring soon'}
                    </TableCell>
                    <TableCell className="text-xs">{doc.verified ? '✓ Verified' : '—'}</TableCell>
                  </TableRow>
                );
              })}</TableBody></Table>
            )}
          </CardContent>
        </Card>

        {/* Section 8: Additional */}
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4 text-gray-500" /> Additional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {fv('EL Opening Balance', emp.elOpeningBalance)}
              {fv('Medical Reimb Cap', `₹${toIndianFormat(emp.medicalRembCap)}`)}
            </div>
            {emp.equipmentIssued.length > 0 && (<>
              <p className="text-xs font-semibold">Equipment Issued</p>
              <Table><TableHeader><TableRow>
                <TableHead className="text-xs">Asset Code</TableHead><TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Serial No</TableHead><TableHead className="text-xs">Date Issued</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow></TableHeader><TableBody>{emp.equipmentIssued.map(eq => (
                <TableRow key={eq.id}>
                  <TableCell className="text-xs">{eq.assetCode}</TableCell>
                  <TableCell className="text-xs">{eq.description}</TableCell>
                  <TableCell className="text-xs">{eq.serialNo}</TableCell>
                  <TableCell className="text-xs">{eq.dateIssued ? new Date(eq.dateIssued).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-xs">{eq.status}</TableCell>
                </TableRow>
              ))}</TableBody></Table>
            </>)}
            {emp.loanDetails.length > 0 && (<>
              <p className="text-xs font-semibold">Loan Details</p>
              <Table><TableHeader><TableRow>
                <TableHead className="text-xs">Loan Type</TableHead><TableHead className="text-xs">Principal</TableHead>
                <TableHead className="text-xs">EMI</TableHead><TableHead className="text-xs">Balance</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow></TableHeader><TableBody>{emp.loanDetails.map(ln => (
                <TableRow key={ln.id}>
                  <TableCell className="text-xs">{ln.loanTypeName}</TableCell>
                  <TableCell className="text-xs">₹{toIndianFormat(ln.principalAmount)}</TableCell>
                  <TableCell className="text-xs">₹{toIndianFormat(ln.emiAmount)}</TableCell>
                  <TableCell className="text-xs">₹{toIndianFormat(ln.remainingBalance)}</TableCell>
                  <TableCell className="text-xs">{ln.status}</TableCell>
                </TableRow>
              ))}</TableBody></Table>
            </>)}
            {emp.licPolicies.length > 0 && (<>
              <p className="text-xs font-semibold">LIC Policies</p>
              <Table><TableHeader><TableRow>
                <TableHead className="text-xs">Policy No</TableHead><TableHead className="text-xs">Insurer</TableHead>
                <TableHead className="text-xs">Premium</TableHead><TableHead className="text-xs">Sum Assured</TableHead>
              </TableRow></TableHeader><TableBody>{emp.licPolicies.map(lp => (
                <TableRow key={lp.id}>
                  <TableCell className="text-xs">{lp.policyNo}</TableCell>
                  <TableCell className="text-xs">{lp.insurer}</TableCell>
                  <TableCell className="text-xs">₹{toIndianFormat(lp.premiumAnnual)}</TableCell>
                  <TableCell className="text-xs">₹{toIndianFormat(lp.sumAssured)}</TableCell>
                </TableRow>
              ))}</TableBody></Table>
            </>)}
            {emp.prevEmployerDetails.length > 0 && (<>
              <p className="text-xs font-semibold">Previous Employers</p>
              <Table><TableHeader><TableRow>
                <TableHead className="text-xs">Employer</TableHead><TableHead className="text-xs">TAN</TableHead>
                <TableHead className="text-xs">From</TableHead><TableHead className="text-xs">To</TableHead>
                <TableHead className="text-xs">Gross Salary</TableHead><TableHead className="text-xs">TDS</TableHead>
              </TableRow></TableHeader><TableBody>{emp.prevEmployerDetails.map(pe => (
                <TableRow key={pe.id}>
                  <TableCell className="text-xs">{pe.employerName}</TableCell>
                  <TableCell className="text-xs">{pe.employerTAN}</TableCell>
                  <TableCell className="text-xs">{pe.fromDate ? new Date(pe.fromDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-xs">{pe.toDate ? new Date(pe.toDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell className="text-xs">₹{toIndianFormat(pe.grossSalary)}</TableCell>
                  <TableCell className="text-xs">₹{toIndianFormat(pe.tdsDeducted)}</TableCell>
                </TableRow>
              ))}</TableBody></Table>
            </>)}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── FORM VIEW (create / edit) ────────────────────────────────────────
  const filteredDepts = form.divisionId
    ? departments.filter(d => d.divisionId === form.divisionId)
    : departments;

  const currentDistricts = getDistrictsByState(form.currentStateCode);
  const currentCities = getCitiesByDistrict(form.currentDistrictCode);
  const permDistricts = getDistrictsByState(form.permanentStateCode);
  const permCities = getCitiesByDistrict(form.permanentDistrictCode);

  const pfTotal = form.familyMembers.reduce((s, m) => s + m.pfNomineePct, 0);
  const gratuityTotal = form.familyMembers.reduce(
    (s, m) => s + m.gratuityNomineePct, 0
  );

  // Sub-table helpers
  const addFamilyMember = () => uf('familyMembers', [...form.familyMembers, {
    id: `fm-${Date.now()}`, name: '', relation: 'Spouse', dob: '',
    pfNomineePct: 0, gratuityNomineePct: 0, esiDependent: false, medicalInsDependent: false,
  }]);
  const removeFamilyMember = (id: string) => uf('familyMembers', form.familyMembers.filter(m => m.id !== id));
  const updateFM = (id: string, patch: Partial<FamilyMember>) =>
    uf('familyMembers', form.familyMembers.map(m => m.id === id ? { ...m, ...patch } : m));

  const addDocument = () => uf('documents', [...form.documents, {
    id: `doc-${Date.now()}`, docType: 'other' as DocType, docName: '', fileRef: '',
    issueDate: '', expiryDate: '', verified: false, verifiedDate: '', verifiedBy: '',
  }]);
  const removeDocument = (id: string) => uf('documents', form.documents.filter(d => d.id !== id));
  const updateDoc = (id: string, patch: Partial<EmployeeDocument>) =>
    uf('documents', form.documents.map(d => d.id === id ? { ...d, ...patch } : d));

  const addEquipment = () => uf('equipmentIssued', [...form.equipmentIssued, {
    id: `eq-${Date.now()}`, assetCode: '', description: '', serialNo: '',
    dateIssued: '', expectedReturn: '', status: 'issued' as const,
  }]);
  const removeEquipment = (id: string) => uf('equipmentIssued', form.equipmentIssued.filter(e => e.id !== id));
  const updateEq = (id: string, patch: Partial<EquipmentIssued>) =>
    uf('equipmentIssued', form.equipmentIssued.map(e => e.id === id ? { ...e, ...patch } : e));

  const addLoan = () => uf('loanDetails', [...form.loanDetails, {
    id: `ln-${Date.now()}`, loanTypeName: '', principalAmount: 0, emiAmount: 0,
    startDate: '', remainingBalance: 0, status: 'active' as const,
  }]);
  const removeLoan = (id: string) => uf('loanDetails', form.loanDetails.filter(l => l.id !== id));
  const updateLoan = (id: string, patch: Partial<LoanDetail>) =>
    uf('loanDetails', form.loanDetails.map(l => l.id === id ? { ...l, ...patch } : l));

  const addLIC = () => uf('licPolicies', [...form.licPolicies, {
    id: `lic-${Date.now()}`, policyNo: '', insurer: '', premiumAnnual: 0, sumAssured: 0, dueDate: '',
  }]);
  const removeLIC = (id: string) => uf('licPolicies', form.licPolicies.filter(l => l.id !== id));
  const updateLIC = (id: string, patch: Partial<LICPolicy>) =>
    uf('licPolicies', form.licPolicies.map(l => l.id === id ? { ...l, ...patch } : l));

  const addPrevEmp = () => uf('prevEmployerDetails', [...form.prevEmployerDetails, {
    id: `pe-${Date.now()}`, employerName: '', employerTAN: '', fromDate: '', toDate: '',
    grossSalary: 0, taxableIncome: 0, tdsDeducted: 0, pfContributed: 0,
  }]);
  const removePrevEmp = (id: string) => uf('prevEmployerDetails', form.prevEmployerDetails.filter(p => p.id !== id));
  const updatePrevEmp = (id: string, patch: Partial<PrevEmployerDetail>) =>
    uf('prevEmployerDetails', form.prevEmployerDetails.map(p => p.id === id ? { ...p, ...patch } : p));

  // Address section helper
  const renderAddress = (prefix: 'current' | 'permanent') => {
    const stKey = `${prefix}StateCode` as keyof typeof form;
    const snKey = `${prefix}StateName` as keyof typeof form;
    const dcKey = `${prefix}DistrictCode` as keyof typeof form;
    const dnKey = `${prefix}DistrictName` as keyof typeof form;
    const ccKey = `${prefix}CityCode` as keyof typeof form;
    const cnKey = `${prefix}CityName` as keyof typeof form;
    const districts = prefix === 'current' ? currentDistricts : permDistricts;
    const cities = prefix === 'current' ? currentCities : permCities;

    return (
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3">
          <Label className="text-xs">Address Line</Label>
          <Input value={form[`${prefix}AddressLine` as keyof typeof form] as string}
            onChange={e => uf(`${prefix}AddressLine` as keyof typeof form, e.target.value as never)}
            onKeyDown={onEnterNext} />
        </div>
        <div>
          <Label className="text-xs">State</Label>
          <Select value={form[stKey] as string} onValueChange={v => {
            const st = indianStates.find(s => s.code === v);
            uf(stKey, v as never); uf(snKey, (st?.name ?? '') as never);
            uf(dcKey, '' as never); uf(dnKey, '' as never);
            uf(ccKey, '' as never); uf(cnKey, '' as never);
          }}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{indianStates.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">District</Label>
          <Select value={form[dcKey] as string} onValueChange={v => {
            const d = districts.find(x => x.code === v);
            uf(dcKey, v as never); uf(dnKey, (d?.name ?? '') as never);
            uf(ccKey, '' as never); uf(cnKey, '' as never);
          }}>
            <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
            <SelectContent>{districts.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">City</Label>
          <Select value={form[ccKey] as string} onValueChange={v => {
            const c = cities.find(x => x.code === v);
            uf(ccKey, v as never); uf(cnKey, (c?.name ?? '') as never);
          }}>
            <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
            <SelectContent>{cities.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Pincode</Label>
          <Input value={form[`${prefix}Pincode` as keyof typeof form] as string}
            onChange={e => uf(`${prefix}Pincode` as keyof typeof form, e.target.value as never)}
            maxLength={6} onKeyDown={onEnterNext} />
        </div>
      </div>
    );
  };

  return (
    <div data-keyboard-form className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <Badge variant="outline" className="font-mono">{view === 'edit' ? customCode : 'New Employee'}</Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleSave}>Save & Continue</Button>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSave} data-primary>
          Save & Close
        </Button>
      </div>

      {/* Employee Code */}
      <div className="flex items-center gap-3">
        <Label className="text-xs font-semibold">Employee Code:</Label>
        <Input value={customCode} onChange={e => setCustomCode(e.target.value.toUpperCase())}
          placeholder="Auto-generated" className="w-48 font-mono" onKeyDown={onEnterNext} />
      </div>

      {/* 8-Tab Form */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="identity" className="text-xs gap-1"><User className="h-3 w-3" /> Identity</TabsTrigger>
          <TabsTrigger value="employment" className="text-xs gap-1"><Briefcase className="h-3 w-3" /> Employment</TabsTrigger>
          <TabsTrigger value="contact" className="text-xs gap-1"><MapPin className="h-3 w-3" /> Contact</TabsTrigger>
          <TabsTrigger value="bank" className="text-xs gap-1"><Landmark className="h-3 w-3" /> Bank</TabsTrigger>
          <TabsTrigger value="salary" className="text-xs gap-1"><IndianRupee className="h-3 w-3" /> Salary</TabsTrigger>
          <TabsTrigger value="family" className="text-xs gap-1"><UsersIcon className="h-3 w-3" /> Family</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs gap-1"><FileText className="h-3 w-3" /> Docs</TabsTrigger>
          <TabsTrigger value="additional" className="text-xs gap-1"><Settings2 className="h-3 w-3" /> Additional</TabsTrigger>
        </TabsList>

        {/* TAB 1 — Identity */}
        <TabsContent value="identity" className="space-y-4 mt-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Salutation</Label>
              <Select value={form.salutation} onValueChange={v => uf('salutation', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Mr', 'Mrs', 'Ms', 'Dr', 'Er'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">First Name *</Label>
              <Input value={form.firstName} onChange={e => { uf('firstName', e.target.value); uf('displayName', `${e.target.value} ${form.lastName}`.trim()); }} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Middle Name</Label>
              <Input value={form.middleName} onChange={e => uf('middleName', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Last Name *</Label>
              <Input value={form.lastName} onChange={e => { uf('lastName', e.target.value); uf('displayName', `${form.firstName} ${e.target.value}`.trim()); }} onKeyDown={onEnterNext} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Display Name</Label>
              <Input value={form.displayName} onChange={e => uf('displayName', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Date of Birth *</Label>
              <SmartDateInput value={form.dob} onChange={v => uf('dob', v)} />
            </div>
            <div>
              <Label className="text-xs">Gender *</Label>
              <Select value={form.gender} onValueChange={v => uf('gender', v as Employee['gender'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Blood Group</Label>
              <Select value={form.bloodGroup} onValueChange={v => uf('bloodGroup', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nationality</Label>
              <Input value={form.nationality} onChange={e => uf('nationality', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Marital Status</Label>
              <Select value={form.maritalStatus} onValueChange={v => uf('maritalStatus', v as Employee['maritalStatus'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.maritalStatus === 'married' && (
              <div>
                <Label className="text-xs">Anniversary</Label>
                <SmartDateInput value={form.anniversary} onChange={v => uf('anniversary', v)} />
              </div>
            )}
          </div>
          <Separator />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Aadhaar</Label>
              <Input value={form.aadhaar} maxLength={12}
                onChange={e => uf('aadhaar', e.target.value.replace(/\D/g, ''))} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">PAN</Label>
              <Input value={form.pan} maxLength={10}
                onChange={e => uf('pan', e.target.value.toUpperCase())} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Passport Number</Label>
              <Input value={form.passportNo} onChange={e => uf('passportNo', e.target.value.toUpperCase())} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Passport Expiry</Label>
              <SmartDateInput value={form.passportExpiry} onChange={v => uf('passportExpiry', v)} />
            </div>
            <div>
              <Label className="text-xs">Passport Issue Country</Label>
              <Input value={form.passportIssueCountry} onChange={e => uf('passportIssueCountry', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Driving Licence No</Label>
              <Input value={form.drivingLicenceNo} onChange={e => uf('drivingLicenceNo', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Driving Licence Expiry</Label>
              <SmartDateInput value={form.drivingLicenceExpiry} onChange={v => uf('drivingLicenceExpiry', v)} />
            </div>
          </div>
        </TabsContent>

        {/* TAB 2 — Employment */}
        <TabsContent value="employment" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Employment Type *</Label>
              <Select value={form.employmentType} onValueChange={v => uf('employmentType', v as Employee['employmentType'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['permanent', 'contract', 'intern', 'consultant', 'probation', 'retainer'].map(t =>
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date of Joining *</Label>
              <SmartDateInput value={form.doj} onChange={v => uf('doj', v)} />
            </div>
            <div>
              <Label className="text-xs">Confirmation Date</Label>
              <SmartDateInput value={form.confirmationDate} onChange={v => uf('confirmationDate', v)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Notice Period (days)</Label>
              <Input type="number" value={form.noticePeriodDays}
                onChange={e => uf('noticePeriodDays', parseInt(e.target.value) || 0)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Division</Label>
              <Select value={form.divisionId} onValueChange={v => {
                const div = divisions.find(d => d.id === v);
                uf('divisionId', v); uf('divisionName', div?.name ?? '');
                uf('departmentId', ''); uf('departmentName', '');
              }}>
                <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                <SelectContent>
                  {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Department *</Label>
              <Select value={form.departmentId} onValueChange={v => {
                const dept = departments.find(d => d.id === v);
                uf('departmentId', v); uf('departmentName', dept?.name ?? '');
              }}>
                <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                <SelectContent>
                  {filteredDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Designation *</Label>
              <Input value={form.designation} onChange={e => uf('designation', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Pay Grade</Label>
              <Select value={form.gradeId} onValueChange={v => {
                const g = payGrades.find(x => x.id === v);
                uf('gradeId', v); uf('gradeName', g ? `${g.code} - ${g.name}` : '');
              }}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {payGrades.map(g => <SelectItem key={g.id} value={g.id}>{g.code} - {g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reporting Manager</Label>
              <Select value={form.reportingManagerId} onValueChange={v => {
                const mgr = activeManagers.find(e => e.id === v);
                uf('reportingManagerId', v); uf('reportingManagerName', mgr?.displayName ?? '');
              }}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  {activeManagers.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} - {e.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Work Location</Label>
              <Input value={form.workLocation} onChange={e => uf('workLocation', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Shift Code</Label>
              <Input value={form.shiftCode} onChange={e => uf('shiftCode', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Biometric ID</Label>
              <Input value={form.biometricId} onChange={e => uf('biometricId', e.target.value)} onKeyDown={onEnterNext} />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-2 block">Weekly Off</Label>
            <div className="flex gap-3 flex-wrap">
              {DAYS.map(day => (
                <label key={day} className="flex items-center gap-1.5 text-xs">
                  <Checkbox checked={form.weeklyOff.includes(day)}
                    onCheckedChange={checked => {
                      uf('weeklyOff', checked
                        ? [...form.weeklyOff, day]
                        : form.weeklyOff.filter(d => d !== day));
                    }} />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.essLoginEnabled} onCheckedChange={v => uf('essLoginEnabled', v)} />
            <Label className="text-xs">ESS Login Enabled</Label>
          </div>
          {samCfg?.enableSalesActivityModule &&
            samCfg?.enableCompanySalesMan &&
            samCfg?.companySalesManSource === 'payhub' && (
            <div className="flex items-start justify-between border border-border rounded-xl p-3 bg-muted/5">
              <div>
                <Label className="text-xs font-medium">Treat as Salesman</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  When enabled, this employee appears in the Company Salesman dropdown on
                  sales transactions and in commission calculations.
                </p>
              </div>
              <Switch checked={form.is_salesman} onCheckedChange={v => uf('is_salesman', v)} />
            </div>
          )}
        </TabsContent>

        {/* TAB 3 — Contact */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Personal Mobile</Label>
              <Input value={form.personalMobile} onChange={e => uf('personalMobile', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Personal Email</Label>
              <Input value={form.personalEmail} onChange={e => uf('personalEmail', e.target.value)} onKeyDown={onEnterNext} />
            </div>
          </div>
          <Separator />
          <p className="text-xs font-semibold">Emergency Contact</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={form.emergencyContactName} onChange={e => uf('emergencyContactName', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Relation</Label>
              <Input value={form.emergencyContactRelation} onChange={e => uf('emergencyContactRelation', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.emergencyContactPhone} onChange={e => uf('emergencyContactPhone', e.target.value)} onKeyDown={onEnterNext} />
            </div>
          </div>
          <Separator />
          <p className="text-xs font-semibold">Current Address</p>
          {renderAddress('current')}
          <Separator />
          <div className="flex items-center gap-2">
            <Switch checked={form.permanentSameAsCurrent} onCheckedChange={v => uf('permanentSameAsCurrent', v)} />
            <Label className="text-xs">Permanent address same as current</Label>
          </div>
          {!form.permanentSameAsCurrent && (
            <>
              <p className="text-xs font-semibold">Permanent Address</p>
              {renderAddress('permanent')}
            </>
          )}
        </TabsContent>

        {/* TAB 4 — Bank & Statutory */}
        <TabsContent value="bank" className="space-y-4 mt-4">
          <p className="text-xs font-semibold">Bank Details</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Account Holder Name</Label>
              <Input value={form.bankAccountHolder} onChange={e => uf('bankAccountHolder', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Account Number</Label>
              <Input value={form.bankAccountNo} onChange={e => uf('bankAccountNo', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">IFSC Code</Label>
              <div className="flex gap-2">
                <Input value={form.bankIfsc} className="flex-1"
                  onChange={e => uf('bankIfsc', e.target.value.toUpperCase())} onKeyDown={onEnterNext}
                  onBlur={() => fetchIfscDetails(form.bankIfsc, setIfscFetching, (bank, branch, city) => {
                    uf('bankName', bank); uf('bankBranchName', branch); uf('bankBranchCity', city);
                  })} />
                {ifscFetching && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
              </div>
            </div>
            <div>
              <Label className="text-xs">Bank Name</Label>
              <Input value={form.bankName} onChange={e => uf('bankName', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Branch Name</Label>
              <Input value={form.bankBranchName} onChange={e => uf('bankBranchName', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Account Type</Label>
              <Select value={form.bankAccountType} onValueChange={v => uf('bankAccountType', v as Employee['bankAccountType'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <p className="text-xs font-semibold">Statutory</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">UAN</Label>
              <Input value={form.uan} onChange={e => uf('uan', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">ESI IP Number</Label>
              <Input value={form.esiIpNumber} onChange={e => uf('esiIpNumber', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">PT State</Label>
              <Select value={form.ptStateCode} onValueChange={v => uf('ptStateCode', v)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{indianStates.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.pfApplicable} onCheckedChange={v => uf('pfApplicable', v)} />
              <Label className="text-xs">PF Applicable</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.esiApplicable} onCheckedChange={v => uf('esiApplicable', v)} />
              <Label className="text-xs">ESI Applicable</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.tdsApplicable} onCheckedChange={v => uf('tdsApplicable', v)} />
              <Label className="text-xs">TDS Applicable</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.form12BBSubmitted} onCheckedChange={v => uf('form12BBSubmitted', v)} />
              <Label className="text-xs">Form 12BB Submitted</Label>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tax Regime</Label>
              <Select value={form.taxRegime} onValueChange={v => uf('taxRegime', v as Employee['taxRegime'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="old">Old Regime</SelectItem>
                  <SelectItem value="new">New Regime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">PF Wage Ceiling Override (₹)</Label>
              <Input type="number" value={form.pfWageCeilingOverride}
                onChange={e => uf('pfWageCeilingOverride', parseInt(e.target.value) || 0)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">VPF Percentage</Label>
              <Input type="number" value={form.vpfPercentage}
                onChange={e => uf('vpfPercentage', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
            </div>
          </div>
        </TabsContent>

        {/* TAB 5 — Salary & CTC */}
        <TabsContent value="salary" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Salary Structure</Label>
              <Select value={form.salaryStructureId} onValueChange={v => {
                const ss = salaryStructures.find(s => s.id === v);
                uf('salaryStructureId', v); uf('salaryStructureName', ss ? `${ss.code} - ${ss.name}` : '');
              }}>
                <SelectTrigger><SelectValue placeholder="Select structure" /></SelectTrigger>
                <SelectContent>
                  {salaryStructures.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Annual CTC (₹)</Label>
              <Input {...amountInputProps} value={form.annualCTC || ''}
                onChange={e => uf('annualCTC', parseFloat(e.target.value.replace(/,/g, '')) || 0)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">CTC Effective From</Label>
              <SmartDateInput value={form.ctcEffectiveFrom} onChange={v => uf('ctcEffectiveFrom', v)} />
            </div>
          </div>
          {view === 'edit' && activeEmployee && activeEmployee.annualCTC !== form.annualCTC && form.annualCTC > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4">
                <p className="text-xs text-amber-700 font-semibold mb-1">
                  CTC changed from ₹{toIndianFormat(activeEmployee.annualCTC)} → ₹{toIndianFormat(form.annualCTC)}
                  {activeEmployee.annualCTC > 0 && ` (${Math.round(((form.annualCTC - activeEmployee.annualCTC) / activeEmployee.annualCTC) * 100)}%)`}
                </p>
                <p className="text-[10px] text-muted-foreground">A salary revision entry will be auto-created on save.</p>
                <div className="mt-2">
                  <Label className="text-xs">Reason for revision</Label>
                  <Input
                    className="text-xs mt-1"
                    placeholder="e.g. Annual increment, Promotion, Market correction"
                    value={revisionReason}
                    onChange={e => setRevisionReason(e.target.value)}
                    onKeyDown={onEnterNext}
                  />
                </div>
              </CardContent>
            </Card>
          )}
          {form.salaryRevisions.length > 0 && (
            <>
              <p className="text-xs font-semibold">Salary Revision History</p>
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Old CTC</TableHead>
                  <TableHead className="text-xs">New CTC</TableHead>
                  <TableHead className="text-xs">Change %</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {form.salaryRevisions.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{new Date(r.revisionDate).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="text-xs">₹{toIndianFormat(r.oldCTC)}</TableCell>
                      <TableCell className="text-xs">₹{toIndianFormat(r.newCTC)}</TableCell>
                      <TableCell className="text-xs">{r.pctChange}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </TabsContent>

        {/* TAB 6 — Family */}
        <TabsContent value="family" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Family Members & Nominees</p>
            <Button size="sm" variant="outline" onClick={addFamilyMember}><Plus className="h-3 w-3 mr-1" /> Add Member</Button>
          </div>
          {form.familyMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No family members added yet</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Relation</TableHead>
                <TableHead className="text-xs">DOB</TableHead>
                <TableHead className="text-xs">PF Nom %</TableHead>
                <TableHead className="text-xs">Gratuity %</TableHead>
                <TableHead className="text-xs">ESI</TableHead>
                <TableHead className="text-xs">Medical</TableHead>
                <TableHead className="text-xs w-[40px]"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {form.familyMembers.map(fm => (
                  <TableRow key={fm.id}>
                    <TableCell><Input value={fm.name} onChange={e => updateFM(fm.id, { name: e.target.value })} className="h-8 text-xs" onKeyDown={onEnterNext} /></TableCell>
                    <TableCell>
                      <Select value={fm.relation} onValueChange={v => updateFM(fm.id, { relation: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Spouse', 'Child', 'Father', 'Mother', 'Sibling', 'Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><SmartDateInput value={fm.dob} onChange={v => updateFM(fm.id, { dob: v })} className="h-8 text-xs" /></TableCell>
                    <TableCell><Input type="number" value={fm.pfNomineePct} onChange={e => updateFM(fm.id, { pfNomineePct: parseFloat(e.target.value) || 0 })} className="h-8 text-xs w-16" onKeyDown={onEnterNext} /></TableCell>
                    <TableCell><Input type="number" value={fm.gratuityNomineePct} onChange={e => updateFM(fm.id, { gratuityNomineePct: parseFloat(e.target.value) || 0 })} className="h-8 text-xs w-16" onKeyDown={onEnterNext} /></TableCell>
                    <TableCell><Checkbox checked={fm.esiDependent} onCheckedChange={v => updateFM(fm.id, { esiDependent: !!v })} /></TableCell>
                    <TableCell><Checkbox checked={fm.medicalInsDependent} onCheckedChange={v => updateFM(fm.id, { medicalInsDependent: !!v })} /></TableCell>
                    <TableCell><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFamilyMember(fm.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {form.familyMembers.length > 0 && pfTotal !== 100 && pfTotal > 0 && (
            <p className="text-xs text-amber-600">⚠ PF nominee total is {pfTotal}% — should be 100%</p>
          )}
          {form.familyMembers.length > 0 && gratuityTotal !== 100 && gratuityTotal > 0 && (
            <p className="text-xs text-amber-600">
              ⚠ Gratuity nominee total is {gratuityTotal}% — should be 100%
            </p>
          )}
        </TabsContent>

        {/* TAB 7 — Documents */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Employee Documents</p>
            <Button size="sm" variant="outline" onClick={addDocument}><Plus className="h-3 w-3 mr-1" /> Add Document</Button>
          </div>
          {form.documents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No documents added yet</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Doc Name</TableHead>
                <TableHead className="text-xs">Issue Date</TableHead>
                <TableHead className="text-xs">Expiry Date</TableHead>
                <TableHead className="text-xs">Verified</TableHead>
                <TableHead className="text-xs w-[40px]"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {form.documents.map(doc => {
                  const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
                  const isNearExpiry = doc.expiryDate && !isExpired && (new Date(doc.expiryDate).getTime() - Date.now()) < 30 * 24 * 3600 * 1000;
                  return (
                    <TableRow key={doc.id} className={isExpired ? 'bg-red-500/5' : isNearExpiry ? 'bg-amber-500/5' : ''}>
                      <TableCell>
                        <Select value={doc.docType} onValueChange={v => updateDoc(doc.id, { docType: v as DocType })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input value={doc.docName} onChange={e => updateDoc(doc.id, { docName: e.target.value })} className="h-8 text-xs" onKeyDown={onEnterNext} /></TableCell>
                      <TableCell><SmartDateInput value={doc.issueDate} onChange={v => updateDoc(doc.id, { issueDate: v })} className="h-8 text-xs" /></TableCell>
                      <TableCell><SmartDateInput value={doc.expiryDate} onChange={v => updateDoc(doc.id, { expiryDate: v })} className="h-8 text-xs" /></TableCell>
                      <TableCell><Checkbox checked={doc.verified} onCheckedChange={v => updateDoc(doc.id, { verified: !!v })} /></TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeDocument(doc.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* TAB 8 — Additional */}
        <TabsContent value="additional" className="space-y-6 mt-4">
          {/* Equipment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold">Equipment Issued</p>
              <Button size="sm" variant="outline" onClick={addEquipment}><Plus className="h-3 w-3 mr-1" /> Add</Button>
            </div>
            {form.equipmentIssued.map(eq => (
              <div key={eq.id} className="grid grid-cols-6 gap-2 mb-2 items-end">
                <div><Label className="text-[10px]">Asset Code</Label><Input value={eq.assetCode} onChange={e => updateEq(eq.id, { assetCode: e.target.value })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Description</Label><Input value={eq.description} onChange={e => updateEq(eq.id, { description: e.target.value })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Serial No</Label><Input value={eq.serialNo} onChange={e => updateEq(eq.id, { serialNo: e.target.value })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Date Issued</Label><SmartDateInput value={eq.dateIssued} onChange={v => updateEq(eq.id, { dateIssued: v })} className="h-8 text-xs" /></div>
                <div><Label className="text-[10px]">Status</Label>
                  <Select value={eq.status} onValueChange={v => updateEq(eq.id, { status: v as EquipmentIssued['status'] })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="issued">Issued</SelectItem><SelectItem value="returned">Returned</SelectItem><SelectItem value="lost">Lost</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeEquipment(eq.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
              </div>
            ))}
          </div>
          <Separator />
          {/* Loans */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold">Loan Details</p>
              <Button size="sm" variant="outline" onClick={addLoan}><Plus className="h-3 w-3 mr-1" /> Add</Button>
            </div>
            {form.loanDetails.map(ln => (
              <div key={ln.id} className="grid grid-cols-6 gap-2 mb-2 items-end">
                <div><Label className="text-[10px]">Loan Type</Label><Input value={ln.loanTypeName} onChange={e => updateLoan(ln.id, { loanTypeName: e.target.value })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Principal (₹)</Label><Input type="number" value={ln.principalAmount || ''} onChange={e => updateLoan(ln.id, { principalAmount: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">EMI (₹)</Label><Input type="number" value={ln.emiAmount || ''} onChange={e => updateLoan(ln.id, { emiAmount: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Start Date</Label><SmartDateInput value={ln.startDate} onChange={v => updateLoan(ln.id, { startDate: v })} className="h-8 text-xs" /></div>
                <div><Label className="text-[10px]">Status</Label>
                  <Select value={ln.status} onValueChange={v => updateLoan(ln.id, { status: v as LoanDetail['status'] })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="foreclosed">Foreclosed</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeLoan(ln.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
              </div>
            ))}
          </div>
          <Separator />
          {/* LIC */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold">LIC / Insurance Policies</p>
              <Button size="sm" variant="outline" onClick={addLIC}><Plus className="h-3 w-3 mr-1" /> Add</Button>
            </div>
            {form.licPolicies.map(lp => (
              <div key={lp.id} className="grid grid-cols-6 gap-2 mb-2 items-end">
                <div><Label className="text-[10px]">Policy No</Label><Input value={lp.policyNo} onChange={e => updateLIC(lp.id, { policyNo: e.target.value })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Insurer</Label><Input value={lp.insurer} onChange={e => updateLIC(lp.id, { insurer: e.target.value })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Premium (₹)</Label><Input type="number" value={lp.premiumAnnual || ''} onChange={e => updateLIC(lp.id, { premiumAnnual: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Sum Assured (₹)</Label><Input type="number" value={lp.sumAssured || ''} onChange={e => updateLIC(lp.id, { sumAssured: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Due Date</Label><SmartDateInput value={lp.dueDate} onChange={v => updateLIC(lp.id, { dueDate: v })} className="h-8 text-xs" /></div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeLIC(lp.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
              </div>
            ))}
          </div>
          <Separator />
          {/* Misc */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">EL Opening Balance (days)</Label>
              <Input type="number" value={form.elOpeningBalance || ''} onChange={e => uf('elOpeningBalance', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Medical Reimb Cap (₹/year)</Label>
              <Input type="number" value={form.medicalRembCap || ''} onChange={e => uf('medicalRembCap', parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
            </div>
          </div>
          <Separator />
          {/* Previous Employers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold">Previous Employer Details (Form 12BB)</p>
              <Button size="sm" variant="outline" onClick={addPrevEmp}><Plus className="h-3 w-3 mr-1" /> Add</Button>
            </div>
            {form.prevEmployerDetails.map(pe => (
              <div key={pe.id} className="grid grid-cols-5 gap-2 mb-2 items-end">
                <div><Label className="text-[10px]">Employer Name</Label><Input value={pe.employerName} onChange={e => updatePrevEmp(pe.id, { employerName: e.target.value })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">TAN</Label><Input value={pe.employerTAN} onChange={e => updatePrevEmp(pe.id, { employerTAN: e.target.value.toUpperCase() })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">Gross Salary (₹)</Label><Input type="number" value={pe.grossSalary || ''} onChange={e => updatePrevEmp(pe.id, { grossSalary: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <div><Label className="text-[10px]">TDS Deducted (₹)</Label><Input type="number" value={pe.tdsDeducted || ''} onChange={e => updatePrevEmp(pe.id, { tdsDeducted: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" onKeyDown={onEnterNext} /></div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removePrevEmp(pe.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EmployeeMaster() {
  return <EmployeeMasterPanel />;
}
