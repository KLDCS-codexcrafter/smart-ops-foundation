/**
 * BranchOfficeForm.tsx — 4-section branch office form (NOT a wizard).
 * Standalone page with ERPHeader. SidebarProvider wrapper.
 * [JWT] Replace mock data with real API queries.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Building2, MapPin, Settings2, FileText, CalendarIcon, Loader2, Save, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { FormSection } from '@/components/company/FormSection';
import { FormField } from '@/components/company/FormField';
import { INDIAN_STATE_NAMES } from '@/lib/india-validations';
import { cn } from '@/lib/utils';
import { EntitySetupDialog } from '@/components/foundation/EntitySetupDialog';
import { onEnterNext } from '@/lib/keyboard';

// ── Constants ────────────────────────────────────────────────────────────────
const BRANCH_TYPES = [
  // Commercial
  'Branch Office', 'Regional Office', 'Sales Office', 'Collection Centre',
  'Retail Store', 'Service Centre', 'Delivery Point',
  // Industrial
  'Factory', 'Manufacturing Plant', 'Warehouse', 'Depot',
  'Distribution Centre', 'Processing Unit', 'Data Centre', 'R&D Centre',
  // Administrative
  'Liaison Office', 'Project Site Office', 'Support Office',
];

const BRANCH_STATUSES = [
  'Active', 'Inactive', 'Under Setup', 'Temporarily Closed', 'Permanently Closed',
];

// Parent companies + branches loaded dynamically from localStorage (see useMemo below)

const BRANCH_TYPE_COLORS: Record<string, string> = {
  'Service Centre': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Retail Store': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Sales Office': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Collection Centre': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Branch Office': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'Regional Office': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Liaison Office': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Project Site Office': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Support Office': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  'Delivery Point': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  'Factory': 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  'Manufacturing Plant': 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  'Warehouse': 'bg-stone-500/10 text-stone-700 border-stone-500/20',
  'Depot': 'bg-stone-500/10 text-stone-700 border-stone-500/20',
  'Distribution Centre': 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  'Processing Unit': 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  'Data Centre': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  'R&D Centre': 'bg-violet-500/10 text-violet-700 border-violet-500/20',
};

const BUSINESS_ACTIVITIES = [
  'Manufacturing', 'Trading', 'Services', 'IT Services', 'Consulting',
  'Import / Export', 'Distribution',
];

interface BranchFormData {
  name: string; code: string; shortCode: string;
  branchType: string; parentCompanyId: string; parentCompanyName: string;
  parentBranchId: string; status: string;
  address: string; city: string; state: string; pincode: string;
  contactPerson: string; contactEmail: string; contactPhone: string;
  operatingHours: string;
  branchHead: string; establishmentDate: string; officeArea: string;
  employeeCapacity: string; operatingLicenseNo: string; branchRegistrationNo: string;
  notes: string;
  businessActivity: string;
  jurisdiction: string;
  // Statutory registrations (branch-level)
  gstinNo: string;
  tanNo: string;
  pfEstablishmentCode: string;
  esicSubCode: string;
  ptRegNo: string;
  lwfRegNo: string;
}

const INITIAL: BranchFormData = {
  name: '', code: '', shortCode: '',
  branchType: '', parentCompanyId: '', parentCompanyName: '',
  parentBranchId: '', status: 'Active',
  address: '', city: '', state: '', pincode: '',
  contactPerson: '', contactEmail: '', contactPhone: '',
  operatingHours: '',
  branchHead: '', establishmentDate: '', officeArea: '',
  employeeCapacity: '', operatingLicenseNo: '', branchRegistrationNo: '',
  notes: '',
  businessActivity: 'Services',
  jurisdiction: '',
  gstinNo: '', tanNo: '', pfEstablishmentCode: '', esicSubCode: '',
  ptRegNo: '', lwfRegNo: '',
};

interface BranchOfficeFormProps {
  mode: 'create' | 'edit';
  entityId?: string;
}

export function BranchOfficeFormPanel({ mode, entityId }: BranchOfficeFormProps) {
  const navigate = useNavigate();
  // [JWT] GET /api/foundation/branch-offices
  const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k)||'[]'); } catch { return []; } };
  const [form, setForm] = useState<BranchFormData>({ ...INITIAL });
  const [saving, setSaving] = useState(false);
  const [estDate, setEstDate] = useState<Date>();
  const [setupOpen, setSetupOpen] = useState(false);
  const [savedEntityId] = useState(() => crypto.randomUUID());

  const upd = useCallback(<K extends keyof BranchFormData>(field: K, val: BranchFormData[K]) => {
    setForm(p => ({ ...p, [field]: val }));
  }, []);

  // Dynamic parent company picker
  const parentCompanyOptions = useMemo(() => {
    // [JWT] GET /api/foundation/branch-offices
    const parentRecord = (() => { try { const v = localStorage.getItem('erp_parent_company'); return v ? JSON.parse(v) : null; } catch { return null; } })();
    const companies: any[] = ls('erp_companies');
    const options: {id: string; name: string}[] = [];
    if (parentRecord?.legalEntityName) options.push({ id: 'parent-root', name: parentRecord.legalEntityName });
    companies.forEach(c => { if (c.id && c.legalEntityName) options.push({ id: c.id, name: c.legalEntityName }); });
    if (options.length === 0) options.push({ id: 'parent-001', name: 'SmartOps Industries Pvt Ltd' });
    return options;
  }, []);

  // Dynamic existing branches
  const existingBranches = useMemo(() =>
    ls<any>('erp_branch_offices')
      .filter((b: any) => b.id && b.name && b.id !== entityId)
      .map((b: any) => ({ id: b.id, name: b.name, code: b.code || '' })),
  []);

  // Load data in edit mode
  useEffect(() => {
    if (mode !== 'edit' || !entityId) return;
    const records: any[] = ls('erp_branch_offices');
    const existing = records.find(r => r.id === entityId);
    if (existing) setForm(prev => ({ ...prev, ...existing }));
  }, []); // eslint-disable-line

  // Auto-suggest short code from name
  function suggestShort(name: string) {
    return name.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 4);
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      const existing: any[] = ls('erp_branch_offices');
      const currentId = entityId ?? crypto.randomUUID();
      const record = {
        ...form, id: currentId, entity_type: 'branch',
        updated_at: new Date().toISOString(),
        created_at: existing.find(r => r.id === currentId)?.created_at ?? new Date().toISOString(),
      };
      const idx = existing.findIndex((r: any) => r.id === currentId);
      if (idx >= 0) existing[idx] = record; else existing.push(record);
      // [JWT] POST /api/foundation/branch-offices
      localStorage.setItem('erp_branch_offices', JSON.stringify(existing));
      /* [JWT] POST or PATCH /api/foundation/branch-offices */
      toast.success('Branch Office saved', { description: '[JWT] Will persist to database.' });
      setSetupOpen(true);
    }, 800);
  }

  const breadcrumbs = [
    { label: 'Operix Core', href: '/erp/dashboard' },
    { label: 'Command Center', href: '/erp/command-center' },
    { label: 'Foundation' },
    { label: 'Branch Offices', href: '/erp/foundation/branch-offices' },
    { label: mode === 'create' ? 'Create Branch Office' : 'Edit Branch Office' },
  ];

  return (
    <>
      <div data-keyboard-form className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {mode === 'create' ? 'Create Branch Office' : 'Edit Branch Office'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Add a new operational location — service centre, store, office, or delivery point.
            </p>
          </div>

          {/* Section 1 — Identity */}
          <FormSection title="Identity" icon={<Building2 className="h-4 w-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Name" required>
                <Input
                  value={form.name}
                  onChange={e => {
                    upd('name', e.target.value);
                    if (!form.shortCode) upd('shortCode', suggestShort(e.target.value));
                  }}
                  placeholder="e.g. Mumbai Service Centre"
                  className="text-xs"
                />
              </FormField>
              <FormField label="Code" required hint="e.g. BR-MUM-001">
                <Input value={form.code} onChange={e => upd('code', e.target.value)} placeholder="BR-MUM-001" className="text-xs font-mono" />
              </FormField>
              <FormField label="Short Code" hint="3-4 chars">
                <Input value={form.shortCode} onChange={e => upd('shortCode', e.target.value.toUpperCase().slice(0, 4))} maxLength={4} className="text-xs font-mono" />
              </FormField>
              <FormField label="Branch Type" required>
                <div className="flex items-center gap-2">
                  <Select value={form.branchType} onValueChange={v => upd('branchType', v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{BRANCH_TYPES.map(t => <SelectItem key={t} value={t}><span className="text-xs">{t}</span></SelectItem>)}</SelectContent>
                  </Select>
                  {form.branchType && (
                    <Badge className={cn('text-[10px] shrink-0', BRANCH_TYPE_COLORS[form.branchType] ?? 'bg-muted text-foreground')}>
                      {form.branchType}
                    </Badge>
                  )}
                </div>
              </FormField>
              <FormField label="Parent Company" required>
                <Select value={form.parentCompanyId} onValueChange={v => {
                  upd('parentCompanyId', v);
                  const pc = parentCompanyOptions.find(c => c.id === v);
                  if (pc) upd('parentCompanyName', pc.name);
                }}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{parentCompanyOptions.map(c => <SelectItem key={c.id} value={c.id}><span className="text-xs">{c.name}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Parent Branch" hint="Optional. Use when this branch reports to another branch.">
                <Select value={form.parentBranchId} onValueChange={v => upd('parentBranchId', v)}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><span className="text-xs">None</span></SelectItem>
                    {existingBranches.map(b => (
                      <SelectItem key={b.id} value={b.id}><span className="text-xs">{b.name} ({b.code})</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Business Activity" required hint="Determines which industry pack is loaded">
                <Select value={form.businessActivity} onValueChange={v => upd('businessActivity', v)}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select activity" /></SelectTrigger>
                  <SelectContent>{BUSINESS_ACTIVITIES.map(a => <SelectItem key={a} value={a}><span className="text-xs">{a}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={form.status} onValueChange={v => upd('status', v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{BRANCH_STATUSES.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>
          </FormSection>

          {/* Section 2 — Location & Contact */}
          <FormSection title="Location & Contact" icon={<MapPin className="h-4 w-4" />}>
            <div className="space-y-4">
              <FormField label="Address">
                <Input value={form.address} onChange={e => upd('address', e.target.value)} placeholder="Full address line" className="text-xs" />
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="City" required>
                  <Input value={form.city} onChange={e => upd('city', e.target.value)} className="text-xs" />
                </FormField>
                <FormField label="State">
                  <Select value={form.state} onValueChange={v => upd('state', v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{INDIAN_STATE_NAMES.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Pincode">
                  <Input value={form.pincode} onChange={e => upd('pincode', e.target.value)} maxLength={6} className="text-xs font-mono" />
                </FormField>
                <FormField label="Operating Hours" hint="Mon–Fri 9AM–6PM">
                  <Input value={form.operatingHours} onChange={e => upd('operatingHours', e.target.value)} placeholder="Mon–Fri 9AM–6PM" className="text-xs" />
                </FormField>
              </div>
              <FormField label="Jurisdiction" hint="Legal jurisdiction for this branch's documents. Auto-populates from parent company if left blank.">
                <Input
                  value={form.jurisdiction}
                  onChange={e => upd('jurisdiction', e.target.value)}
                  placeholder="e.g. Subject to Pune, Maharashtra jurisdiction"
                  className="text-xs"
                />
              </FormField>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Contact Person">
                  <Input value={form.contactPerson} onChange={e => upd('contactPerson', e.target.value)} className="text-xs" />
                </FormField>
                <FormField label="Contact Email">
                  <Input type="email" value={form.contactEmail} onChange={e => upd('contactEmail', e.target.value)} className="text-xs" />
                </FormField>
                <FormField label="Contact Phone">
                  <Input value={form.contactPhone} onChange={e => upd('contactPhone', e.target.value)} className="text-xs" />
                </FormField>
              </div>
            </div>
          </FormSection>

          {/* Section 3 — Operational Details */}
          <FormSection title="Operational Details" icon={<Settings2 className="h-4 w-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Branch Head">
                <Input value={form.branchHead} onChange={e => upd('branchHead', e.target.value)} className="text-xs" />
              </FormField>
              <FormField label="Establishment Date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left text-xs font-normal', !estDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {form.establishmentDate || 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={estDate} onSelect={d => { setEstDate(d); if (d) upd('establishmentDate', format(d, 'dd MMM yyyy')); }} initialFocus />
                  </PopoverContent>
                </Popover>
              </FormField>
              <FormField label="Office Area (sq ft)">
                <Input type="number" value={form.officeArea} onChange={e => upd('officeArea', e.target.value)} className="text-xs" />
              </FormField>
              <FormField label="Employee Capacity">
                <Input type="number" value={form.employeeCapacity} onChange={e => upd('employeeCapacity', e.target.value)} className="text-xs" />
              </FormField>
              <FormField label="Operating License No">
                <Input value={form.operatingLicenseNo} onChange={e => upd('operatingLicenseNo', e.target.value)} className="text-xs font-mono" />
              </FormField>
              <FormField label="Branch Registration No">
                <Input value={form.branchRegistrationNo} onChange={e => upd('branchRegistrationNo', e.target.value)} className="text-xs font-mono" />
              </FormField>
            </div>
          </FormSection>

          {/* Section 4 — Statutory Registrations */}
          <FormSection title="Statutory Registrations" icon={<Shield className="h-4 w-4" />}>
            <p className="text-xs text-muted-foreground mb-3">
              Branch-level statutory registrations. Each branch / factory maintains its own
              PF establishment code and ESIC sub-code even under the same company.
              Leave blank if shared with parent company.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="GSTIN" hint="Only if this branch has its own GST registration">
                <Input value={form.gstinNo} onChange={e => upd('gstinNo', e.target.value.toUpperCase())}
                  placeholder="e.g. 27AAAAA0000A1Z5" maxLength={15} className="text-xs font-mono" />
              </FormField>
              <FormField label="TAN" hint="Branch TAN if separate from company TAN">
                <Input value={form.tanNo} onChange={e => upd('tanNo', e.target.value.toUpperCase())}
                  placeholder="e.g. MUMR12345A" maxLength={10} className="text-xs font-mono" />
              </FormField>
              <FormField label="PF Establishment Code" hint="EPFO code assigned to this branch or factory">
                <Input value={form.pfEstablishmentCode} onChange={e => upd('pfEstablishmentCode', e.target.value)}
                  placeholder="e.g. MH/MUM/12345" className="text-xs font-mono" />
              </FormField>
              <FormField label="ESIC Sub-Code" hint="ESIC sub-code assigned to this branch">
                <Input value={form.esicSubCode} onChange={e => upd('esicSubCode', e.target.value)}
                  placeholder="e.g. 51-000-12345-000" className="text-xs font-mono" />
              </FormField>
              <FormField label="Professional Tax Reg No" hint="State PT registration for employees at this location">
                <Input value={form.ptRegNo} onChange={e => upd('ptRegNo', e.target.value)}
                  className="text-xs font-mono" />
              </FormField>
              <FormField label="LWF Registration No" hint="Labour Welfare Fund — state-specific">
                <Input value={form.lwfRegNo} onChange={e => upd('lwfRegNo', e.target.value)}
                  className="text-xs font-mono" />
              </FormField>
            </div>
          </FormSection>

          {/* Section 5 — Notes */}
          <FormSection title="Notes" icon={<FileText className="h-4 w-4" />}>
            <Textarea
              value={form.notes}
              onChange={e => upd('notes', e.target.value)}
              rows={4}
              placeholder="Any additional notes about this branch..."
              className="text-xs"
            />
          </FormSection>

          {/* Bottom actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => navigate('/erp/foundation/branch-offices')}>
              Cancel
            </Button>
            <Button data-primary onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? 'Saving...' : 'Save Branch Office'}
            </Button>
          </div>
        </div>
    <EntitySetupDialog
      open={setupOpen}
      onOpenChange={setSetupOpen}
      entityName={form.name}
      entityId={savedEntityId}
      shortCode={form.shortCode}
      entityType="branch"
      businessEntity="Branch Office"
      industry={form.branchType ?? 'Others'}
      businessActivity={form.businessActivity}
      onComplete={(result) => {
        toast.success(`${form.name} is ready. ${result.ledgersCreated} ledgers created.`);
        navigate('/erp/foundation/branch-offices');
      }}
    />
    </>
  );
}

export default function BranchOfficeForm(props: BranchOfficeFormProps) {
  const breadcrumbs = [
    { label: 'Operix Core', href: '/erp/dashboard' },
    { label: 'Command Center', href: '/erp/command-center' },
    { label: 'Foundation' },
    { label: 'Branch Offices', href: '/erp/foundation/branch-offices' },
    { label: props.mode === 'create' ? 'Create Branch Office' : 'Edit Branch Office' },
  ];

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={breadcrumbs} showDatePicker={false} showCompany={false} />
        <main className="p-6">
          <BranchOfficeFormPanel {...props} />
        </main>
      </div>
    </SidebarProvider>
  );
}
