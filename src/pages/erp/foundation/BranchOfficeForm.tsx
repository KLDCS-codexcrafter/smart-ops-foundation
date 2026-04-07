/**
 * BranchOfficeForm.tsx — 4-section branch office form (NOT a wizard).
 * Standalone page with ERPHeader. SidebarProvider wrapper.
 * [JWT] Replace mock data with real API queries.
 */
import { useState, useCallback } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Building2, MapPin, Settings2, FileText, CalendarIcon, Loader2, Save,
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

// ── Constants ────────────────────────────────────────────────────────────────
const BRANCH_TYPES = [
  'Service Centre', 'Retail Store', 'Sales Office', 'Collection Centre',
  'Branch Office', 'Liaison Office', 'Project Site Office',
  'Support Office', 'Regional Office', 'Delivery Point',
];

const BRANCH_STATUSES = [
  'Active', 'Inactive', 'Under Setup', 'Temporarily Closed', 'Permanently Closed',
];

// [JWT] Mock parent companies for selector — from API
const MOCK_COMPANIES_FOR_BRANCH = [
  { id: 'parent-001', name: 'SmartOps Industries Pvt Ltd' },
  { id: 'c1', name: 'Sharma Traders Pvt Ltd' },
  { id: 'c2', name: 'SmartOps North India Pvt Ltd' },
];

// [JWT] Mock existing branches (for Parent Branch selector) — from API
const MOCK_EXISTING_BRANCHES = [
  { id: 'b1', name: 'Mumbai Service Centre', code: 'BR001' },
  { id: 'b2', name: 'Delhi Sales Office', code: 'BR002' },
];

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
};

interface BranchOfficeFormProps {
  mode: 'create' | 'edit';
  entityId?: string;
}

export default function BranchOfficeForm({ mode, entityId }: BranchOfficeFormProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<BranchFormData>({ ...INITIAL });
  const [saving, setSaving] = useState(false);
  const [estDate, setEstDate] = useState<Date>();
  const [setupOpen, setSetupOpen] = useState(false);
  const [savedEntityId] = useState(() => crypto.randomUUID());

  const upd = useCallback(<K extends keyof BranchFormData>(field: K, val: BranchFormData[K]) => {
    setForm(p => ({ ...p, [field]: val }));
  }, []);

  // Auto-suggest short code from name
  function suggestShort(name: string) {
    return name.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 4);
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      // [JWT] Replace with: POST /api/foundation/branch-offices
      toast.success('Branch Office saved', {
        description: '[JWT] Will persist to database.',
      });
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
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={breadcrumbs} showDatePicker={false} showCompany={false} />
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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
                  const pc = MOCK_COMPANIES_FOR_BRANCH.find(c => c.id === v);
                  if (pc) upd('parentCompanyName', pc.name);
                }}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{MOCK_COMPANIES_FOR_BRANCH.map(c => <SelectItem key={c.id} value={c.id}><span className="text-xs">{c.name}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Parent Branch" hint="Optional. Use when this branch reports to another branch.">
                <Select value={form.parentBranchId} onValueChange={v => upd('parentBranchId', v)}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><span className="text-xs">None</span></SelectItem>
                    {MOCK_EXISTING_BRANCHES.map(b => (
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

          {/* Section 4 — Notes */}
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? 'Saving...' : 'Save Branch Office'}
            </Button>
          </div>
        </div>
      </div>
    </SidebarProvider>
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
