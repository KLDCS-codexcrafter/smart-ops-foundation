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
  Users, Plus, Edit2, Ban, CheckCircle2, Loader2, Search,
  ChevronDown, AlertTriangle, Info, Check, User, MapPin,
  CreditCard, Shield, Building, Briefcase, X, Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { indianStates, indianDistricts, getCitiesByDistrict, getDistrictsByState } from '@/data/india-geography';
import { onEnterNext, useCtrlS, amountInputProps, toIndianFormat } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { TDS_SECTIONS } from '@/data/compliance-seed-data';

// ─── Interfaces ──────────────────────────────────────────────

interface CustomerContact {
  id: string;
  contactPerson: string;
  designation: string;
  phone: string;
  mobile: string;
  email: string;
  isPrimary: boolean;
}

interface CustomerAddress {
  id: string;
  label: string;
  addressLine: string;
  stateCode: string;
  stateName: string;
  gstStateCode: string;
  districtCode: string;
  districtName: string;
  cityCode: string;
  cityName: string;
  pinCode: string;
  isBilling: boolean;
  isDefaultShipTo: boolean;
}

type CustomerType =
  | 'manufacturer' | 'trader' | 'distributor' | 'retailer'
  | 'service_recipient' | 'individual' | 'government' | 'export' | 'other';

interface CustomerMasterDefinition {
  id: string;
  partyCode: string;
  customerType: CustomerType;
  gstin: string;
  pan: string;
  cin: string;
  aadhaar: string;
  partyName: string;
  mailingName: string;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  website: string;
  birthday: string;
  anniversary: string;
  openingBalance: number;
  creditLimit: number;
  warningLimit: number;
  creditDays: number;
  warningDays: number;
  modeOfPaymentId: string;
  termsOfPaymentId: string;
  saleType: 'credit' | 'cash' | 'advance' | 'lc' | 'mixed';
  freightArrangement: 'included_in_price' | 'charged_separately' | 'free_delivery';
  agreedFreightBasis: 'per_kg' | 'per_cbm' | 'per_trip' | 'percent_invoice' | 'fixed' | null;
  agreedFreightRate: number;
  freightRateTolerance: number;
  defaultTransporterId: string;
  defaultCourierId: string;
  gstRegistrationType: 'regular' | 'composition' | 'unregistered' | 'sez' | 'government' | 'consumer';
  gstStateCode: string;
  gstFilingType: 'monthly' | 'quarterly';
  einvoiceApplicable: boolean;
  tdsApplicable: boolean;
  tdsSection: string;
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
  termsOfDeliveryId: string;
  dispatchMode: 'road' | 'rail' | 'air' | 'sea' | 'courier' | 'hand' | '';
  default_currency: string;
  status: 'active' | 'inactive';
}

// ─── Storage ──────────────────────────────────────────────────

const STORAGE_KEY = 'erp_group_customer_master';

const loadCustomers = (): CustomerMasterDefinition[] => {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  return [];
};

const saveCustomers = (items: CustomerMasterDefinition[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // [JWT] PUT /api/group/masters/customer
};

const genPartyCode = (all: CustomerMasterDefinition[]): string =>
  'CUS-' + String(all.length + 1).padStart(6, '0');

// ─── GSTIN Auto-Fill ──────────────────────────────────────────

const extractFromGstin = (gstin: string) => {
  if (gstin.length < 12) return null;
  const gstStateCode = gstin.slice(0, 2);
  const pan = gstin.slice(2, 12).toUpperCase();
  const state = indianStates.find(s => s.gstStateCode === gstStateCode);
  return { gstStateCode, pan, stateCode: state?.code ?? '', stateName: state?.name ?? '' };
};

// ─── Constants ────────────────────────────────────────────────

const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'trader', label: 'Trader' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'service_recipient', label: 'Service Recipient' },
  { value: 'individual', label: 'Individual' },
  { value: 'government', label: 'Government' },
  { value: 'export', label: 'Export Customer' },
];

const FREIGHT_OPTIONS = [
  { value: 'included_in_price', label: 'Included in Price', desc: 'Freight cost embedded — we deliver to their door (FOR)' },
  { value: 'charged_separately', label: 'Charged Separately', desc: 'Freight shown as separate line on invoice' },
  { value: 'free_delivery', label: 'Free Delivery', desc: 'We absorb freight — no recovery from customer' },
] as const;

const defaultForm: Omit<CustomerMasterDefinition, 'id' | 'partyCode'> = {
  customerType: 'trader',
  gstin: '', pan: '', cin: '', aadhaar: '',
  partyName: '', mailingName: '',
  contacts: [],
  addresses: [],
  website: '', birthday: '', anniversary: '',
  openingBalance: 0,
  creditLimit: 0, warningLimit: 0,
  creditDays: 30, warningDays: 7,
  modeOfPaymentId: '', termsOfPaymentId: '', saleType: 'credit',
  freightArrangement: 'charged_separately',
  agreedFreightBasis: null, agreedFreightRate: 0, freightRateTolerance: 5,
  defaultTransporterId: '', defaultCourierId: '',
  gstRegistrationType: 'regular', gstStateCode: '',
  gstFilingType: 'monthly', einvoiceApplicable: false,
  tdsApplicable: false, tdsSection: '194Q',
  defaultBranch: '', businessMode: 'b2b',
  typeOfBusinessEntity: 'private_limited',
  natureOfBusiness: '', businessActivity: '',
  referredBy: '', associatedDealer: '', otherReference: '',
  businessHours: '', termsOfDeliveryId: '', dispatchMode: '',
  default_currency: (() => { try { return localStorage.getItem('erp_base_currency') || 'INR'; } catch { return 'INR'; } })(),
  status: 'active',
};

// ─── Panel Component ──────────────────────────────────────────

export function CustomerMasterPanel() {
  const [customers, setCustomers] = useState<CustomerMasterDefinition[]>(() => loadCustomers());
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerMasterDefinition | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CustomerType | 'all'>('all');
  const [gstinFetching, setGstinFetching] = useState(false);

  const [showContacts, setShowContacts] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const [showFinancial, setShowFinancial] = useState(false);
  const [showFreight, setShowFreight] = useState(false);
  const [showTaxation, setShowTaxation] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);

  const [form, setForm] = useState(defaultForm);
  const [justSaved, setJustSaved] = useState(false);

  // ─── Dropdown helpers ────────────────────────────────────────
  const loadModeOptions = () => {
    try { return JSON.parse(localStorage.getItem('erp_group_mode_of_payment') || '[]'); }
    catch { return []; }
  };
  const loadTermsOptions = () => {
    try { return JSON.parse(localStorage.getItem('erp_group_terms_of_payment') || '[]'); }
    catch { return []; }
  };
  const loadDeliveryOptions = () => {
    try { return JSON.parse(localStorage.getItem('erp_group_terms_of_delivery') || '[]'); }
    catch { return []; }
  };
  const loadTransporterOptions = () => {
    try {
      return JSON.parse(localStorage.getItem('erp_group_logistic_master') || '[]')
        .filter((l: any) => l.logisticType === 'gta' && l.status === 'active');
    } catch { return []; }
  };
  const loadCourierOptions = () => {
    try {
      return JSON.parse(localStorage.getItem('erp_group_logistic_master') || '[]')
        .filter((l: any) => l.logisticType === 'courier' && l.status === 'active');
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

  // ─── Save ────────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.partyName.trim()) return toast.error('Party Name is required');
    const all = loadCustomers();
    if (editTarget) {
      const updated = all.map(c => c.id === editTarget.id ? { ...c, ...form } : c);
      saveCustomers(updated); setCustomers(updated);
      toast.success(`${form.partyName} updated`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } else {
      const def: CustomerMasterDefinition = {
        ...form,
        id: crypto.randomUUID(),
        partyCode: genPartyCode(all),
        mailingName: form.mailingName.trim() || form.partyName.trim(),
      };
      const updated = [...all, def];
      saveCustomers(updated); setCustomers(updated);
      toast.success(`${def.partyName} created`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    }
    setAddOpen(false); setEditTarget(null); setForm(defaultForm);
  };

  useCtrlS(() => { if (addOpen) handleSave(); });

  const openEdit = (item: CustomerMasterDefinition) => {
    const { id, partyCode, ...rest } = item;
    setForm(rest);
    setEditTarget(item);
  };

  const toggleStatus = (item: CustomerMasterDefinition) => {
    const all = loadCustomers();
    const updated = all.map(c => c.id === item.id
      ? { ...c, status: c.status === 'active' ? 'inactive' as const : 'active' as const }
      : c);
    saveCustomers(updated); setCustomers(updated);
    // [JWT] PATCH /api/group/masters/customer/:id/status
    toast.success(`${item.partyName} ${item.status === 'active' ? 'deactivated' : 'activated'}`);
  };

  const resetAndClose = () => {
    setAddOpen(false); setEditTarget(null); setForm(defaultForm);
    setShowContacts(false); setShowAddresses(false); setShowFinancial(false);
    setShowFreight(false); setShowTaxation(false); setShowCompanyInfo(false);
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
  const updateContact = (id: string, field: keyof CustomerContact, value: string | boolean) => {
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

  // ─── Address helpers ────────────────────────────────────────
  const addAddress = () => {
    setForm(f => ({
      ...f,
      addresses: [...f.addresses, {
        id: crypto.randomUUID(), label: '', addressLine: '',
        stateCode: '', stateName: '', gstStateCode: '',
        districtCode: '', districtName: '', cityCode: '', cityName: '',
        pinCode: '', isBilling: f.addresses.length === 0, isDefaultShipTo: f.addresses.length === 0,
      }],
    }));
  };
  const updateAddress = (id: string, field: keyof CustomerAddress, value: string | boolean) => {
    setForm(f => ({
      ...f,
      addresses: f.addresses.map(a => {
        if (field === 'isDefaultShipTo' && value === true) {
          return a.id === id ? { ...a, isDefaultShipTo: true } : { ...a, isDefaultShipTo: false };
        }
        return a.id === id ? { ...a, [field]: value } : a;
      }),
    }));
  };
  const updateAddressState = (addrId: string, stateCode: string) => {
    const st = indianStates.find(s => s.code === stateCode);
    if (!st) return;
    setForm(f => ({
      ...f,
      addresses: f.addresses.map(a => a.id === addrId ? {
        ...a, stateCode: st.code, stateName: st.name, gstStateCode: st.gstStateCode,
        districtCode: '', districtName: '', cityCode: '', cityName: '',
      } : a),
    }));
  };
  const updateAddressDistrict = (addrId: string, districtCode: string) => {
    const d = indianDistricts.find(x => x.code === districtCode);
    if (!d) return;
    setForm(f => ({
      ...f,
      addresses: f.addresses.map(a => a.id === addrId ? {
        ...a, districtCode: d.code, districtName: d.name, cityCode: '', cityName: '',
      } : a),
    }));
  };
  const updateAddressCity = (addrId: string, cityCode: string, districtCode: string) => {
    const c = getCitiesByDistrict(districtCode).find(x => x.code === cityCode);
    if (!c) return;
    setForm(f => ({
      ...f,
      addresses: f.addresses.map(a => a.id === addrId ? {
        ...a, cityCode: c.code, cityName: c.name,
      } : a),
    }));
  };
  const removeAddress = (id: string) => {
    setForm(f => ({ ...f, addresses: f.addresses.filter(a => a.id !== id) }));
  };

  // ─── Filtering ──────────────────────────────────────────────
  const filtered = customers.filter(c => {
    if (typeFilter !== 'all' && c.customerType !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.partyName.toLowerCase().includes(s) || c.partyCode.toLowerCase().includes(s)
        || c.gstin.toLowerCase().includes(s) || c.mailingName.toLowerCase().includes(s);
    }
    return true;
  });

  const activeCount = customers.filter(c => c.status === 'active').length;
  const withCreditLimit = customers.filter(c => c.creditLimit > 0).length;
  const freightIncluded = customers.filter(c => c.freightArrangement === 'included_in_price').length;

  const activeTdsOptions = TDS_SECTIONS.filter(t => t.status === 'active');

  const getTypeBadgeClass = (type: CustomerType) => {
    if (type === 'distributor') return 'bg-blue-500/15 text-blue-700 border-blue-500/30';
    if (type === 'manufacturer') return 'bg-teal-500/15 text-teal-700 border-teal-500/30';
    if (type === 'export') return 'bg-green-500/15 text-green-700 border-green-500/30';
    if (type === 'retailer') return 'bg-purple-500/15 text-purple-700 border-purple-500/30';
    if (type === 'trader') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getTypeLabel = (type: CustomerType) =>
    CUSTOMER_TYPES.find(t => t.value === type)?.label ?? type;

  // ─── Dialog Form ────────────────────────────────────────────

  const renderForm = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2" data-keyboard-form>
      {/* Section 1 — Party Profile (always visible) */}
      <div className="space-y-4">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Type</Label>
        <div className="grid grid-cols-4 gap-2">
          {CUSTOMER_TYPES.map(t => (
            <button key={t.value} type="button"
              onClick={() => setForm(f => ({ ...f, customerType: t.value }))}
              className={`px-3 py-2 text-xs rounded-lg border font-medium transition-colors text-left ${
                form.customerType === t.value
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
        {form.customerType === 'individual' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Aadhaar</Label>
            <Input value={form.aadhaar}
              onChange={e => setForm(f => ({ ...f, aadhaar: e.target.value }))}
              onKeyDown={onEnterNext} placeholder="12-digit Aadhaar" maxLength={12} />
          </div>
        )}

        {/* Opening Balance — always Dr */}
        <div className="space-y-1.5">
          <Label className="text-xs">Opening Balance</Label>
          <div className="flex gap-2 items-center">
            <Input value={form.openingBalance || ''}
              onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) || 0 }))}
              onKeyDown={onEnterNext} {...amountInputProps} className="flex-1" />
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px] shrink-0">
              Dr
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

      {/* Section 3 — Addresses (multiple) */}
      <Collapsible open={showAddresses} onOpenChange={setShowAddresses}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Addresses ({form.addresses.length})
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          {form.addresses.map(addr => (
            <div key={addr.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Label</Label>
                  <Input value={addr.label} onKeyDown={onEnterNext}
                    onChange={e => updateAddress(addr.id, 'label', e.target.value)}
                    className="h-8 text-xs" placeholder="Billing / Factory / Warehouse / HO" />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-1.5">
                    <Switch checked={addr.isBilling}
                      onCheckedChange={v => updateAddress(addr.id, 'isBilling', v)} />
                    <span className="text-[10px] text-muted-foreground">Billing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={addr.isDefaultShipTo}
                      onCheckedChange={v => updateAddress(addr.id, 'isDefaultShipTo', v)} />
                    <span className="text-[10px] text-muted-foreground">Default Ship-to</span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-[10px]">Address Line</Label>
                <Input value={addr.addressLine} onKeyDown={onEnterNext}
                  onChange={e => updateAddress(addr.id, 'addressLine', e.target.value)}
                  className="h-8 text-xs" placeholder="Full address" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">State</Label>
                  <Select value={addr.stateCode} onValueChange={v => updateAddressState(addr.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {indianStates.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {addr.gstStateCode && (
                    <Badge variant="outline" className="mt-1 bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px]">
                      GST State Code: {addr.gstStateCode}
                    </Badge>
                  )}
                </div>
                <div>
                  <Label className="text-[10px]">District</Label>
                  <Select value={addr.districtCode} onValueChange={v => updateAddressDistrict(addr.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {getDistrictsByState(addr.stateCode).map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">City</Label>
                  <Select value={addr.cityCode} onValueChange={v => updateAddressCity(addr.id, v, addr.districtCode)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {getCitiesByDistrict(addr.districtCode).map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Pincode</Label>
                  <Input value={addr.pinCode} onKeyDown={onEnterNext}
                    onChange={e => updateAddress(addr.id, 'pinCode', e.target.value)}
                    className="h-8 text-xs" {...amountInputProps} maxLength={6} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => removeAddress(addr.id)}
                  className="text-destructive h-6 text-[10px]">
                  <X className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addAddress} className="gap-1.5 text-xs">
            <Plus className="h-3 w-3" /> Add Address
          </Button>
          <p className="text-[10px] text-muted-foreground">GST state code auto-fills from state — determines CGST/SGST vs IGST on invoice.</p>

          {/* Website, Birthday, Anniversary */}
          <div className="space-y-3 pt-2 border-t">
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
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 4 — Financial Details (Two-Tier Credit) */}
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
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px] shrink-0">Dr</Badge>
            </div>
          </div>
          <div>
            <Label className="text-xs">Credit Limit (Hard Stop)</Label>
            <Input value={form.creditLimit || ''}
              onChange={e => setForm(f => ({ ...f, creditLimit: parseFloat(e.target.value) || 0 }))}
              onKeyDown={onEnterNext} {...amountInputProps} />
          </div>
          <div>
            <Label className="text-xs">Warning Limit (Alert)</Label>
            <Input value={form.warningLimit || ''}
              onChange={e => setForm(f => ({ ...f, warningLimit: parseFloat(e.target.value) || 0 }))}
              onKeyDown={onEnterNext} {...amountInputProps} />
            <p className="text-[10px] text-muted-foreground mt-1">Alert shown when outstanding approaches this amount.</p>
          </div>
          {form.creditLimit > 0 && form.warningLimit > form.creditLimit && (
            <div className="border border-amber-500/30 rounded-lg p-2 bg-amber-500/5">
              <p className="text-[10px] text-amber-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Warning Limit should be less than Credit Limit.
              </p>
            </div>
          )}
          <div>
            <Label className="text-xs">Credit Period (days)</Label>
            <Input value={form.creditDays || ''}
              onChange={e => setForm(f => ({ ...f, creditDays: parseInt(e.target.value) || 0 }))}
              onKeyDown={onEnterNext} {...amountInputProps} />
            <p className="text-[10px] text-muted-foreground mt-1">Invoice becomes overdue after these days.</p>
          </div>
          <div>
            <Label className="text-xs">Early Warning (days before due)</Label>
            <Input value={form.warningDays || ''}
              onChange={e => setForm(f => ({ ...f, warningDays: parseInt(e.target.value) || 0 }))}
              onKeyDown={onEnterNext} {...amountInputProps} />
            <p className="text-[10px] text-muted-foreground mt-1">Alert N days before overdue.</p>
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
            <Label className="text-xs">Default Currency</Label>
            <Select value={form.default_currency} onValueChange={v => setForm(f => ({ ...f, default_currency: v }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select currency" /></SelectTrigger>
              <SelectContent>
                {(() => {
                  try {
                    // [JWT] GET /api/accounting/currencies
                    const currencies = JSON.parse(localStorage.getItem('erp_currencies') || '[]');
                    const base = localStorage.getItem('erp_base_currency') || 'INR';
                    const active = currencies.filter((c: any) => c.is_active);
                    if (!active.length) return <SelectItem value={base}>{base} (Base)</SelectItem>;
                    return active.map((c: any) => (
                      <SelectItem key={c.id} value={c.iso_code}>
                        {c.symbol} {c.iso_code} — {c.name}{c.is_base_currency ? ' (Base)' : ''}
                      </SelectItem>
                    ));
                  } catch { return <SelectItem value="INR">₹ INR (Base)</SelectItem>; }
                })()}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">Invoices to this customer default to this currency.</p>
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

      {/* Section 5 — Freight Arrangement */}
      <Collapsible open={showFreight} onOpenChange={setShowFreight}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Freight Arrangement
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-3 gap-2">
            {FREIGHT_OPTIONS.map(opt => (
              <button key={opt.value} type="button"
                onClick={() => setForm(f => ({ ...f, freightArrangement: opt.value }))}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  form.freightArrangement === opt.value
                    ? 'bg-teal-500/15 text-teal-700 border-teal-500/40'
                    : 'bg-muted/30 text-muted-foreground border-border hover:border-teal-500/30'
                }`}>
                <p className="text-xs font-semibold">{opt.label}</p>
                <p className="text-[10px] mt-1 opacity-70">{opt.desc}</p>
              </button>
            ))}
          </div>

          {form.freightArrangement === 'included_in_price' && (
            <div className="space-y-3 border border-amber-500/20 rounded-lg p-3 bg-amber-500/5">
              <div className="flex gap-2 items-start">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700">Freight included in price — track the actual cost to calculate true margin</p>
              </div>
              <div>
                <Label className="text-xs">Agreed Rate Basis</Label>
                <Select value={form.agreedFreightBasis || ''} onValueChange={v => setForm(f => ({ ...f, agreedFreightBasis: v as any }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select basis" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_kg">Per KG</SelectItem>
                    <SelectItem value="per_cbm">Per CBM</SelectItem>
                    <SelectItem value="per_trip">Per Trip</SelectItem>
                    <SelectItem value="percent_invoice">% of Invoice</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Agreed Rate</Label>
                <div className="flex gap-2 items-center">
                  <Input value={form.agreedFreightRate || ''}
                    onChange={e => setForm(f => ({ ...f, agreedFreightRate: parseFloat(e.target.value) || 0 }))}
                    onKeyDown={onEnterNext} {...amountInputProps} className="flex-1" />
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {form.agreedFreightBasis === 'percent_invoice' ? '% of invoice' : form.agreedFreightBasis ? ` / ${form.agreedFreightBasis.replace('per_', '')}` : ''}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Rate Tolerance %</Label>
                <Input value={form.freightRateTolerance || ''}
                  onChange={e => setForm(f => ({ ...f, freightRateTolerance: parseFloat(e.target.value) || 0 }))}
                  onKeyDown={onEnterNext} {...amountInputProps} />
                <p className="text-[10px] text-muted-foreground mt-1">Alert if actual freight exceeds agreed by this %</p>
              </div>
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
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Section 6 — Taxation Details */}
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

          {/* SEZ note */}
          {form.gstRegistrationType === 'sez' && (
            <div className="border border-blue-500/30 rounded-lg p-3 bg-blue-500/5">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-700">Zero-rated supply</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Supply to SEZ units is zero-rated — IGST @ 0% or supply under bond/LUT.</p>
                </div>
              </div>
            </div>
          )}

          {/* Government note */}
          {form.gstRegistrationType === 'government' && (
            <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">TDS u/s 51 of CGST may apply</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Government buyers may deduct GST TDS under Section 51 of CGST Act for supplies above the threshold.</p>
                </div>
              </div>
            </div>
          )}

          {/* B2C note for unregistered/consumer */}
          {(form.gstRegistrationType === 'unregistered' || form.gstRegistrationType === 'consumer') && (
            <div className="border border-slate-500/30 rounded-lg p-3 bg-slate-500/5">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground">B2C — HSN/SAC not required on invoice</p>
              </div>
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
            <Switch checked={form.tdsApplicable} onCheckedChange={v => {
              setForm(f => ({ ...f, tdsApplicable: v, tdsSection: v ? '194Q' : f.tdsSection }));
            }} />
            <Label className="text-xs">TDS Applicable</Label>
          </div>
          {form.tdsApplicable && (
            <>
              <p className="text-[10px] text-muted-foreground">Section 194Q applies if this customer's purchases from you exceed 50 lakhs in a year.</p>
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
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Section 7 — Company Info */}
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
          <div>
            <Label className="text-xs">Type of Business Entity</Label>
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
            <Users className="h-5 w-5 text-teal-600" /> Customer Master
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Sundry Debtor — Trade Receivables (TREC)</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setAddOpen(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <span className="text-muted-foreground">Total <strong className="text-foreground">{customers.length}</strong></span>
        <span className="text-muted-foreground">Active <strong className="text-teal-600">{activeCount}</strong></span>
        <span className="text-muted-foreground">With Credit Limit <strong className="text-amber-600">{withCreditLimit}</strong></span>
        <span className="text-muted-foreground">Freight Included <strong className="text-blue-600">{freightIncluded}</strong></span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, GSTIN..." className="pl-9 h-9" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(['all', ...CUSTOMER_TYPES.map(t => t.value)] as const).map(t => (
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
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">No customers yet</p>
          <p className="text-xs mt-1">Add your first customer or buyer to get started.</p>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 mt-4">
            <Plus className="h-3.5 w-3.5" /> Add Customer
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credit Limit</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credit Days</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Addresses</TableHead>
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
                    <Badge variant="outline" className={`text-[10px] ${getTypeBadgeClass(item.customerType)}`}>
                      {getTypeLabel(item.customerType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {item.addresses.length > 0 ? item.addresses[0].stateName || '\u2014' : '\u2014'}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {item.creditLimit > 0 ? `\u20B9${toIndianFormat(item.creditLimit)}` : '\u2014'}
                  </TableCell>
                  <TableCell className="text-xs">{item.creditDays} days</TableCell>
                  <TableCell>
                    {item.addresses.length > 1 ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30 text-[10px]">
                        {item.addresses.length} addresses
                      </Badge>
                    ) : item.addresses.length === 1 ? (
                      <span className="text-[10px] text-muted-foreground">1 address</span>
                    ) : <span className="text-muted-foreground">\u2014</span>}
                  </TableCell>
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
            <DialogTitle>{editTarget ? `Edit — ${editTarget.partyName}` : 'Add Customer'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update customer details.' : 'Create a new customer or buyer (Sundry Debtor).'}
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

export default function CustomerMaster() {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <div className="flex-1">
          <ERPHeader breadcrumbs={[{ label: 'Masters' }, { label: 'Customer Master' }]} />
          <div className="p-6 max-w-7xl mx-auto">
            <CustomerMasterPanel />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
