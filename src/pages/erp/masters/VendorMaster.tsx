import { useState } from 'react';
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
  ShoppingCart, Plus, Edit2, Ban, CheckCircle2, Loader2, Search,
  ChevronDown, AlertTriangle, Info, Check, User, MapPin,
  CreditCard, Shield, Building, Landmark, Briefcase, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { indianStates, indianDistricts, getCitiesByDistrict, getDistrictsByState } from '@/data/india-geography';
import { onEnterNext, useCtrlS, amountInputProps, toIndianFormat } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { TDS_SECTIONS } from '@/data/compliance-seed-data';

// ─── Interfaces ──────────────────────────────────────────────

interface VendorContact {
  id: string;
  contactPerson: string;
  designation: string;
  phone: string;
  mobile: string;
  email: string;
  isPrimary: boolean;
}

type VendorType =
  | 'manufacturer'
  | 'trader'
  | 'distributor'
  | 'service_provider'
  | 'individual'
  | 'government'
  | 'other';

interface VendorMasterDefinition {
  id: string;
  partyCode: string;
  vendorType: VendorType;
  gstin: string;
  pan: string;
  cin: string;
  aadhaar: string;
  partyName: string;
  mailingName: string;
  contacts: VendorContact[];
  addressLine: string;
  stateCode: string;
  stateName: string;
  gstStateCode: string;
  districtCode: string;
  districtName: string;
  cityCode: string;
  cityName: string;
  pinCode: string;
  website: string;
  birthday: string;
  anniversary: string;
  openingBalance: number;
  creditDays: number;
  modeOfPaymentId: string;
  termsOfPaymentId: string;
  msmeRegistered: boolean;
  msmeUdyamNo: string;
  msmeCategory: 'micro' | 'small' | 'medium' | null;
  bankAccountHolder: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankName: string;
  bankBranchName: string;
  bankBranchCity: string;
  gstRegistrationType: 'regular' | 'composition' | 'unregistered' | 'sez' | 'government' | 'consumer';
  gstStateCode2: string;
  gstFilingType: 'monthly' | 'quarterly';
  einvoiceApplicable: boolean;
  tdsApplicable: boolean;
  tdsSection: string;
  lower_deduction_cert: string;    // Form 13 certificate number (blank = none)
  lower_deduction_rate: number;    // e.g. 5 (for 5% instead of 10%)
  lower_deduction_expiry: string;  // ISO date. Empty = certificate not set
  defaultBranch: string;
  businessMode: 'b2b' | 'b2c' | 'export' | 'import' | 'both';
  typeOfBusinessEntity:
    | 'private_limited' | 'public_limited' | 'llp' | 'partnership'
    | 'proprietor' | 'opc' | 'huf' | 'individual' | 'trust' | 'other';
  natureOfBusiness: string;
  businessActivity: string;
  referredBy: string;
  associatedDealer: string;
  otherReference: string;
  businessHours: string;
  saleType: 'credit' | 'cash' | 'advance' | 'lc' | 'mixed';
  termsOfDeliveryId: string;
  dispatchMode: 'road' | 'rail' | 'air' | 'sea' | 'courier' | 'hand' | '';
  defaultTransporterId: string;
  defaultCourierId: string;
  primary_division_id: string;    // MIS — org structure division
  primary_department_id: string;  // MIS — org structure department
  status: 'active' | 'inactive';
  default_currency: string;  // ISO code — payment currency for this vendor
}

// ─── Storage ──────────────────────────────────────────────────

const STORAGE_KEY = 'erp_group_vendor_master';

const loadVendors = (): VendorMasterDefinition[] => {
  try {
    // [JWT] GET /api/masters/vendors
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  return [];
};

const saveVendors = (items: VendorMasterDefinition[]) => {
  // [JWT] POST /api/masters/vendors
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // [JWT] PUT /api/group/masters/vendor
};

const genPartyCode = (all: VendorMasterDefinition[]): string =>
  'VEN-' + String(all.length + 1).padStart(6, '0');

// ─── GSTIN Auto-Fill ──────────────────────────────────────────

const extractFromGstin = (gstin: string) => {
  if (gstin.length < 12) return null;
  const gstStateCode = gstin.slice(0, 2);
  const pan = gstin.slice(2, 12).toUpperCase();
  const state = indianStates.find(s => s.gstStateCode === gstStateCode);
  return { gstStateCode, pan, stateCode: state?.code ?? '', stateName: state?.name ?? '' };
};

// ─── Constants ────────────────────────────────────────────────

const VENDOR_TYPES: { value: VendorType; label: string }[] = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'trader', label: 'Trader' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'individual', label: 'Individual' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const defaultForm: Omit<VendorMasterDefinition, 'id' | 'partyCode'> = {
  vendorType: 'trader',
  gstin: '', pan: '', cin: '', aadhaar: '',
  partyName: '', mailingName: '',
  contacts: [],
  addressLine: '', stateCode: '', stateName: '', gstStateCode: '',
  districtCode: '', districtName: '', cityCode: '', cityName: '',
  pinCode: '', website: '', birthday: '', anniversary: '',
  openingBalance: 0, creditDays: 30,
  modeOfPaymentId: '', termsOfPaymentId: '',
  msmeRegistered: false, msmeUdyamNo: '', msmeCategory: null,
  bankAccountHolder: '', bankAccountNo: '', bankIfsc: '',
  bankName: '', bankBranchName: '', bankBranchCity: '',
  gstRegistrationType: 'regular', gstStateCode2: '',
  gstFilingType: 'monthly', einvoiceApplicable: false,
  tdsApplicable: false, tdsSection: '',
  lower_deduction_cert: '', lower_deduction_rate: 0, lower_deduction_expiry: '',
  defaultBranch: '', businessMode: 'b2b',
  // [JWT] GET /api/foundation/parent-company/base-currency
  default_currency: (() => { try { return localStorage.getItem('erp_base_currency') || 'INR'; } catch { return 'INR'; } })(),
  typeOfBusinessEntity: 'private_limited',
  natureOfBusiness: '', businessActivity: '',
  referredBy: '', associatedDealer: '', otherReference: '',
  businessHours: '', saleType: 'credit',
  termsOfDeliveryId: '', dispatchMode: '',
  defaultTransporterId: '', defaultCourierId: '',
  primary_division_id: '',
  primary_department_id: '',
  status: 'active',
};

// ─── Panel Component ──────────────────────────────────────────

export function VendorMasterPanel() {
  const [vendors, setVendors] = useState<VendorMasterDefinition[]>(() => loadVendors());
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VendorMasterDefinition | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<VendorType | 'all'>('all');
  const [gstinFetching, setGstinFetching] = useState(false);
  const [ifscFetching, setIfscFetching] = useState(false);

  const [showContacts, setShowContacts] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showFinancial, setShowFinancial] = useState(false);
  const [showMsme, setShowMsme] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [showTaxation, setShowTaxation] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [showLogistics, setShowLogistics] = useState(false);

  const [form, setForm] = useState(defaultForm);
  const [justSaved, setJustSaved] = useState(false);

  // ─── Dropdown helpers ────────────────────────────────────────
  const loadModeOptions = () => {
    // [JWT] GET /api/masters/vendors
    try { return JSON.parse(localStorage.getItem('erp_group_mode_of_payment') || '[]'); }
    catch { return []; }
  };
  const loadTermsOptions = () => {
    // [JWT] GET /api/masters/vendors
    try { return JSON.parse(localStorage.getItem('erp_group_terms_of_payment') || '[]'); }
    catch { return []; }
  };
  const loadDeliveryOptions = () => {
    // [JWT] GET /api/masters/vendors
    try { return JSON.parse(localStorage.getItem('erp_group_terms_of_delivery') || '[]'); }
    catch { return []; }
  };
  const loadTransporterOptions = () => {
    try {
      // [JWT] GET /api/masters/vendors
      const all = JSON.parse(localStorage.getItem('erp_group_logistic_master') || '[]');
      return all.filter((l: any) => l.logisticType === 'gta' && l.status === 'active');
    } catch { return []; }
  };
  const loadCourierOptions = () => {
    try {
      // [JWT] GET /api/masters/vendors
      const all = JSON.parse(localStorage.getItem('erp_group_logistic_master') || '[]');
      return all.filter((l: any) => l.logisticType === 'courier' && l.status === 'active');
    } catch { return []; }
  };

  // ─── GSTIN fetch ─────────────────────────────────────────────
  const fetchGstinDetails = async (gstin: string) => {
    if (gstin.replace(/\s/g, '').length !== 15) return;
    const structural = extractFromGstin(gstin);
    if (structural) {
      setForm(f => ({
        ...f,
        pan: structural.pan,
        gstStateCode: structural.gstStateCode,
        gstStateCode2: structural.gstStateCode,
        stateCode: structural.stateCode,
        stateName: structural.stateName,
      }));
    }
    setGstinFetching(true);
    try {
      const res = await fetch(
        `https://api.gst.gov.in/commonapi/v1.1/search?gstin=${gstin.toUpperCase()}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        const legalName = data?.taxpayerInfo?.lgnm ?? '';
        const tradeName = data?.taxpayerInfo?.tradeNam ?? '';
        const regType = data?.taxpayerInfo?.dty ?? '';
        if (legalName) {
          setForm(f => ({
            ...f,
            mailingName: f.mailingName || legalName,
            partyName: f.partyName || tradeName || legalName,
            gstRegistrationType: regType.toLowerCase().includes('composition') ? 'composition' : 'regular',
          }));
          toast.success('GSTIN details fetched');
        }
      }
    } catch {
      // Structural data already filled
    } finally {
      setGstinFetching(false);
    }
  };

  // ─── IFSC fetch ──────────────────────────────────────────────
  const fetchIfscDetails = async (ifsc: string) => {
    const cleaned = ifsc.trim().toUpperCase();
    if (cleaned.length !== 11) return;
    setIfscFetching(true);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${cleaned}`);
      if (!res.ok) throw new Error('IFSC not found');
      const data = await res.json();
      setForm(f => ({
        ...f,
        bankName: data.BANK ?? f.bankName,
        bankBranchName: data.BRANCH ?? '',
        bankBranchCity: data.CITY ?? data.DISTRICT ?? '',
      }));
      toast.success(`${data.BANK}, ${data.BRANCH}`);
    } catch {
      toast.error('IFSC details unavailable — fill manually');
    } finally {
      setIfscFetching(false);
    }
  };

  // ─── Save ────────────────────────────────────────────────────
  const handleSave = () => {
    if (!addOpen && !editTarget) return;
    if (!form.partyName.trim()) return toast.error('Party Name is required');
    const all = loadVendors();
    if (editTarget) {
      const updated = all.map(v => v.id === editTarget.id ? { ...v, ...form } : v);
      saveVendors(updated); setVendors(updated);
      toast.success(`${form.partyName} updated`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } else {
      const def: VendorMasterDefinition = {
        ...form,
        id: crypto.randomUUID(),
        partyCode: genPartyCode(all),
        mailingName: form.mailingName.trim() || form.partyName.trim(),
      };
      const updated = [...all, def];
      saveVendors(updated); setVendors(updated);
      toast.success(`${def.partyName} created`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    }
    setAddOpen(false); setEditTarget(null); setForm(defaultForm);
  };

  useCtrlS(handleSave);

  const openEdit = (item: VendorMasterDefinition) => {
    const { id, partyCode, ...rest } = item;
    setForm(rest);
    setEditTarget(item);
  };

  const toggleStatus = (item: VendorMasterDefinition) => {
    const all = loadVendors();
    const updated = all.map(v => v.id === item.id
      ? { ...v, status: v.status === 'active' ? 'inactive' as const : 'active' as const }
      : v);
    saveVendors(updated); setVendors(updated);
    toast.success(`${item.partyName} ${item.status === 'active' ? 'deactivated' : 'activated'}`);
  };

  const resetAndClose = () => {
    setAddOpen(false); setEditTarget(null); setForm(defaultForm);
    setShowContacts(false); setShowAddress(false); setShowFinancial(false);
    setShowMsme(false); setShowBank(false); setShowTaxation(false);
    setShowCompanyInfo(false); setShowLogistics(false);
  };

  // ─── Contacts helpers ───────────────────────────────────────
  const addContact = () => {
    setForm(f => ({
      ...f,
      contacts: [...f.contacts, {
        id: crypto.randomUUID(), contactPerson: '', designation: '',
        phone: '', mobile: '', email: '', isPrimary: f.contacts.length === 0,
      }],
    }));
  };
  const updateContact = (id: string, field: keyof VendorContact, value: string | boolean) => {
    setForm(f => ({
      ...f,
      contacts: f.contacts.map(c => {
        if (field === 'isPrimary' && value === true) {
          return c.id === id ? { ...c, isPrimary: true } : { ...c, isPrimary: false };
        }
        return c.id === id ? { ...c, [field]: value } : c;
      }),
    }));
  };
  const removeContact = (id: string) => {
    setForm(f => ({ ...f, contacts: f.contacts.filter(c => c.id !== id) }));
  };

  // ─── Filtering ──────────────────────────────────────────────
  const filtered = vendors.filter(v => {
    if (typeFilter !== 'all' && v.vendorType !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return v.partyName.toLowerCase().includes(s) || v.partyCode.toLowerCase().includes(s)
        || v.gstin.toLowerCase().includes(s) || v.mailingName.toLowerCase().includes(s);
    }
    return true;
  });

  const activeCount = vendors.filter(v => v.status === 'active').length;
  const msmeCount = vendors.filter(v => v.msmeRegistered).length;

  const activeTdsOptions = TDS_SECTIONS.filter(t => t.status === 'active');

  const getTypeBadgeClass = (type: VendorType) => {
    if (type === 'manufacturer') return 'bg-blue-500/15 text-blue-700 border-blue-500/30';
    if (type === 'trader') return 'bg-teal-500/15 text-teal-700 border-teal-500/30';
    if (type === 'service_provider') return 'bg-purple-500/15 text-purple-700 border-purple-500/30';
    if (type === 'individual') return 'bg-slate-500/15 text-slate-700 border-slate-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getTypeLabel = (type: VendorType) =>
    VENDOR_TYPES.find(t => t.value === type)?.label ?? type;

  // ─── Dialog Form ────────────────────────────────────────────

  const renderForm = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2" data-keyboard-form>
      {/* Section 1 — Party Profile (always visible) */}
      <div className="space-y-4">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor Type</Label>
        <div className="grid grid-cols-4 gap-2">
          {VENDOR_TYPES.map(t => (
            <button key={t.value} type="button"
              onClick={() => setForm(f => ({ ...f, vendorType: t.value }))}
              className={`px-3 py-2 text-xs rounded-lg border font-medium transition-colors text-left ${
                form.vendorType === t.value
                  ? 'bg-teal-500/15 text-teal-700 border-teal-500/40'
                  : 'bg-muted/30 text-muted-foreground border-border hover:border-teal-500/30'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* GSTIN */}
        <div className="space-y-1.5">
          <Label className="text-xs">GSTIN</Label>
          <div className="flex gap-2">
            <Input value={form.gstin}
              onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
              onBlur={() => { if (form.gstin.replace(/\s/g, '').length === 15) fetchGstinDetails(form.gstin); }}
              onKeyDown={onEnterNext} placeholder="e.g. 27AAACB1234A1Z5" className="font-mono text-xs" maxLength={15} />
            <Button type="button" variant="outline" size="icon" className="shrink-0"
              onClick={() => fetchGstinDetails(form.gstin)} disabled={gstinFetching}>
              {gstinFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {form.pan && (
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="bg-teal-500/10 text-teal-700 border-teal-500/30 text-[10px]">
                PAN: {form.pan}
              </Badge>
              {form.gstStateCode && (
                <Badge variant="outline" className="bg-teal-500/10 text-teal-700 border-teal-500/30 text-[10px]">
                  GST State: {form.gstStateCode}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Party Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Party Name *</Label>
          <Input value={form.partyName}
            onChange={e => setForm(f => ({ ...f, partyName: e.target.value }))}
            onKeyDown={onEnterNext} placeholder="Short name (internal)" />
        </div>

        {/* Mailing Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Mailing Name *</Label>
          <Input value={form.mailingName}
            onChange={e => setForm(f => ({ ...f, mailingName: e.target.value }))}
            onBlur={() => { if (!form.mailingName.trim()) setForm(f => ({ ...f, mailingName: f.partyName })); }}
            onKeyDown={onEnterNext} placeholder="Legal name (auto-copies from Party Name)" />
        </div>

        {/* CIN */}
        <div className="space-y-1.5">
          <Label className="text-xs">CIN</Label>
          <Input value={form.cin}
            onChange={e => setForm(f => ({ ...f, cin: e.target.value.toUpperCase() }))}
            onKeyDown={onEnterNext} placeholder="Company Identification Number" />
        </div>

        {/* Aadhaar — only for individual */}
        {form.vendorType === 'individual' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Aadhaar</Label>
            <Input value={form.aadhaar}
              onChange={e => setForm(f => ({ ...f, aadhaar: e.target.value }))}
              onKeyDown={onEnterNext} placeholder="12-digit Aadhaar" maxLength={12} />
          </div>
        )}

        {/* Opening Balance */}
        <div className="space-y-1.5">
          <Label className="text-xs">Opening Balance</Label>
          <div className="flex gap-2 items-center">
            <Input value={form.openingBalance || ''}
              onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) || 0 }))}
              onKeyDown={onEnterNext} {...amountInputProps} className="flex-1" />
            <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/30 text-[10px] shrink-0">
              Cr
            </Badge>
          </div>
        </div>
      </div>

      {/* Section 2 — Contacts */}
      <Collapsible open={showContacts} onOpenChange={setShowContacts}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <User className="h-4 w-4 text-muted-foreground" />
            Contacts ({form.contacts.length})
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          {form.contacts.map(c => (
            <div key={c.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Contact Person</Label>
                  <Input value={c.contactPerson} onKeyDown={onEnterNext}
                    onChange={e => updateContact(c.id, 'contactPerson', e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Designation</Label>
                  <Input value={c.designation} onKeyDown={onEnterNext}
                    onChange={e => updateContact(c.id, 'designation', e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Phone</Label>
                  <Input value={c.phone} onKeyDown={onEnterNext}
                    onChange={e => updateContact(c.id, 'phone', e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Mobile</Label>
                  <Input value={c.mobile} onKeyDown={onEnterNext}
                    onChange={e => updateContact(c.id, 'mobile', e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Email</Label>
                  <Input value={c.email} onKeyDown={onEnterNext}
                    onChange={e => updateContact(c.id, 'email', e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={c.isPrimary} onCheckedChange={v => updateContact(c.id, 'isPrimary', v)} />
                  <span className="text-[10px] text-muted-foreground">Primary</span>
                </div>
                {!c.isPrimary && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(c.id)} className="text-destructive h-6 text-[10px]">
                    <X className="h-3 w-3 mr-1" /> Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addContact} className="gap-1.5 text-xs">
            <Plus className="h-3 w-3" /> Add Contact
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 3 — Address */}
      <Collapsible open={showAddress} onOpenChange={setShowAddress}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Address
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div>
            <Label className="text-xs">Address Line</Label>
            <Input value={form.addressLine}
              onChange={e => setForm(f => ({ ...f, addressLine: e.target.value }))}
              onKeyDown={onEnterNext} placeholder="Full address" />
          </div>
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
                const d = indianDistricts.find(x => x.code === v);
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
              <Label className="text-xs">Pincode</Label>
              <Input value={form.pinCode}
                onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))}
                onKeyDown={onEnterNext} {...amountInputProps} maxLength={6} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Website</Label>
            <Input value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              onKeyDown={onEnterNext} placeholder="https://" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Birthday</Label>
              <SmartDateInput value={form.birthday}
                onChange={v => setForm(f => ({ ...f, birthday: v }))} />
            </div>
            <div>
              <Label className="text-xs">Anniversary</Label>
              <SmartDateInput value={form.anniversary}
                onChange={v => setForm(f => ({ ...f, anniversary: v }))} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 4 — Financial Details */}
      <Collapsible open={showFinancial} onOpenChange={setShowFinancial}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Financial Details
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div>
            <Label className="text-xs">Opening Balance</Label>
            <div className="flex gap-2 items-center">
              <Input value={form.openingBalance || ''}
                onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) || 0 }))}
                onKeyDown={onEnterNext} {...amountInputProps} className="flex-1" />
              <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/30 text-[10px] shrink-0">Cr</Badge>
            </div>
          </div>
          <div>
            <Label className="text-xs">Payment Terms (days)</Label>
            <Input value={form.creditDays || ''}
              onChange={e => setForm(f => ({ ...f, creditDays: parseInt(e.target.value) || 0 }))}
              onKeyDown={onEnterNext} {...amountInputProps} />
          </div>
          <div>
            <Label className="text-xs">Mode of Payment</Label>
            <Select value={form.modeOfPaymentId} onValueChange={v => setForm(f => ({ ...f, modeOfPaymentId: v }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                {loadModeOptions().map((m: { id: string; name: string }) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Terms of Payment</Label>
            <Select value={form.termsOfPaymentId} onValueChange={v => setForm(f => ({ ...f, termsOfPaymentId: v }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select terms" /></SelectTrigger>
              <SelectContent>
                {loadTermsOptions().map((t: { id: string; name: string }) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Default Currency</Label>
            <Select value={form.default_currency} onValueChange={v => setForm(f => ({ ...f, default_currency: v }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(() => {
                  try {
                    // [JWT] GET /api/accounting/currencies
                    const curs: { id: string; iso_code: string; name: string; symbol: string; is_active: boolean; is_base_currency: boolean }[] =
                      // [JWT] GET /api/masters/vendors
                      JSON.parse(localStorage.getItem('erp_currencies') || '[]');
                    const active = curs.filter(c => c.is_active);
                    // [JWT] GET /api/masters/vendors
                    const base = localStorage.getItem('erp_base_currency') || 'INR';
                    if (!active.length) return <SelectItem value={base}>{base} (Base)</SelectItem>;
                    return active.map(c => (
                      <SelectItem key={c.id} value={c.iso_code}>
                        {c.symbol} {c.iso_code} — {c.name}{c.is_base_currency ? ' (Base)' : ''}
                      </SelectItem>
                    ));
                  } catch { return <SelectItem value="INR">₹ INR (Base)</SelectItem>; }
                })()}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">Purchase invoices from this vendor default to this currency.</p>
          </div>
          <div>
            <Label className="text-xs">Sale Type</Label>
            <Select value={form.saleType} onValueChange={v => setForm(f => ({ ...f, saleType: v as typeof f.saleType }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="advance">Advance</SelectItem>
                <SelectItem value="lc">Letter of Credit</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 5 — MSME Details */}
      <Collapsible open={showMsme} onOpenChange={setShowMsme}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            MSME Details
            {form.msmeRegistered && <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px] ml-1">MSME</Badge>}
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="flex items-center gap-3">
            <Switch checked={form.msmeRegistered} onCheckedChange={v => setForm(f => ({ ...f, msmeRegistered: v }))} />
            <Label className="text-xs">MSME Registered</Label>
          </div>
          {form.msmeRegistered && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Udyam Registration Number</Label>
                <Input value={form.msmeUdyamNo}
                  onChange={e => setForm(f => ({ ...f, msmeUdyamNo: e.target.value.toUpperCase() }))}
                  onKeyDown={onEnterNext} placeholder="UDYAM-MH-10-1234567" className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">MSME Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['micro', 'small', 'medium'] as const).map(cat => (
                    <button key={cat} type="button"
                      onClick={() => setForm(f => ({ ...f, msmeCategory: cat }))}
                      className={`py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                        form.msmeCategory === cat
                          ? 'bg-amber-500/15 text-amber-700 border-amber-500/40'
                          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                      }`}>{cat}</button>
                  ))}
                </div>
              </div>
              <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700">MSMED Act 2006 — 45-day payment rule</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Payment must be made within 45 days of invoice date. Delayed payment attracts
                      compound interest at 3x bank rate. Delay must be disclosed in annual report.
                      Amount becomes non-deductible for income tax until paid.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Section 6 — Bank Details */}
      <Collapsible open={showBank} onOpenChange={setShowBank}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            Bank Details
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div>
            <Label className="text-xs">Account Holder Name</Label>
            <Input value={form.bankAccountHolder}
              onChange={e => setForm(f => ({ ...f, bankAccountHolder: e.target.value }))}
              onBlur={() => { if (!form.bankAccountHolder.trim()) setForm(f => ({ ...f, bankAccountHolder: f.mailingName })); }}
              onKeyDown={onEnterNext} placeholder="Auto-copies from Mailing Name" />
          </div>
          <div>
            <Label className="text-xs">Bank Account Number</Label>
            <Input value={form.bankAccountNo} type="text"
              onChange={e => setForm(f => ({ ...f, bankAccountNo: e.target.value }))}
              onKeyDown={onEnterNext} placeholder="Account number (leading zeros preserved)" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">IFSC Code</Label>
            <div className="flex gap-2">
              <Input value={form.bankIfsc}
                onChange={e => setForm(f => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))}
                onBlur={() => { if (form.bankIfsc.trim().length === 11) fetchIfscDetails(form.bankIfsc); }}
                onKeyDown={onEnterNext} placeholder="e.g. SBIN0001234" className="font-mono text-xs" maxLength={11} />
              <Button type="button" variant="outline" size="icon" className="shrink-0"
                onClick={() => fetchIfscDetails(form.bankIfsc)} disabled={ifscFetching}>
                {ifscFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Bank Name</Label>
              <Input value={form.bankName} readOnly className="bg-muted/30 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Branch Name</Label>
              <Input value={form.bankBranchName} readOnly className="bg-muted/30 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Branch City</Label>
              <Input value={form.bankBranchCity} readOnly className="bg-muted/30 text-xs" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">IFSC auto-fills bank and branch details. Used for direct NEFT/RTGS payment from payment voucher.</p>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 7 — Taxation Details */}
      <Collapsible open={showTaxation} onOpenChange={setShowTaxation}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Taxation Details
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div>
            <Label className="text-xs">Registration Type</Label>
            <Select value={form.gstRegistrationType} onValueChange={v => setForm(f => ({ ...f, gstRegistrationType: v as typeof f.gstRegistrationType }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="composition">Composition</SelectItem>
                <SelectItem value="unregistered">Unregistered</SelectItem>
                <SelectItem value="sez">SEZ</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="consumer">Consumer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ITC Warning — Composition */}
          {form.gstRegistrationType === 'composition' && (
            <div className="border border-red-500/30 rounded-lg p-3 bg-red-500/5">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-600">No ITC on purchases from this vendor</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Composition taxpayers cannot charge GST separately.
                    Input Tax Credit is NOT available on these purchases.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* RCM Warning — Unregistered */}
          {form.gstRegistrationType === 'unregistered' && (
            <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">RCM may apply — Section 9(4)</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Purchases from unregistered vendors may attract Reverse Charge Mechanism.
                    Confirm applicability with your CA.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">PAN</Label>
            <Input value={form.pan} readOnly className="bg-muted/30 text-xs font-mono" placeholder="Auto from GSTIN" />
          </div>
          <div>
            <Label className="text-xs">CIN</Label>
            <Input value={form.cin} readOnly className="bg-muted/30 text-xs" />
          </div>
          {form.vendorType === 'individual' && (
            <div>
              <Label className="text-xs">Aadhaar</Label>
              <Input value={form.aadhaar} readOnly className="bg-muted/30 text-xs" />
            </div>
          )}
          <div>
            <Label className="text-xs">GST Filing Type</Label>
            <Select value={form.gstFilingType} onValueChange={v => setForm(f => ({ ...f, gstFilingType: v as typeof f.gstFilingType }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly (QRMP)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.einvoiceApplicable} onCheckedChange={v => setForm(f => ({ ...f, einvoiceApplicable: v }))} />
            <Label className="text-xs">E-Invoice Applicable</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.tdsApplicable} onCheckedChange={v => setForm(f => ({ ...f, tdsApplicable: v }))} />
            <Label className="text-xs">TDS Applicable</Label>
          </div>
          {form.tdsApplicable && (
            <>
              <div>
                <Label className="text-xs">TDS Section</Label>
                <Select value={form.tdsSection} onValueChange={v => setForm(f => ({ ...f, tdsSection: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select TDS section" /></SelectTrigger>
                  <SelectContent>
                    {activeTdsOptions.map(t => (
                      <SelectItem key={t.sectionCode} value={t.sectionCode}>
                        {t.sectionCode} — {t.natureOfPayment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Lower Deduction Certificate (Form 13) */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center gap-2 w-full text-left py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <ChevronDown className="h-3 w-3" />
                    Lower Deduction Certificate (Form 13)
                    {form.lower_deduction_cert && (
                      form.lower_deduction_expiry && form.lower_deduction_expiry < new Date().toISOString().split('T')[0]
                        ? <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-600 border-red-500/30 ml-1">EXPIRED</Badge>
                        : <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/30 ml-1">Active</Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2 pl-5">
                  <div>
                    <Label className="text-xs">Certificate Number</Label>
                    <Input value={form.lower_deduction_cert}
                      onChange={e => setForm(f => ({ ...f, lower_deduction_cert: e.target.value }))}
                      onKeyDown={onEnterNext} placeholder="Form 13 cert number" className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Lower Rate (%)</Label>
                    <Input type="number" value={form.lower_deduction_rate || ''}
                      onChange={e => setForm(f => ({ ...f, lower_deduction_rate: parseFloat(e.target.value) || 0 }))}
                      onKeyDown={onEnterNext} placeholder="e.g. 5" className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Expiry Date</Label>
                    <Input type="date" value={form.lower_deduction_expiry}
                      onChange={e => setForm(f => ({ ...f, lower_deduction_expiry: e.target.value }))}
                      onKeyDown={onEnterNext} className="text-xs" />
                  </div>
                  {form.lower_deduction_cert && form.lower_deduction_expiry && form.lower_deduction_expiry < new Date().toISOString().split('T')[0] && (
                    <div className="border border-red-500/30 rounded-lg p-2 bg-red-500/5">
                      <p className="text-[10px] text-red-600 font-medium">Certificate expired — standard TDS rate will apply.</p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Section 8 — Company Info & Logistics */}
      <Collapsible open={showCompanyInfo} onOpenChange={setShowCompanyInfo}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <Building className="h-4 w-4 text-muted-foreground" />
            Company Info
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div>
            <Label className="text-xs">Default Branch</Label>
            <Input value={form.defaultBranch}
              onChange={e => setForm(f => ({ ...f, defaultBranch: e.target.value }))}
              onKeyDown={onEnterNext} />
          </div>
          <div>
            <Label className="text-xs">Business Mode</Label>
            <Select value={form.businessMode} onValueChange={v => setForm(f => ({ ...f, businessMode: v as typeof f.businessMode }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="b2b">B2B</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="import">Import</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Primary Division</Label>
              <Select value={form.primary_division_id} onValueChange={v => setForm(f => ({ ...f, primary_division_id: v === '__none__' ? '' : v, primary_department_id: '' }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="— No Division" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No Division</SelectItem>
                  {(() => {
                    try {
                      // [JWT] GET /api/foundation/divisions
                      const divs: { id: string; name: string; status: string }[] = JSON.parse(localStorage.getItem('erp_divisions') || '[]');
                      return divs.filter(d => d.status === 'active').map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ));
                    } catch { return null; }
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Primary Department</Label>
              <Select value={form.primary_department_id} onValueChange={v => setForm(f => ({ ...f, primary_department_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="— No Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No Department</SelectItem>
                  {(() => {
                    try {
                      // [JWT] GET /api/foundation/departments
                      const depts: { id: string; name: string; division_id: string | null; status: string }[] = JSON.parse(localStorage.getItem('erp_departments') || '[]');
                      return depts
                        .filter(d => d.status === 'active' && (!form.primary_division_id || d.division_id === form.primary_division_id))
                        .map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ));
                    } catch { return null; }
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Select value={form.typeOfBusinessEntity} onValueChange={v => setForm(f => ({ ...f, typeOfBusinessEntity: v as typeof f.typeOfBusinessEntity }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private_limited">Pvt Ltd</SelectItem>
                <SelectItem value="public_limited">Public Ltd</SelectItem>
                <SelectItem value="llp">LLP</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="proprietor">Proprietor</SelectItem>
                <SelectItem value="opc">OPC</SelectItem>
                <SelectItem value="huf">HUF</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="trust">Trust</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nature of Business</Label>
            <Input value={form.natureOfBusiness}
              onChange={e => setForm(f => ({ ...f, natureOfBusiness: e.target.value }))}
              onKeyDown={onEnterNext} />
          </div>
          <div>
            <Label className="text-xs">Business Activity</Label>
            <Input value={form.businessActivity}
              onChange={e => setForm(f => ({ ...f, businessActivity: e.target.value }))}
              onKeyDown={onEnterNext} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Referred By</Label>
              <Input value={form.referredBy}
                onChange={e => setForm(f => ({ ...f, referredBy: e.target.value }))}
                onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Associated Dealer</Label>
              <Input value={form.associatedDealer}
                onChange={e => setForm(f => ({ ...f, associatedDealer: e.target.value }))}
                onKeyDown={onEnterNext} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Business Hours</Label>
              <Input value={form.businessHours}
                onChange={e => setForm(f => ({ ...f, businessHours: e.target.value }))}
                onKeyDown={onEnterNext} placeholder="e.g. Mon-Sat 9:00-18:00" />
            </div>
            <div>
              <Label className="text-xs">Other Reference</Label>
              <Input value={form.otherReference}
                onChange={e => setForm(f => ({ ...f, otherReference: e.target.value }))}
                onKeyDown={onEnterNext} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Terms of Delivery</Label>
            <Select value={form.termsOfDeliveryId} onValueChange={v => setForm(f => ({ ...f, termsOfDeliveryId: v }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select terms" /></SelectTrigger>
              <SelectContent>
                {loadDeliveryOptions().map((t: { id: string; name: string }) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Dispatch Mode</Label>
            <Select value={form.dispatchMode} onValueChange={v => setForm(f => ({ ...f, dispatchMode: v as typeof f.dispatchMode }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="road">Road</SelectItem>
                <SelectItem value="rail">Rail</SelectItem>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="sea">Sea</SelectItem>
                <SelectItem value="courier">Courier</SelectItem>
                <SelectItem value="hand">Hand Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Default Transporter</Label>
              <Select value={form.defaultTransporterId} onValueChange={v => setForm(f => ({ ...f, defaultTransporterId: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select GTA" /></SelectTrigger>
                <SelectContent>
                  {loadTransporterOptions().map((t: { id: string; partyName: string }) => (
                    <SelectItem key={t.id} value={t.id}>{t.partyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Default Courier</Label>
              <Select value={form.defaultCourierId} onValueChange={v => setForm(f => ({ ...f, defaultCourierId: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select courier" /></SelectTrigger>
                <SelectContent>
                  {loadCourierOptions().map((c: { id: string; partyName: string }) => (
                    <SelectItem key={c.id} value={c.id}>{c.partyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Main Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 font-display">
            <ShoppingCart className="h-5 w-5 text-teal-600" /> Vendor Master
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Sundry Creditor — Trade Payables (TPAY)</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setAddOpen(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Vendor
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <span className="text-muted-foreground">Total <strong className="text-foreground">{vendors.length}</strong></span>
        <span className="text-muted-foreground">Active <strong className="text-teal-600">{activeCount}</strong></span>
        <span className="text-muted-foreground">MSME Vendors <strong className="text-green-600">{msmeCount}</strong></span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, GSTIN..." className="pl-9 h-9" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(['all', ...VENDOR_TYPES.map(t => t.value)] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-[10px] rounded-full border font-medium whitespace-nowrap transition-colors ${
                typeFilter === t ? 'bg-teal-500/15 text-teal-700 border-teal-500/40' : 'text-muted-foreground border-border hover:bg-muted/50'
              }`}>
              {t === 'all' ? 'All' : getTypeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">No vendors yet</p>
          <p className="text-xs mt-1">Add your first vendor or supplier to get started.</p>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 mt-4">
            <Plus className="h-3.5 w-3.5" /> Add Vendor
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GSTIN</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MSME</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credit Days</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id} className={`${item.status === 'inactive' ? 'opacity-50' : ''} group`}>
                  <TableCell className="font-mono text-xs text-teal-600">{item.partyCode}</TableCell>
                  <TableCell className="text-xs font-medium">{item.partyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${getTypeBadgeClass(item.vendorType)}`}>
                      {getTypeLabel(item.vendorType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {item.gstin ? item.gstin.slice(0, 8) + '...' : '\u2014'}
                  </TableCell>
                  <TableCell className="text-xs">{item.stateName || '\u2014'}</TableCell>
                  <TableCell>
                    {item.msmeRegistered ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px] capitalize">
                          {item.msmeCategory || 'Yes'}
                        </Badge>
                      </div>
                    ) : <span className="text-muted-foreground">\u2014</span>}
                  </TableCell>
                  <TableCell className="text-xs">{item.creditDays} days</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${
                      item.status === 'active' ? 'bg-green-500/10 text-green-700 border-green-500/30' : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-7 text-[10px] gap-1">
                        <Edit2 className="h-3 w-3" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleStatus(item)}
                        className={`h-7 text-[10px] gap-1 ${item.status === 'active' ? 'text-destructive' : 'text-teal-600'}`}>
                        {item.status === 'active' ? <><Ban className="h-3 w-3" /> Deactivate</> : <><CheckCircle2 className="h-3 w-3" /> Activate</>}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Edit — ${editTarget.partyName}` : 'Add Vendor'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update vendor details.' : 'Create a new vendor or supplier (Sundry Creditor).'}
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
    </div>
  );
}

// ─── Page Wrapper ─────────────────────────────────────────────

export default function VendorMaster() {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <div className="flex-1">
          <ERPHeader breadcrumbs={[{ label: 'Masters' }, { label: 'Vendor Master' }]} />
          <div className="p-6 max-w-7xl mx-auto">
            <VendorMasterPanel />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
