import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  GitBranch, Plus, Edit2, Search, ChevronDown, Check,
  MapPin, PauseCircle, PlayCircle, Trash2, Building,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { indianStates, getDistrictsByState, getCitiesByDistrict } from '@/data/india-geography';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { loadEntities } from '@/data/mock-entities';

// ─── Interfaces ──────────────────────────────────────────────

type UnitType =
  | 'branch_office'
  | 'division'
  | 'department'
  | 'regional_office'
  | 'factory_plant'
  | 'project_site';

interface BusinessUnitMasterDefinition {
  id: string;
  partyCode: string;
  name: string;
  shortCode: string;
  unitType: UnitType;
  parentEntityId: string;
  parentEntityName: string;
  headName: string;
  headDesignation: string;
  headMobile: string;
  headEmail: string;
  addressLine: string;
  stateCode: string;
  stateName: string;
  gstStateCode: string;
  districtCode: string;
  districtName: string;
  cityCode: string;
  cityName: string;
  pinCode: string;
  gstin: string;
  costCentreCode: string;
  isProfitCentre: boolean;
  openingDate: string;
  closingDate: string;
  status: 'active' | 'suspended';
  description: string;
  notes: string;
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reinstatedBy: string | null;
  reinstatedAt: string | null;
  reinstatedReason: string | null;
}

// ─── Constants ───────────────────────────────────────────────

const STORAGE_KEY = 'erp_group_business_unit_master';

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  branch_office: 'Branch Office',
  division: 'Division',
  department: 'Department',
  regional_office: 'Regional Office',
  factory_plant: 'Factory / Plant',
  project_site: 'Project Site',
};

const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  branch_office: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  division: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  department: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  regional_office: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  factory_plant: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  project_site: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const PHYSICAL_UNIT_TYPES: UnitType[] = ['branch_office', 'factory_plant', 'project_site'];

// ─── Storage Helpers ─────────────────────────────────────────

const loadUnits = (): BusinessUnitMasterDefinition[] => {
  // [JWT] GET /api/masters/business-units
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

const genUnitCode = (all: BusinessUnitMasterDefinition[]): string =>
  'BU-' + String(all.length + 1).padStart(6, '0');

const getCurrentUser = (): string => {
  try {
    // [JWT] GET /api/masters/business-units
    const u = JSON.parse(localStorage.getItem('erp_current_user') || '{}');
    return u.name || u.email || 'System Administrator';
  } catch { return 'System Administrator'; }
};

const formatAuditDateTime = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';
};

// ─── Default Form ────────────────────────────────────────────

const defaultForm: Omit<BusinessUnitMasterDefinition, 'id' | 'partyCode'> = {
  name: '',
  shortCode: '',
  unitType: 'branch_office',
  parentEntityId: '',
  parentEntityName: '',
  headName: '',
  headDesignation: '',
  headMobile: '',
  headEmail: '',
  addressLine: '',
  stateCode: '',
  stateName: '',
  gstStateCode: '',
  districtCode: '',
  districtName: '',
  cityCode: '',
  cityName: '',
  pinCode: '',
  gstin: '',
  costCentreCode: '',
  isProfitCentre: false,
  openingDate: '',
  closingDate: '',
  status: 'active',
  description: '',
  notes: '',
  suspendedBy: null, suspendedAt: null, suspendedReason: null,
  reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
};

// ─── Panel Component ─────────────────────────────────────────

export function BusinessUnitMasterPanel() {
  const [units, setUnits] = useState<BusinessUnitMasterDefinition[]>(() => loadUnits());
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BusinessUnitMasterDefinition | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [justSaved, setJustSaved] = useState(false);
  const [entities, setEntities] = useState<ReturnType<typeof loadEntities>>([]);

  // Suspend/Reinstate
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<BusinessUnitMasterDefinition | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [reinstateReason, setReinstateReason] = useState('');

  // Collapsible sections
  const [showAddress, setShowAddress] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    setEntities(loadEntities());
  }, []);

  // ─── Save ──────────────────────────────────────────────────
  const handleSave = () => {
    if (!addOpen && !editTarget) return;
    if (!form.name.trim()) return toast.error('Business Unit name is required');
    if (!form.shortCode.trim()) return toast.error('Short code is required');
    if (form.shortCode.length > 4) return toast.error('Short code must be 4 characters or less');
    if (!form.parentEntityId) return toast.error('Select a parent entity');
    const all = loadUnits();
    if (editTarget) {
      const updated = { ...editTarget, ...form };
      const idx = all.findIndex(u => u.id === editTarget.id);
      if (idx >= 0) all[idx] = updated;
      // [JWT] POST /api/masters/business-units
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      // [JWT] PUT /api/group/masters/business-units/:id
      toast.success(`${form.name} updated`);
    } else {
      const newUnit: BusinessUnitMasterDefinition = {
        ...form,
        id: crypto.randomUUID(),
        partyCode: genUnitCode(all),
      };
      all.push(newUnit);
      // [JWT] POST /api/masters/business-units
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      // [JWT] POST /api/group/masters/business-units
      toast.success(`${form.name} created`);
    }
    setUnits(loadUnits());
    setAddOpen(false); setEditTarget(null); setForm(defaultForm);
    setJustSaved(true); setTimeout(() => setJustSaved(false), 1500);
  };

  useCtrlS(handleSave);

  const openEdit = (unit: BusinessUnitMasterDefinition) => {
    const { id, partyCode, ...rest } = unit;
    setForm(rest);
    setEditTarget(unit);
  };

  const resetAndClose = () => {
    setAddOpen(false); setEditTarget(null); setForm(defaultForm);
    setShowAddress(false); setShowNotes(false);
  };

  // ─── Suspend / Reinstate ───────────────────────────────────
  const openSuspend = (unit: BusinessUnitMasterDefinition) => {
    setSuspendTarget(unit);
    setSuspendReason('');
    setSuspendDialogOpen(true);
  };

  const handleSuspend = () => {
    if (!suspendReason.trim()) return toast.error('Please provide a reason for suspension');
    if (!suspendTarget) return;
    const all = loadUnits();
    const idx = all.findIndex(u => u.id === suspendTarget.id);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        status: 'suspended',
        suspendedBy: getCurrentUser(),
        suspendedAt: new Date().toISOString(),
        suspendedReason: suspendReason.trim(),
      };
      // [JWT] POST /api/masters/business-units
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      // [JWT] PUT /api/group/masters/business-units/:id/suspend
      toast.success(`${suspendTarget.name} suspended`);
      setUnits(loadUnits());
    }
    setSuspendDialogOpen(false); setSuspendTarget(null); setSuspendReason('');
  };

  const openReinstate = (unit: BusinessUnitMasterDefinition) => {
    setSuspendTarget(unit);
    setReinstateReason('');
    setReinstateDialogOpen(true);
  };

  const handleReinstate = () => {
    if (!reinstateReason.trim()) return toast.error('Please provide a reason for reinstatement');
    if (!suspendTarget) return;
    const all = loadUnits();
    const idx = all.findIndex(u => u.id === suspendTarget.id);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        status: 'active',
        reinstatedBy: getCurrentUser(),
        reinstatedAt: new Date().toISOString(),
        reinstatedReason: reinstateReason.trim(),
      };
      // [JWT] POST /api/masters/business-units
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      // [JWT] PUT /api/group/masters/business-units/:id/reinstate
      toast.success(`${suspendTarget.name} reinstated`);
      setUnits(loadUnits());
    }
    setReinstateDialogOpen(false); setSuspendTarget(null); setReinstateReason('');
  };

  // ─── Delete ────────────────────────────────────────────────
  const handleDelete = (unit: BusinessUnitMasterDefinition) => {
    const all = loadUnits().filter(u => u.id !== unit.id);
    // [JWT] POST /api/masters/business-units
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    // [JWT] DELETE /api/group/masters/business-units/:id
    toast.success(`${unit.name} deleted`);
    setUnits(loadUnits());
  };

  // ─── Filtering ─────────────────────────────────────────────
  const filtered = units.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.name.toLowerCase().includes(s)
      || u.shortCode.toLowerCase().includes(s)
      || u.unitType.toLowerCase().includes(s)
      || UNIT_TYPE_LABELS[u.unitType].toLowerCase().includes(s)
      || u.headName.toLowerCase().includes(s);
  });

  const activeCount = units.filter(u => u.status === 'active').length;
  const suspendedCount = units.filter(u => u.status === 'suspended').length;

  // ─── Form JSX ──────────────────────────────────────────────
  const renderForm = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2" data-keyboard-form>
      {/* Section 1 — Identity */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Unit Type</Label>
          <Select value={form.unitType} onValueChange={v => setForm(f => ({ ...f, unitType: v as UnitType }))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(UNIT_TYPE_LABELS) as [UnitType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Business Unit Name *</Label>
          <Input value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={onEnterNext} placeholder="e.g. Mumbai Branch" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Short Code *</Label>
          <Input value={form.shortCode}
            onChange={e => setForm(f => ({ ...f, shortCode: e.target.value.toUpperCase().slice(0, 4) }))}
            onKeyDown={onEnterNext} placeholder="Max 4 chars" maxLength={4} />
          <p className="text-[10px] text-muted-foreground">Used as entity prefix in transaction codes</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Parent Entity *</Label>
          <Select value={form.parentEntityId} onValueChange={v => {
            const ent = entities.find(e => e.id === v);
            setForm(f => ({ ...f, parentEntityId: v, parentEntityName: ent?.name ?? '' }));
          }}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select entity" /></SelectTrigger>
            <SelectContent>
              {entities.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 2 — Head / Contact */}
      <div className="space-y-4">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Head / Contact</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Head Name</Label>
            <Input value={form.headName}
              onChange={e => setForm(f => ({ ...f, headName: e.target.value }))}
              onKeyDown={onEnterNext} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Designation</Label>
            <Input value={form.headDesignation}
              onChange={e => setForm(f => ({ ...f, headDesignation: e.target.value }))}
              onKeyDown={onEnterNext} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Mobile</Label>
            <Input value={form.headMobile}
              onChange={e => setForm(f => ({ ...f, headMobile: e.target.value }))}
              onKeyDown={onEnterNext} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={form.headEmail}
              onChange={e => setForm(f => ({ ...f, headEmail: e.target.value }))}
              onKeyDown={onEnterNext} />
          </div>
        </div>
      </div>

      {/* Section 3 — Address (only for physical unit types) */}
      {PHYSICAL_UNIT_TYPES.includes(form.unitType) && (
        <Collapsible open={showAddress} onOpenChange={setShowAddress}>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Address
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">State</Label>
                <Select value={form.stateCode} onValueChange={v => {
                  const st = indianStates.find(s => s.code === v);
                  if (st) setForm(f => ({
                    ...f, stateCode: st.code, stateName: st.name, gstStateCode: st.gstStateCode,
                    districtCode: '', districtName: '', cityCode: '', cityName: '',
                  }));
                }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {indianStates.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.gstStateCode && (
                  <Badge variant="outline" className="mt-1 bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px]">
                    GST State Code: {form.gstStateCode}
                  </Badge>
                )}
              </div>
              <div>
                <Label className="text-xs">District</Label>
                <Select value={form.districtCode} onValueChange={v => {
                  const d = getDistrictsByState(form.stateCode).find(x => x.code === v);
                  if (d) setForm(f => ({ ...f, districtCode: d.code, districtName: d.name, cityCode: '', cityName: '' }));
                }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {getDistrictsByState(form.stateCode).map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">City</Label>
                <Select value={form.cityCode} onValueChange={v => {
                  const c = getCitiesByDistrict(form.districtCode).find(x => x.code === v);
                  if (c) setForm(f => ({ ...f, cityCode: c.code, cityName: c.name }));
                }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {getCitiesByDistrict(form.districtCode).map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Pin Code</Label>
                <Input value={form.pinCode}
                  onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))}
                  onKeyDown={onEnterNext} maxLength={6} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Address Line</Label>
              <Input value={form.addressLine}
                onChange={e => setForm(f => ({ ...f, addressLine: e.target.value }))}
                onKeyDown={onEnterNext} placeholder="Full address" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GSTIN</Label>
              <Input value={form.gstin}
                onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                onKeyDown={onEnterNext} placeholder="Only if separately GST registered" className="font-mono text-xs" maxLength={15} />
              <p className="text-[10px] text-muted-foreground">Only if separately GST registered</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Section 4 — Accounting */}
      <div className="space-y-4">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accounting</Label>
        <div className="space-y-1.5">
          <Label className="text-xs">Cost Centre Code</Label>
          <Input value={form.costCentreCode}
            onChange={e => setForm(f => ({ ...f, costCentreCode: e.target.value }))}
            onKeyDown={onEnterNext} />
          <p className="text-[10px] text-muted-foreground">Accounting identifier for this unit</p>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.isProfitCentre} onCheckedChange={v => setForm(f => ({ ...f, isProfitCentre: v }))} />
          <Label className="text-xs">Is Profit Centre (tracks P&L separately)</Label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Opening Date</Label>
          <SmartDateInput value={form.openingDate}
            onChange={v => setForm(f => ({ ...f, openingDate: v }))} />
        </div>
      </div>

      {/* Section 5 — Notes */}
      <Collapsible open={showNotes} onOpenChange={setShowNotes}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <Building className="h-4 w-4 text-muted-foreground" />
            Notes
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              onKeyDown={onEnterNext} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Main Render ───────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600" /> Business Unit Master
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Internal branches, divisions, departments, and operational units</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setAddOpen(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Business Unit
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <span className="text-muted-foreground">Total <strong className="text-foreground">{units.length}</strong></span>
        <span className="text-muted-foreground">Active <strong className="text-teal-600">{activeCount}</strong></span>
        <span className="text-muted-foreground">Suspended <strong className="text-amber-600">{suspendedCount}</strong></span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search business units..." className="pl-9 h-9" />
      </div>

      {/* Table or Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">No business units yet</p>
          <p className="text-xs mt-1">Add your first branch, division, or department to start tracking operations by unit.</p>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 mt-4">
            <Plus className="h-3.5 w-3.5" /> Add Business Unit
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Head</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Short Code</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id} className={`${item.status === 'suspended' ? 'opacity-60' : ''} group`}>
                  <TableCell className="font-mono text-xs text-blue-600">{item.partyCode}</TableCell>
                  <TableCell className="text-xs font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${UNIT_TYPE_COLORS[item.unitType]}`}>
                      {UNIT_TYPE_LABELS[item.unitType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entities.find(e => e.id === item.parentEntityId)?.shortCode ?? item.parentEntityName}
                  </TableCell>
                  <TableCell className="text-xs">{item.headName || '\u2014'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${
                      item.status === 'active'
                        ? 'bg-green-500/10 text-green-700 border-green-500/30'
                        : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                    }`}>
                      {item.status === 'active' ? '● Active' : '● Suspended'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{item.shortCode}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-7 text-[10px] gap-1">
                        <Edit2 className="h-3 w-3" /> Edit
                      </Button>
                      {item.status === 'active' ? (
                        <Button variant="ghost" size="sm" onClick={() => openSuspend(item)} className="h-7 text-[10px] gap-1 text-amber-600">
                          <PauseCircle className="h-3 w-3" /> Suspend
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => openReinstate(item)} className="h-7 text-[10px] gap-1 text-green-600">
                          <PlayCircle className="h-3 w-3" /> Reinstate
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="h-7 text-[10px] gap-1 text-destructive">
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={addOpen || !!editTarget} onOpenChange={v => { if (!v) resetAndClose(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Edit — ${editTarget.name}` : 'Add Business Unit'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update business unit details.' : 'Create a new branch, division, or operational unit.'}
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button onClick={handleSave} data-primary className={justSaved ? 'gap-1.5' : ''}>
              {justSaved ? <><Check className="h-3.5 w-3.5" /> Saved</> : editTarget ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={v => { if (!v) { setSuspendDialogOpen(false); setSuspendTarget(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600">Suspend Business Unit</DialogTitle>
            <DialogDescription>
              Suspending <strong>{suspendTarget?.name}</strong>. This will mark it inactive across all modules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Reason for Suspension *</Label>
            <Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
              placeholder="Why is this unit being suspended?" rows={3} />
            <div className="text-[10px] text-muted-foreground space-y-1">
              <p>Suspended by: <strong>{getCurrentUser()}</strong></p>
              <p>Date/Time: <strong>{formatAuditDateTime(new Date().toISOString())}</strong></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSuspendDialogOpen(false); setSuspendTarget(null); }}>Cancel</Button>
            <Button onClick={handleSuspend} className="bg-amber-600 hover:bg-amber-700 text-white">Suspend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reinstate Dialog */}
      <Dialog open={reinstateDialogOpen} onOpenChange={v => { if (!v) { setReinstateDialogOpen(false); setSuspendTarget(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600">Reinstate Business Unit</DialogTitle>
            <DialogDescription>
              Reinstating <strong>{suspendTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Reason for Reinstatement *</Label>
            <Textarea value={reinstateReason} onChange={e => setReinstateReason(e.target.value)}
              placeholder="Why is this unit being reinstated?" rows={3} />
            {suspendTarget?.suspendedAt && (
              <div className="text-[10px] text-muted-foreground border-t pt-2 space-y-1">
                <p>Previously suspended by: <strong>{suspendTarget.suspendedBy}</strong></p>
                <p>Suspended on: <strong>{formatAuditDateTime(suspendTarget.suspendedAt)}</strong></p>
                <p>Reason: <strong>{suspendTarget.suspendedReason}</strong></p>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground space-y-1">
              <p>Reinstated by: <strong>{getCurrentUser()}</strong></p>
              <p>Date/Time: <strong>{formatAuditDateTime(new Date().toISOString())}</strong></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReinstateDialogOpen(false); setSuspendTarget(null); }}>Cancel</Button>
            <Button onClick={handleReinstate} className="bg-green-600 hover:bg-green-700 text-white">Reinstate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page Wrapper ─────────────────────────────────────────────

export default function BusinessUnitMaster() {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <div className="flex-1">
          <ERPHeader breadcrumbs={[{ label: 'Masters' }, { label: 'Business Unit Master' }]} />
          <div className="p-6 max-w-7xl mx-auto">
            <BusinessUnitMasterPanel />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
