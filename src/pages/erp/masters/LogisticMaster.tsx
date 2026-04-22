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
  Truck, Plus, Edit2, Ban, CheckCircle2, Loader2, Search,
  ChevronDown, AlertTriangle, Check, User, MapPin,
  CreditCard, Shield, Building, Package, X, Globe, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { indianStates, indianDistricts, getCitiesByDistrict, getDistrictsByState } from '@/data/india-geography';
import { onEnterNext, useCtrlS, amountInputProps, toIndianFormat } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { TDS_SECTIONS } from '@/data/compliance-seed-data';
import {
  DEFAULT_ZONE_DEFINITIONS, transporterRateCardsKey,
  type TransporterRateCard,
} from '@/types/transporter-rate';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

// ─── Interfaces ──────────────────────────────────────────────

interface LogisticContact {
  id: string;
  contactPerson: string;
  designation: string;
  phone: string;
  mobile: string;
  email: string;
  isPrimary: boolean;
}

interface FreightRate {
  id: string;
  fromState: string;
  fromCity: string;
  toState: string;
  toCity: string;
  basis: 'per_kg' | 'per_cbm' | 'per_trip' | 'percent_invoice' | 'fixed';
  rate: number;
  minimumCharge: number;
  effectiveFrom: string;
}

type LogisticType =
  | 'gta'
  | 'courier'
  | 'rail'
  | 'air'
  | 'sea'
  | 'cha'
  | 'freight_forwarder'
  | 'other';

interface LogisticMasterDefinition {
  id: string;
  partyCode: string;
  logisticType: LogisticType;
  gstin: string;
  pan: string;
  partyName: string;
  mailingName: string;
  transporterId: string;
  contacts: LogisticContact[];
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
  openingBalance: number;
  creditDays: number;
  modeOfPaymentId: string;
  termsOfPaymentId: string;
  gstRegistrationType: 'regular' | 'composition' | 'unregistered' | 'other';
  gtaRcmApplicable: boolean;
  rcmGstRate: 5 | 12 | null;
  tdsApplicable: boolean;
  tdsSection: string;
  businessMode: 'b2b' | 'b2c' | 'export' | 'import' | 'both';
  typeOfBusinessEntity:
    | 'private_limited' | 'public_limited' | 'llp' | 'partnership'
    | 'proprietor' | 'opc' | 'huf' | 'individual' | 'other';
  natureOfBusiness: string;
  businessActivity: string;
  otherReference: string;
  freightRates: FreightRate[];
  freightRateTolerance: number;
  status: 'active' | 'inactive';

  // Sprint 15c-2 — Portal access fields
  portal_enabled?: boolean;
  password_hash?: string | null;
  password_updated_at?: string | null;
  last_login_at?: string | null;
  must_change_password?: boolean;
}

// ─── Storage ──────────────────────────────────────────────────

const STORAGE_KEY = 'erp_group_logistic_master';

const loadLogistics = (): LogisticMasterDefinition[] => {
  try {
    // [JWT] GET /api/masters/logistics
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  return [];
};

const saveLogistics = (items: LogisticMasterDefinition[]) => {
  // [JWT] POST /api/masters/logistics
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // [JWT] PUT /api/group/masters/logistic
};

const genPartyCode = (all: LogisticMasterDefinition[]): string =>
  'LOG-' + String(all.length + 1).padStart(6, '0');

// ─── GSTIN Auto-Fill ──────────────────────────────────────────

const extractFromGstin = (gstin: string) => {
  if (gstin.length < 12) return null;
  const gstStateCode = gstin.slice(0, 2);
  const pan = gstin.slice(2, 12).toUpperCase();
  const state = indianStates.find(s => s.gstStateCode === gstStateCode);
  return { gstStateCode, pan, stateCode: state?.code ?? '', stateName: state?.name ?? '' };
};

// ─── Constants ────────────────────────────────────────────────

const LOGISTIC_TYPES: { value: LogisticType; label: string; icon: string }[] = [
  { value: 'gta', label: 'GTA (Road)', icon: '🚛' },
  { value: 'courier', label: 'Courier', icon: '📦' },
  { value: 'rail', label: 'Rail Freight', icon: '🚃' },
  { value: 'air', label: 'Air Cargo', icon: '✈️' },
  { value: 'sea', label: 'Sea / Shipping', icon: '🚢' },
  { value: 'cha', label: 'CHA / Customs', icon: '🏛️' },
  { value: 'freight_forwarder', label: 'Freight Forwarder', icon: '🌐' },
];

const FREIGHT_BASIS_LABELS: Record<FreightRate['basis'], string> = {
  per_kg: '₹ / KG',
  per_cbm: '₹ / CBM',
  per_trip: '₹ / Trip',
  percent_invoice: '% of Invoice',
  fixed: 'Fixed Amount',
};

const defaultForm: Omit<LogisticMasterDefinition, 'id' | 'partyCode'> = {
  logisticType: 'gta',
  gstin: '', pan: '', partyName: '', mailingName: '',
  transporterId: '',
  contacts: [],
  addressLine: '', stateCode: '', stateName: '', gstStateCode: '',
  districtCode: '', districtName: '', cityCode: '', cityName: '', pinCode: '',
  website: '',
  openingBalance: 0,
  creditDays: 7,
  modeOfPaymentId: '', termsOfPaymentId: '',
  gstRegistrationType: 'regular',
  gtaRcmApplicable: true,
  rcmGstRate: 12,
  tdsApplicable: true,
  tdsSection: '194C',
  businessMode: 'b2b',
  typeOfBusinessEntity: 'private_limited',
  natureOfBusiness: '', businessActivity: '', otherReference: '',
  freightRates: [], freightRateTolerance: 5,
  status: 'active',
  portal_enabled: false,
  password_hash: null,
  password_updated_at: null,
  last_login_at: null,
  must_change_password: false,
};

// ─── Panel Component ──────────────────────────────────────────

export function LogisticMasterPanel() {
  const { entityCode } = useEntityCode();

  const [logistics, setLogistics] = useState<LogisticMasterDefinition[]>(() => loadLogistics());
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LogisticMasterDefinition | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LogisticType | 'all'>('all');
  const [gstinFetching, setGstinFetching] = useState(false);

  // Sprint 15a — Advanced rate cards
  const [rateCards, setRateCards] = useState<TransporterRateCard[]>([]);
  const [showRateCards, setShowRateCards] = useState(false);

  useEffect(() => {
    if (!editTarget) { setRateCards([]); return; }
    try {
      // [JWT] GET /api/masters/transporter-rate-cards?logistic_id=:id
      const all: TransporterRateCard[] = JSON.parse(
        localStorage.getItem(transporterRateCardsKey(entityCode)) ?? '[]',
      );
      setRateCards(all.filter(c => c.logistic_id === editTarget.id));
    } catch { setRateCards([]); }
  }, [editTarget, entityCode]);

  const seedFromOM = () => {
    if (!editTarget) return;
    const now = new Date().toISOString();
    const card: TransporterRateCard = {
      id: `trc-${Date.now()}`,
      logistic_id: editTarget.id,
      entity_id: entityCode,
      label: `${editTarget.partyName} — OM Logistics template`,
      effective_from: now.split('T')[0],
      effective_to: null,
      zone_definitions: DEFAULT_ZONE_DEFINITIONS,
      zone_rates: [],
      collection_delivery: [],
      oda_grid: [],
      minimum_chargeable: { surface: 100, train: 75, air: 35 },
      volumetric_divisor: 10,
      surcharges: {
        statistical_flat: 150,
        fuel_pct_of_basic: 10,
        fov_pct_of_invoice: 0.2,
        cod_flat_if_applicable: 200,
        demurrage_free_days: 10,
        demurrage_per_kg_per_day: 0.20,
      },
      fuel_escalation: {
        base_fuel_price: 0, current_fuel_price: 0,
        ratio_numerator: 5.5, ratio_denominator: 10,
      },
      annual_hike_pct: 10,
      contract_start: now.split('T')[0],
      contract_end: '',
      created_at: now, updated_at: now,
      created_by: 'admin',
    };
    try {
      const all: TransporterRateCard[] = JSON.parse(
        localStorage.getItem(transporterRateCardsKey(entityCode)) ?? '[]',
      );
      all.push(card);
      // [JWT] POST /api/masters/transporter-rate-cards
      localStorage.setItem(transporterRateCardsKey(entityCode), JSON.stringify(all));
      setRateCards([...rateCards, card]);
      toast.success('Rate card seeded from OM Logistics template');
    } catch { toast.error('Failed to seed rate card'); }
  };

  // Form expansion toggles
  const [showContacts, setShowContacts] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showFinancial, setShowFinancial] = useState(false);
  const [showGst, setShowGst] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [showFreightRates, setShowFreightRates] = useState(false);

  // Freight rate inline form
  const [showRateForm, setShowRateForm] = useState(false);
  const [rateForm, setRateForm] = useState<Omit<FreightRate, 'id'>>({
    fromState: '', fromCity: '', toState: '', toCity: '',
    basis: 'per_kg', rate: 0, minimumCharge: 0, effectiveFrom: '',
  });

  const [form, setForm] = useState(defaultForm);
  const [justSaved, setJustSaved] = useState(false);

  // Sprint 15c-2 — Portal access UI state
  const [showPortal, setShowPortal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const loadModeOptions = () => {
    // [JWT] GET /api/masters/logistics
    try { return JSON.parse(localStorage.getItem('erp_group_mode_of_payment') || '[]'); }
    catch { return []; }
  };
  const loadTermsOptions = () => {
    // [JWT] GET /api/masters/logistics
    try { return JSON.parse(localStorage.getItem('erp_group_terms_of_payment') || '[]'); }
    catch { return []; }
  };

  const fetchGstinDetails = async (gstin: string) => {
    if (gstin.replace(/\s/g, '').length !== 15) return;
    const structural = extractFromGstin(gstin);
    if (structural) {
      setForm(f => ({
        ...f,
        pan: structural.pan,
        gstStateCode: structural.gstStateCode,
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
      // Structural data already filled — API is optional enhancement
    } finally {
      setGstinFetching(false);
    }
  };

  const handleLogisticTypeChange = (type: LogisticType) => {
    setForm(f => ({
      ...f, logisticType: type,
      gtaRcmApplicable: type === 'gta',
      rcmGstRate: type === 'gta' ? 12 : null,
      tdsSection: ['gta', 'courier'].includes(type) ? '194C' : '',
      tdsApplicable: ['gta', 'courier'].includes(type),
    }));
  };

  const handleSave = () => {
    if (!addOpen && !editTarget) return;
    if (!form.partyName.trim()) return toast.error('Party Name is required');
    if (!form.logisticType) return toast.error('Logistic Type is required');

    // Sprint 15c-2 — when portal_enabled and a temp password supplied, hash it
    let portalPatch: Partial<LogisticMasterDefinition> = {};
    if (form.portal_enabled && tempPassword.trim()) {
      if (tempPassword.trim().length < 8) {
        return toast.error('Temporary password must be at least 8 characters');
      }
      portalPatch = {
        password_hash: btoa(tempPassword.trim()), // [JWT] Mock — replace with bcrypt server-side
        password_updated_at: new Date().toISOString(),
        must_change_password: true,
      };
    }

    const all = loadLogistics();
    if (editTarget) {
      const updated = all.map(l => l.id === editTarget.id ? { ...l, ...form, ...portalPatch } : l);
      saveLogistics(updated); setLogistics(updated);
      toast.success(`${form.partyName} updated`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } else {
      const def: LogisticMasterDefinition = {
        ...form,
        ...portalPatch,
        id: crypto.randomUUID(),
        partyCode: genPartyCode(all),
        mailingName: form.mailingName.trim() || form.partyName.trim(),
        gtaRcmApplicable: form.logisticType === 'gta',
        tdsSection: ['gta', 'courier'].includes(form.logisticType) ? '194C' : form.tdsSection,
      };
      const updated = [...all, def];
      saveLogistics(updated); setLogistics(updated);
      toast.success(`${def.partyName} created`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    }
    setTempPassword('');
    setShowPortal(false);
    setAddOpen(false); setEditTarget(null); setForm(defaultForm);
  };

  const isFormActive = true;
  useCtrlS(isFormActive ? handleSave : () => {});

  const openEdit = (item: LogisticMasterDefinition) => {
    const { id, partyCode, ...rest } = item;
    setForm(rest);
    setEditTarget(item);
  };

  const toggleStatus = (item: LogisticMasterDefinition) => {
    const all = loadLogistics();
    const updated = all.map(l => l.id === item.id
      ? { ...l, status: l.status === 'active' ? 'inactive' as const : 'active' as const }
      : l);
    saveLogistics(updated); setLogistics(updated);
    toast.success(`${item.partyName} ${item.status === 'active' ? 'deactivated' : 'activated'}`);
  };

  const resetAndClose = () => {
    setAddOpen(false); setEditTarget(null); setForm(defaultForm);
    setShowContacts(false); setShowAddress(false); setShowFinancial(false);
    setShowGst(false); setShowCompanyInfo(false); setShowFreightRates(false);
    setShowRateForm(false);
  };

  // Contacts helpers
  const addContact = () => {
    setForm(f => ({
      ...f,
      contacts: [...f.contacts, {
        id: crypto.randomUUID(), contactPerson: '', designation: '',
        phone: '', mobile: '', email: '', isPrimary: f.contacts.length === 0,
      }],
    }));
  };
  const updateContact = (id: string, field: keyof LogisticContact, value: string | boolean) => {
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

  // Freight rate helpers
  const addFreightRate = () => {
    if (!rateForm.fromState || !rateForm.toState) return toast.error('From/To state required');
    setForm(f => ({
      ...f,
      freightRates: [...f.freightRates, { ...rateForm, id: crypto.randomUUID() }],
    }));
    setRateForm({ fromState: '', fromCity: '', toState: '', toCity: '', basis: 'per_kg', rate: 0, minimumCharge: 0, effectiveFrom: '' });
    setShowRateForm(false);
  };
  const removeFreightRate = (id: string) => {
    setForm(f => ({ ...f, freightRates: f.freightRates.filter(r => r.id !== id) }));
  };

  // Filtering
  const filtered = logistics.filter(l => {
    if (typeFilter !== 'all' && l.logisticType !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.partyName.toLowerCase().includes(s) || l.partyCode.toLowerCase().includes(s)
        || l.gstin.toLowerCase().includes(s) || l.mailingName.toLowerCase().includes(s);
    }
    return true;
  });

  const activeCount = logistics.filter(l => l.status === 'active').length;
  const gtaCount = logistics.filter(l => l.logisticType === 'gta').length;

  const getTypeBadgeClass = (type: LogisticType) => {
    if (type === 'gta') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
    if (type === 'courier') return 'bg-blue-500/15 text-blue-700 border-blue-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getTypeLabel = (type: LogisticType) =>
    LOGISTIC_TYPES.find(t => t.value === type)?.label ?? type;

  const activeTdsOptions = TDS_SECTIONS.filter(t => t.status === 'active');

  // ─── Dialog Form ────────────────────────────────────────────

  const renderForm = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2" data-keyboard-form>
      {/* Section 1 — Party Profile (always visible) */}
      <div className="space-y-4">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logistic Type</Label>
        <div className="grid grid-cols-4 gap-2">
          {LOGISTIC_TYPES.map(t => (
            <button key={t.value} type="button"
              onClick={() => handleLogisticTypeChange(t.value)}
              className={`px-3 py-2 text-xs rounded-lg border font-medium transition-colors text-left ${
                form.logisticType === t.value
                  ? 'bg-teal-500/15 text-teal-700 border-teal-500/40'
                  : 'bg-muted/30 text-muted-foreground border-border hover:border-teal-500/30'
              }`}>
              <span className="mr-1">{t.icon}</span> {t.label}
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

        {/* Transporter ID — only for gta and freight_forwarder */}
        {['gta', 'freight_forwarder'].includes(form.logisticType) && (
          <div className="space-y-1.5">
            <Label className="text-xs">Transporter ID</Label>
            <Input value={form.transporterId}
              onChange={e => setForm(f => ({ ...f, transporterId: e.target.value }))}
              onKeyDown={onEnterNext} placeholder="For e-way bill Part B. Leave blank if same as GSTIN." />
            <p className="text-[10px] text-muted-foreground">For e-way bill Part B. Leave blank if same as GSTIN.</p>
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
            <Label className="text-xs">Payment Due (days)</Label>
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
        </CollapsibleContent>
      </Collapsible>

      {/* Section 5 — GST & Compliance */}
      <Collapsible open={showGst} onOpenChange={setShowGst}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <Shield className="h-4 w-4 text-muted-foreground" />
            GST & Compliance
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
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* GTA RCM Block */}
          {form.logisticType === 'gta' && (
            <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5 space-y-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">RCM applies — Section 9(3) of CGST Act</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    GTA services are under Reverse Charge Mechanism. Your company pays GST
                    directly to the government — NOT the transporter. This will auto-apply
                    on every freight entry for this party.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold">GST Rate</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, rcmGstRate: 5 }))}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border font-medium transition-colors ${
                      form.rcmGstRate === 5 ? 'bg-teal-500/15 text-teal-700 border-teal-500/40'
                        : 'bg-muted/30 text-muted-foreground border-border'}`}>
                    5% — No ITC for you (recipient)
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, rcmGstRate: 12 }))}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border font-medium transition-colors ${
                      form.rcmGstRate === 12 ? 'bg-teal-500/15 text-teal-700 border-teal-500/40'
                        : 'bg-muted/30 text-muted-foreground border-border'}`}>
                    12% — ITC available ✓
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TDS */}
          <div className="flex items-center gap-3">
            <Switch checked={form.tdsApplicable} onCheckedChange={v => setForm(f => ({ ...f, tdsApplicable: v }))} />
            <Label className="text-xs">TDS Applicable</Label>
          </div>
          {form.tdsApplicable && (
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
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Section 6 — Company Info */}
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
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Nature of Business</Label>
            <Select value={form.natureOfBusiness} onValueChange={v => setForm(f => ({ ...f, natureOfBusiness: v }))}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="Logistics">Logistics</SelectItem>
                <SelectItem value="Courier">Courier</SelectItem>
                <SelectItem value="Customs">Customs</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Business Activity</Label>
            <Input value={form.businessActivity}
              onChange={e => setForm(f => ({ ...f, businessActivity: e.target.value }))}
              onKeyDown={onEnterNext} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 7 — Freight Rate Card */}
      <Collapsible open={showFreightRates} onOpenChange={setShowFreightRates}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <Package className="h-4 w-4 text-muted-foreground" />
            Freight Rate Card ({form.freightRates.length} routes)
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs shrink-0">Rate Tolerance</Label>
            <Input value={form.freightRateTolerance || ''}
              onChange={e => setForm(f => ({ ...f, freightRateTolerance: parseFloat(e.target.value) || 0 }))}
              onKeyDown={onEnterNext} {...amountInputProps} className="w-20 h-8 text-xs" />
            <span className="text-[10px] text-muted-foreground">% — Alert if actual {'>'} agreed by this %</span>
          </div>

          {form.freightRates.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">From</TableHead>
                  <TableHead className="text-[10px]">To</TableHead>
                  <TableHead className="text-[10px]">Basis</TableHead>
                  <TableHead className="text-[10px]">Rate</TableHead>
                  <TableHead className="text-[10px]">Min Charge</TableHead>
                  <TableHead className="text-[10px]">Effective</TableHead>
                  <TableHead className="text-[10px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.freightRates.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.fromCity || r.fromState}</TableCell>
                    <TableCell className="text-xs">{r.toCity || r.toState}</TableCell>
                    <TableCell className="text-xs">{FREIGHT_BASIS_LABELS[r.basis]}</TableCell>
                    <TableCell className="text-xs font-mono">₹{toIndianFormat(r.rate)}</TableCell>
                    <TableCell className="text-xs font-mono">₹{toIndianFormat(r.minimumCharge)}</TableCell>
                    <TableCell className="text-xs">{r.effectiveFrom}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFreightRate(r.id)}
                        className="text-destructive h-6 text-[10px]">Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {showRateForm && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">From State</Label>
                  <Select value={rateForm.fromState} onValueChange={v => setRateForm(f => ({ ...f, fromState: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {indianStates.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">From City</Label>
                  <Input value={rateForm.fromCity}
                    onChange={e => setRateForm(f => ({ ...f, fromCity: e.target.value }))}
                    onKeyDown={onEnterNext} className="h-8 text-xs" placeholder="City" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">To State</Label>
                  <Select value={rateForm.toState} onValueChange={v => setRateForm(f => ({ ...f, toState: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {indianStates.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">To City</Label>
                  <Input value={rateForm.toCity}
                    onChange={e => setRateForm(f => ({ ...f, toCity: e.target.value }))}
                    onKeyDown={onEnterNext} className="h-8 text-xs" placeholder="City" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Basis</Label>
                  <Select value={rateForm.basis} onValueChange={v => setRateForm(f => ({ ...f, basis: v as FreightRate['basis'] }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FREIGHT_BASIS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Rate</Label>
                  <Input value={rateForm.rate || ''}
                    onChange={e => setRateForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))}
                    onKeyDown={onEnterNext} {...amountInputProps} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Min Charge</Label>
                  <Input value={rateForm.minimumCharge || ''}
                    onChange={e => setRateForm(f => ({ ...f, minimumCharge: parseFloat(e.target.value) || 0 }))}
                    onKeyDown={onEnterNext} {...amountInputProps} className="h-8 text-xs" />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">Effective From</Label>
                <SmartDateInput value={rateForm.effectiveFrom}
                  onChange={v => setRateForm(f => ({ ...f, effectiveFrom: v }))} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" onClick={addFreightRate} className="text-xs h-7">Confirm</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowRateForm(false)} className="text-xs h-7">Cancel</Button>
              </div>
            </div>
          )}

          {!showRateForm && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowRateForm(true)} className="gap-1.5 text-xs">
              <Plus className="h-3 w-3" /> Add Route
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Sprint 15c-2 — Portal Access */}
      <Collapsible open={showPortal} onOpenChange={setShowPortal}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Portal Access (Sprint 15c-2)
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180 ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Enable portal login</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Lets this transporter sign in at /erp/logistic/login to submit invoices,
                accept LRs, and view payments.
              </p>
            </div>
            <Switch
              checked={form.portal_enabled ?? false}
              onCheckedChange={v => setForm(f => ({ ...f, portal_enabled: v }))}
            />
          </div>
          {form.portal_enabled && (
            <>
              <div>
                <Label className="text-xs">
                  Temporary password {editTarget?.password_hash ? '(leave blank to keep current)' : '*'}
                </Label>
                <Input
                  type="text"
                  value={tempPassword}
                  onChange={e => setTempPassword(e.target.value)}
                  placeholder="Welcome@123"
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Min 8 chars. Share securely with the transporter contact person —
                  they will be forced to change it on first login.
                </p>
              </div>
              {form.last_login_at && (
                <p className="text-[10px] text-muted-foreground">
                  Last login: {new Date(form.last_login_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
              )}
              {form.password_updated_at && (
                <p className="text-[10px] text-muted-foreground">
                  Password updated: {new Date(form.password_updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
              )}
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Sprint 15a — Advanced Rate Card (only when editing) */}
      {editTarget && (
        <Collapsible open={showRateCards} onOpenChange={setShowRateCards}>
          <CollapsibleTrigger asChild>
            <button type="button" className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5" />
                Advanced Rate Card (Sprint 15)
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showRateCards ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Multi-dimensional rate cards with zones, modes, surcharges, fuel
              escalation, and ODA. Used by Sprint 15c freight reconciliation.
            </p>
            {rateCards.length === 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={seedFromOM} className="gap-1.5 text-xs">
                <Plus className="h-3 w-3" /> Seed from OM Logistics template
              </Button>
            ) : (
              <div className="space-y-2">
                {rateCards.map(c => (
                  <div key={c.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{c.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {c.effective_from} → {c.effective_to ?? 'active'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {c.zone_rates.length} rates
                    </Badge>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground">
                  Full rate editor UI will be delivered in Sprint 15a patch 2
                  or Sprint 15c. For now, rate cards can be edited directly in
                  localStorage key: erp_transporter_rate_cards_{entityCode}
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  // ─── Main Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 font-display">
            <Truck className="h-5 w-5 text-teal-600" /> Logistic Master
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Transporter & Courier — Sundry Creditor (TPAY)</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setAddOpen(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Logistic Party
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs">
        <span className="text-muted-foreground">Total <strong className="text-foreground">{logistics.length}</strong></span>
        <span className="text-muted-foreground">Active <strong className="text-teal-600">{activeCount}</strong></span>
        <span className="text-muted-foreground">GTA (RCM) <strong className="text-amber-600">{gtaCount}</strong></span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, GSTIN..." className="pl-9 h-9" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(['all', ...LOGISTIC_TYPES.map(t => t.value)] as const).map(t => (
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
          <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">No logistic parties yet</p>
          <p className="text-xs mt-1">Add a transporter or courier to start tracking freight.</p>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 mt-4">
            <Plus className="h-3.5 w-3.5" /> Add Logistic Party
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">GSTIN</TableHead>
                <TableHead className="text-xs">State</TableHead>
                <TableHead className="text-xs">RCM?</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id} className={`${item.status === 'inactive' ? 'opacity-50' : ''} group`}>
                  <TableCell className="font-mono text-xs text-teal-600">{item.partyCode}</TableCell>
                  <TableCell className="text-xs font-medium">{item.partyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${getTypeBadgeClass(item.logisticType)}`}>
                      {getTypeLabel(item.logisticType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {item.gstin ? item.gstin.slice(0, 8) + '...' : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{item.stateName || '—'}</TableCell>
                  <TableCell>
                    {item.logisticType === 'gta'
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : <span className="text-muted-foreground">—</span>}
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
            <DialogTitle>{editTarget ? `Edit — ${editTarget.partyName}` : 'Add Logistic Party'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update transporter or courier details.' : 'Create a new transporter, courier, or logistics party (Sundry Creditor).'}
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

export default function LogisticMaster() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <div className="flex-1">
          <ERPHeader breadcrumbs={[{ label: 'Masters' }, { label: 'Logistic Master' }]} />
          <div className="p-6 max-w-7xl mx-auto">
            {entityCode ? <LogisticMasterPanel /> : <SelectCompanyGate />}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
