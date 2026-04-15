import { useState, useCallback, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Building, Building2, MapPin, DollarSign, Shield, Settings2, Palette,
  History, CalendarIcon, Upload, X, Plus, Trash2,
  ChevronLeft, ChevronRight, Save, Loader2, Globe, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { FormSection } from '@/components/company/FormSection';
import { FormField } from '@/components/company/FormField';
import { ProgressStepper } from '@/components/company/ProgressStepper';
import { CompanyProfilePreview } from '@/components/company/CompanyProfilePreview';
import { Confetti } from '@/components/ui/confetti';
import {
  formatPAN, formatGSTIN, formatCIN, formatTAN, formatShortCode,
  validatePAN, validateGSTIN, validateCIN, validateTAN,
  suggestShortCode, INDIAN_STATE_NAMES,
} from '@/lib/india-validations';
import { cn } from '@/lib/utils';
import { EntitySetupDialog } from '@/components/foundation/EntitySetupDialog';
import { onEnterNext } from '@/lib/keyboard';

// ── Interfaces ───────────────────────────────────────────────────────────────
interface GSTReg {
  id: string; state: string; addressType: string; registrationType: string;
  gstin: string; gstinFormatted: string; gstinVerified: boolean;
  gstr1Periodicity: string; placeOfSupply: string; assesseeOfOtherTerritory: boolean;
}
interface LUTBond { id: string; applicableFrom: string; applicableTo: string; lutBondNo: string; }

// ── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'Identity & Core', description: 'Legal details, short code' },
  { id: 2, title: 'Address & Contact', description: 'HQ address, contact info' },
  { id: 3, title: 'Financial', description: 'FY, currency, display' },
  { id: 4, title: 'Governance', description: 'CIN, PAN, GST, TDS, Payroll' },
  { id: 5, title: 'Settings', description: 'Timezone, language, mode' },
  { id: 6, title: 'Branding', description: 'Logo, colours, preview' },
  { id: 7, title: 'Audit Trail', description: 'Change history' },
];

const BUSINESS_ENTITIES = ['Private Limited', 'Public Limited', 'LLP', 'OPC',
  'Partnership', 'Sole Proprietorship', 'HUF', 'Trust', 'Society'];
const INDUSTRIES = ['Technology', 'Manufacturing', 'Trading', 'Retail', 'Healthcare',
  'Finance', 'Education', 'Real Estate', 'Logistics', 'Consulting',
  'Food & Beverage', 'Textile', 'Pharma', 'Construction', 'Agriculture',
  'Energy', 'Media', 'Others'];
const BUSINESS_ACTIVITIES = ['Manufacturing', 'Trading', 'Services', 'Import / Export',
  'E-Commerce', 'Distribution', 'IT Services', 'Consulting', 'Others'];
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Australia',
  'Canada', 'Singapore', 'Germany', 'UAE', 'Japan', 'Others'];
const ISD_CODES = ['+91', '+1', '+44', '+61', '+65', '+49', '+971', '+81', '+86'];
const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST) UTC+5:30' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST) UTC+4' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT) UTC+8' },
  { value: 'Europe/London', label: 'British Time (GMT/BST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
];
const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];
const FY_PRESETS = [
  { value: 'india', label: 'India (Apr – Mar)', month: 'april' },
  { value: 'us', label: 'US Calendar (Jan – Dec)', month: 'january' },
  { value: 'uk', label: 'UK (Apr – Mar)', month: 'april' },
  { value: 'custom', label: 'Custom', month: '' },
];
const FY_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'];

const DEDUCTOR_TYPES = ['Company', 'Government', 'Individual', 'Partnership',
  'LLP', 'Trust', 'HUF', 'AOP/BOI', 'Local Authority'];
const GST_ADDRESS_TYPES = ['Registered Office', 'Corporate Office', 'Branch Office',
  'Warehouse', 'Factory'];
const GST_REG_TYPES = ['Regular', 'Composition', 'Casual Taxable Person',
  'SEZ Unit/Developer', 'Non-Resident'];
const GSTR1_PERIODICITIES = ['Monthly', 'Quarterly'];
const PLACE_OF_SUPPLY = ['Default - Based on Supply Type',
  'State of Supplier', 'State of Recipient'];
const ENTERPRISE_TYPES = ['Micro', 'Small', 'Medium'];
const MSME_ACTIVITIES = ['Manufacturing', 'Services', 'Trading'];
const COMPLIANCE_REGIONS = [
  { value: 'india', label: 'India' },
  { value: 'eu', label: 'EU (GDPR)' },
  { value: 'us', label: 'US' },
  { value: 'apac', label: 'APAC' },
  { value: 'global', label: 'Global' },
];
const ACCOUNTING_TERMINOLOGIES = [
  { value: 'india-saarc', label: 'India-SAARC' },
  { value: 'international', label: 'International' },
  { value: 'us-gaap', label: 'US GAAP' },
  { value: 'ifrs', label: 'IFRS' },
];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Under Formation', 'Suspended', 'Closed'];
const COLOR_SWATCHES = ['#0D9488', '#1E3A5F', '#1E40AF', '#7C3AED', '#B91C1C',
  '#D97706', '#065F46', '#0F766E', '#334155', '#1C1917'];

// ── Initial form ─────────────────────────────────────────────────────────────
const INITIAL_FORM = {
  hasCIN: false,
  legalEntityName: '', tradingBrandName: '', shortCode: '',
  businessEntity: '', industry: '', businessActivity: '',
  hqAddress: '', hqCountry: 'India', hqState: '', hqDistrict: '',
  hqCity: '', hqPostalCode: '', hqTimezone: 'Asia/Kolkata', hqLat: '', hqLng: '',
  corpSameAsHq: false, corpAddress: '', corpCountry: '', corpState: '',
  corpCity: '', corpPostalCode: '',
  mainPhoneCode: '+91', mainPhone: '',
  mainMobileCode: '+91', mainMobile: '',
  corporateEmail: '', supportEmail: '', website: '',
  fyPreset: 'india', fyStartMonth: 'april',
  fyFrom: '', fyTo: '', booksStartDate: '',
  baseCurrency: 'INR', currencySymbol: '₹', currencyFormalName: 'Indian Rupee',
  suffixSymbol: false, addSpaceBetween: false, showInMillions: false,
  decimalPlaces: '2', wordForDecimal: 'Paise',
  cin: '', cinFormatted: '', incorporationDate: '',
  panNumber: '', panFormatted: '', iecCode: '',
  shopsEstablishmentNo: '', tradeLicenceNo: '', professionalTaxNo: '',
  jurisdiction: '',
  enableMultiCurrency: false,
  msmeApplicable: false, msmeApplicableFrom: '', msmeEnterpriseType: '',
  msmeUdyamRegNo: '', msmeActivityType: '', msmeCreditPeriodDays: '45',
  msmeNoCreditPeriod: false,
  hasGSTRegistration: false, hasLUTBond: false,
  eInvoiceApplicable: false, eInvoiceFrom: '', eWayBillApplicable: false,
  eWayBillFrom: '', eWayBillFor: '', eWayThreshold: '', eWayThresholdIncludes: '',
  hasTDS: false, tdsTanNo: '', tdsTanFormatted: '', tdsDeductorType: '',
  tdsDeductorBranch: '', tdsPersonName: '', tdsPersonDesignation: '',
  tdsPersonPan: '', tdsPersonMobile: '', tdsPersonEmail: '',
  hasTCS: false, tcsTanNo: '', tcsTanFormatted: '', tcsCollectorType: '',
  tcsCollectorBranch: '',
  hasPayrollStatutory: false,
  pfCompanyCode: '', pfAccountCode: '', pfSecurityCode: '',
  esiCompanyCode: '', esiBranchOffice: '', esiWorkingDays: '26',
  npsCorporateRegNo: '', npsBranchOfficeNo: '',
  lwfRegNo: '', lwfState: '',
  complianceRegion: 'india', accountingTerminology: 'india-saarc',
  auditLogEnabled: true,
  timezone: 'Asia/Kolkata', language: 'en', status: 'Active',
  deploymentMode: 'single' as 'single' | 'multi' | 'holding',
  logoRight: '', logoCenter: '', logoLeft: '', favicon: '',
  primaryColor: '#0D9488', secondaryColor: '#1E1B2E', themeMode: 'light',
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ParentCompany() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showConfetti, setConfetti] = useState(false);
  const [gstRegs, setGstRegs] = useState<GSTReg[]>([]);
  const [lutBonds, setLutBonds] = useState<LUTBond[]>([]);
  const [govTab, setGovTab] = useState('companyInfo');
  const [addrTab, setAddrTab] = useState('hq');
  const [setupOpen, setSetupOpen] = useState(false);
  const [savedEntityId] = useState(() => crypto.randomUUID());
  const [fyFromDate, setFyFromDate] = useState<Date>();
  const [fyToDate, setFyToDate] = useState<Date>();
  const [booksDate, setBooksDate] = useState<Date>();
  const [incorporationDt, setIncorpDt] = useState<Date>();

  const upd = useCallback((field: string, val: unknown) => {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }, []);

  const lsObj = <T,>(k: string, def: T): T => {
    // [JWT] GET /api/foundation/company
    try { const v = localStorage.getItem(k); return v ? {...def, ...JSON.parse(v)} : def; }
    catch { return def; }
  };

  // Load saved data on mount
  useEffect(() => {
    const saved = lsObj('erp_parent_company', INITIAL_FORM);
    if (saved && saved.legalEntityName) {
      setForm(f => ({ ...f, ...saved }));
      const full = lsObj<any>('erp_parent_company', {});
      if (full.gstRegs) setGstRegs(full.gstRegs);
      if (full.lutBonds) setLutBonds(full.lutBonds);
    }
  }, []); // eslint-disable-line

  // Auto-suggest short code
  useEffect(() => {
    if (form.legalEntityName && !form.shortCode) {
      upd('shortCode', suggestShortCode(form.legalEntityName));
    }
  }, [form.legalEntityName]); // eslint-disable-line

  // Auto-calculate FY dates
  useEffect(() => {
    if (form.fyPreset === 'custom') return;
    const monthIdx = FY_MONTHS.indexOf(form.fyStartMonth);
    if (monthIdx < 0) return;
    const now = new Date();
    const curYear = now.getMonth() >= monthIdx ? now.getFullYear() : now.getFullYear() - 1;
    const from = new Date(curYear, monthIdx, 1);
    const to = new Date(curYear + 1, monthIdx, 0);
    setFyFromDate(from); setFyToDate(to);
    upd('fyFrom', format(from, 'dd MMM yyyy'));
    upd('fyTo', format(to, 'dd MMM yyyy'));
  }, [form.fyPreset, form.fyStartMonth]); // eslint-disable-line

  // Corp same-as-HQ
  useEffect(() => {
    if (!form.corpSameAsHq) return;
    upd('corpAddress', form.hqAddress);
    upd('corpCountry', form.hqCountry);
    upd('corpState', form.hqState);
    upd('corpCity', form.hqCity);
    upd('corpPostalCode', form.hqPostalCode);
  }, [form.corpSameAsHq, form.hqAddress, form.hqCountry, form.hqState, form.hqCity, form.hqPostalCode]); // eslint-disable-line

  // Completion tracking
  const completedSteps = useCallback(() => {
    const d: number[] = [];
    if (form.legalEntityName && form.businessEntity && form.industry && form.shortCode) d.push(1);
    if (form.hqAddress && form.hqCity && form.hqState && form.corporateEmail) d.push(2);
    if (form.baseCurrency && fyFromDate && fyToDate) d.push(3);
    if (form.cin || form.panNumber || form.hasGSTRegistration) d.push(4);
    if (form.timezone && form.deploymentMode) d.push(5);
    if (form.logoLeft || form.logoCenter || form.primaryColor !== '#0D9488') d.push(6);
    return d;
  }, [form, fyFromDate, fyToDate]);

  const done = completedSteps();
  // [JWT] GET /api/foundation/company
  const isEditMode = localStorage.getItem('erp_parent_company_saved') === 'true';

  // Confetti — fires on save, not on step completion
  // useEffect(() => {
  //   if (done.length === 6 && !showConfetti) setConfetti(true);
  // }, [done.length]);

  // Amount display preview
  function fmtAmountPreview() {
    const dec = parseInt(form.decimalPlaces) || 2;
    const s = form.currencySymbol || '₹';
    const sp = form.addSpaceBetween ? ' ' : '';
    const num = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: dec, maximumFractionDigits: dec,
    }).format(1000000);
    return form.suffixSymbol ? `${num}${sp}${s}` : `${s}${sp}${num}`;
  }

  // Logo upload (base64 mock)
  function handleLogoUpload(field: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => upd(field, ev.target?.result as string);
    r.readAsDataURL(file);
  }

  // GST helpers
  function addGST() {
    const n: GSTReg = {
      id: Date.now().toString(), state: '', addressType: '',
      registrationType: '', gstin: '', gstinFormatted: '', gstinVerified: false,
      gstr1Periodicity: 'Monthly', placeOfSupply: 'Default - Based on Supply Type',
      assesseeOfOtherTerritory: false,
    };
    setGstRegs(g => [...g, n]);
  }
  function removeGST(id: string) { setGstRegs(g => g.filter(r => r.id !== id)); }
  function updateGST(id: string, field: keyof GSTReg, val: unknown) {
    setGstRegs(g => g.map(r => r.id === id ? { ...r, [field]: val } : r));
  }

  // LUT Bond helpers
  function addLUT() {
    const n: LUTBond = { id: Date.now().toString(), applicableFrom: '', applicableTo: '', lutBondNo: '' };
    setLutBonds(l => [...l, n]);
  }
  function removeLUT(id: string) { setLutBonds(l => l.filter(b => b.id !== id)); }
  function updateLUT(id: string, field: keyof LUTBond, val: string) {
    setLutBonds(l => l.map(b => b.id === id ? { ...b, [field]: val } : b));
  }

  // Save
  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      // [JWT] Replace with: POST /api/foundation/parent-company
      const monthMap: Record<string, string> = {
        january: '0', february: '1', march: '2', april: '3', may: '4', june: '5',
        july: '6', august: '7', september: '8', october: '9', november: '10', december: '11',
      };
      // Write full form + GST/LUT arrays
      // [JWT] PATCH /api/foundation/company
      localStorage.setItem('erp_parent_company', JSON.stringify({
        ...form, gstRegs, lutBonds,
        fyFromDate: fyFromDate?.toISOString(),
        fyToDate: fyToDate?.toISOString(),
        booksDate: booksDate?.toISOString(),
        incorporationDate: incorporationDt?.toISOString(),
      })); /* [JWT] POST /api/foundation/parent-company */

      // Auto-create forex ledgers + voucher type when multi-currency is enabled
      if (form.enableMultiCurrency) {
        try {
          // [JWT] POST /api/group/finecore/ledger-definitions (forex system ledgers)
          const ledgerDefs: any[] = JSON.parse(localStorage.getItem('erp_ledger_definitions') || '[]');
          const now = new Date().toISOString();
          const fxGainCode = 'FXGAIN-SYS';
          const fxLossCode = 'FXLOSS-SYS';
          if (!ledgerDefs.find(l => l.code === fxGainCode)) {
            ledgerDefs.push({
              id: `ldg-${fxGainCode}`, code: fxGainCode,
              name: 'Forex Gain A/c', mailingName: 'Forex Gain A/c',
              l3GroupCode: 'FXGAIN', l3GroupName: 'Foreign Exchange Gain',
              nature: 'Cr', is_system: true, is_active: true,
              openingBalance: 0, openingBalanceType: 'Cr',
              scope: 'group', entity_id: null,
              created_at: now, updated_at: now,
            });
          }
          if (!ledgerDefs.find(l => l.code === fxLossCode)) {
            ledgerDefs.push({
              id: `ldg-${fxLossCode}`, code: fxLossCode,
              name: 'Forex Loss A/c', mailingName: 'Forex Loss A/c',
              l3GroupCode: 'FXLOSS', l3GroupName: 'Foreign Exchange Loss',
              nature: 'Dr', is_system: true, is_active: true,
              openingBalance: 0, openingBalanceType: 'Dr',
              scope: 'group', entity_id: null,
              created_at: now, updated_at: now,
            });
          }
          // [JWT] PATCH /api/foundation/company
          localStorage.setItem('erp_ledger_definitions', JSON.stringify(ledgerDefs));
          // [JWT] POST /api/accounting/voucher-types (forex adjustment journal)
          const vtypes: any[] = JSON.parse(localStorage.getItem('erp_voucher_types') || '[]');
          if (!vtypes.find(v => v.abbreviation === 'FXADJ')) {
            vtypes.push({
              id: `vt-fxadj-${Date.now()}`, name: 'Forex Adjustment',
              abbreviation: 'FXADJ', base_voucher_type: 'Journal', family: 'Accounting',
              is_active: true, is_system: true, activation_type: 'active',
              accounting_impact: true, inventory_impact: false,
              is_optional_default: false, use_effective_date: false,
              allow_zero_value: false, allow_narration: true, allow_line_narration: true,
              numbering_method: 'automatic', use_custom_series: false,
              numbering_prefix: 'FXADJ-', numbering_suffix: '', numbering_start: 1,
              numbering_width: 4, numbering_prefill_zeros: true,
              prevent_duplicate_manual: true,
              insertion_deletion_behaviour: 'retain_original', show_unused_numbers: false,
              current_sequence: 1, behaviour_rules: [
                { id: 'rule-forex-standard', rule_type: 'forex_capture', label: 'Forex capture — standard rate', is_active: true, sequence: 10,
                  config: { default_rate_type: 'standard', allow_rate_override: true, require_rate_if_foreign: true, store_dual_amounts: true } },
                { id: 'rule-forex-reval', rule_type: 'forex_settlement', label: 'Unrealized forex revaluation (AS-11)', is_active: true, sequence: 11,
                  config: { calculate_realized_gain_loss: true, gain_ledger_code: 'FXGAIN-SYS', loss_ledger_code: 'FXLOSS-SYS', auto_reversal_on_next_period: true } },
              ],
              print_after_save: false, use_for_pos: false, print_title: '',
              default_bank_ledger_id: null, default_jurisdiction: '', declaration_text: '',
              entity_id: null, created_at: now, updated_at: now,
            });
            // [JWT] PATCH /api/foundation/company
            localStorage.setItem('erp_voucher_types', JSON.stringify(vtypes));
          }
        } catch { /* non-fatal — forex setup can be retried */ }
      }

      // Write ERP global settings (existing behaviour — keep)
      // [JWT] PATCH /api/foundation/company
      localStorage.setItem('erp_fy_start_month', monthMap[form.fyStartMonth] ?? '3');
      // [JWT] PATCH /api/foundation/company
      localStorage.setItem('erp_deployment_mode', form.deploymentMode);
      // [JWT] PATCH /api/foundation/company
      localStorage.setItem('erp_base_currency', form.baseCurrency);
      // [JWT] PATCH /api/foundation/company
      localStorage.setItem('erp_currency_symbol', form.currencySymbol);
      // [JWT] PATCH /api/foundation/company
      localStorage.setItem('erp_parent_company_saved', 'true');
      setSaving(false);
      setConfetti(true);
      toast.success('Parent Company saved', {
        description: 'Financial year and deployment mode applied to all modules.',
      });
      setSetupOpen(true);
    }, 900);
  }

  // ── Date picker helper ──────────────────────────────────────────────────────
  function DateField({ label, required, date, onSelect, displayValue }: {
    label: string; required?: boolean; date?: Date;
    onSelect: (d: Date | undefined) => void; displayValue: string;
  }) {
    return (
      <FormField label={label} required={required}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start text-left text-xs font-normal', !date && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {displayValue || 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus />
          </PopoverContent>
        </Popover>
      </FormField>
    );
  }

  // ── Step renderers ─────────────────────────────────────────────────────────
  function renderStep() {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      default: return null;
    }
  }

  // ── Step 1: Identity & Core ────────────────────────────────────────────────
  function renderStep1() {
    const suggested = suggestShortCode(form.legalEntityName);
    return (
      <FormSection title="Identity & Core Details" icon={<Building className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Legal Entity Name" required error={errors.legalEntityName}>
            <Input value={form.legalEntityName} onChange={e => upd('legalEntityName', e.target.value)} placeholder="e.g. SmartOps Industries Pvt Ltd" className="text-xs" />
          </FormField>
          <FormField label="Trading / Brand Name">
            <Input value={form.tradingBrandName} onChange={e => upd('tradingBrandName', e.target.value)} placeholder="e.g. SmartOps" className="text-xs" />
          </FormField>
          <FormField label="Business Entity" required>
            <Select value={form.businessEntity} onValueChange={v => upd('businessEntity', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select entity type" /></SelectTrigger>
              <SelectContent>{BUSINESS_ENTITIES.map(b => <SelectItem key={b} value={b}><span className="text-xs">{b}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Industry / Sector" required>
            <Select value={form.industry} onValueChange={v => upd('industry', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}><span className="text-xs">{i}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Business Activity" required>
            <Select value={form.businessActivity} onValueChange={v => upd('businessActivity', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select activity" /></SelectTrigger>
              <SelectContent>{BUSINESS_ACTIVITIES.map(a => <SelectItem key={a} value={a}><span className="text-xs">{a}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Short Code" required hint="Used as prefix for transaction codes. Cannot change after first transaction.">
            <div className="space-y-1.5">
              <Input value={form.shortCode} onChange={e => upd('shortCode', formatShortCode(e.target.value))} maxLength={6} placeholder="e.g. SMRT" className="text-xs font-mono" />
              {suggested && form.legalEntityName && (
                <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10" onClick={() => upd('shortCode', suggested)}>
                  Suggested: {suggested}
                </Badge>
              )}
            </div>
          </FormField>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground">Organisation ID auto-generated on creation</p>
        </div>
        <Separator className="my-4" />
        <CompanyProfilePreview data={{
          legalEntityName: form.legalEntityName, tradingBrandName: form.tradingBrandName,
          businessEntity: form.businessEntity, industry: form.industry,
          hqCity: form.hqCity, hqCountry: form.hqCountry,
          corporateEmail: form.corporateEmail, website: form.website,
          status: form.status, logo: form.logoLeft || form.logoCenter || form.logoRight,
          primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
          shortCode: form.shortCode,
        }} />
      </FormSection>
    );
  }

  // ── Step 2: Address & Contact ──────────────────────────────────────────────
  function renderStep2() {
    return (
      <FormSection title="Address & Contact" icon={<MapPin className="h-4 w-4" />}>
        <Tabs value={addrTab} onValueChange={setAddrTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="hq" className="text-xs">Headquarters</TabsTrigger>
            <TabsTrigger value="corp" className="text-xs">Corporate Office</TabsTrigger>
          </TabsList>

          <TabsContent value="hq">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Address" required className="md:col-span-2">
                <Input value={form.hqAddress} onChange={e => upd('hqAddress', e.target.value)} placeholder="Street address" className="text-xs" />
              </FormField>
              <FormField label="Country">
                <Select value={form.hqCountry} onValueChange={v => upd('hqCountry', v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}><span className="text-xs">{c}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="State" required>
                <Select value={form.hqState} onValueChange={v => upd('hqState', v)}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{INDIAN_STATE_NAMES.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="District">
                <Input value={form.hqDistrict} onChange={e => upd('hqDistrict', e.target.value)} className="text-xs" />
              </FormField>
              <FormField label="City" required>
                <Input value={form.hqCity} onChange={e => upd('hqCity', e.target.value)} className="text-xs" />
              </FormField>
              <FormField label="Postal Code">
                <Input value={form.hqPostalCode} onChange={e => upd('hqPostalCode', e.target.value)} maxLength={6} className="text-xs font-mono" />
              </FormField>
              <FormField label="Timezone">
                <Select value={form.hqTimezone} onValueChange={v => upd('hqTimezone', v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map(t => <SelectItem key={t.value} value={t.value}><span className="text-xs">{t.label}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Latitude">
                <Input value={form.hqLat} onChange={e => upd('hqLat', e.target.value)} placeholder="Optional" className="text-xs" />
              </FormField>
              <FormField label="Longitude">
                <Input value={form.hqLng} onChange={e => upd('hqLng', e.target.value)} placeholder="Optional" className="text-xs" />
              </FormField>
            </div>
          </TabsContent>

          <TabsContent value="corp">
            <div className="flex items-center gap-2 mb-4">
              <Switch checked={form.corpSameAsHq} onCheckedChange={v => upd('corpSameAsHq', v)} />
              <span className="text-xs text-muted-foreground">Same as HQ</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Address" className="md:col-span-2">
                <Input value={form.corpAddress} onChange={e => upd('corpAddress', e.target.value)} disabled={form.corpSameAsHq} className="text-xs" />
              </FormField>
              <FormField label="Country">
                <Select value={form.corpCountry} onValueChange={v => upd('corpCountry', v)} disabled={form.corpSameAsHq}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}><span className="text-xs">{c}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="State">
                <Select value={form.corpState} onValueChange={v => upd('corpState', v)} disabled={form.corpSameAsHq}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{INDIAN_STATE_NAMES.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="City">
                <Input value={form.corpCity} onChange={e => upd('corpCity', e.target.value)} disabled={form.corpSameAsHq} className="text-xs" />
              </FormField>
              <FormField label="Postal Code">
                <Input value={form.corpPostalCode} onChange={e => upd('corpPostalCode', e.target.value)} disabled={form.corpSameAsHq} maxLength={6} className="text-xs font-mono" />
              </FormField>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Main Phone">
            <div className="flex gap-2">
              <Select value={form.mainPhoneCode} onValueChange={v => upd('mainPhoneCode', v)}>
                <SelectTrigger className="w-20 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ISD_CODES.map(c => <SelectItem key={c} value={c}><span className="text-xs">{c}</span></SelectItem>)}</SelectContent>
              </Select>
              <Input value={form.mainPhone} onChange={e => upd('mainPhone', e.target.value)} className="text-xs" />
            </div>
          </FormField>
          <FormField label="Main Mobile">
            <div className="flex gap-2">
              <Select value={form.mainMobileCode} onValueChange={v => upd('mainMobileCode', v)}>
                <SelectTrigger className="w-20 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ISD_CODES.map(c => <SelectItem key={c} value={c}><span className="text-xs">{c}</span></SelectItem>)}</SelectContent>
              </Select>
              <Input value={form.mainMobile} onChange={e => upd('mainMobile', e.target.value)} className="text-xs" />
            </div>
          </FormField>
          <FormField label="Corporate Email" required>
            <Input type="email" value={form.corporateEmail} onChange={e => upd('corporateEmail', e.target.value)} className="text-xs" />
          </FormField>
          <FormField label="Support Email">
            <Input type="email" value={form.supportEmail} onChange={e => upd('supportEmail', e.target.value)} className="text-xs" />
          </FormField>
          <FormField label="Website">
            <Input value={form.website} onChange={e => upd('website', e.target.value)} placeholder="https://" className="text-xs" />
          </FormField>
        </div>
      </FormSection>
    );
  }

  // ── Step 3: Financial ──────────────────────────────────────────────────────
  function renderStep3() {
    return (
      <FormSection title="Financial Year & Currency" icon={<DollarSign className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="FY Preset" required>
            <Select value={form.fyPreset} onValueChange={v => {
              upd('fyPreset', v);
              const preset = FY_PRESETS.find(p => p.value === v);
              if (preset && preset.month) upd('fyStartMonth', preset.month);
            }}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{FY_PRESETS.map(p => <SelectItem key={p.value} value={p.value}><span className="text-xs">{p.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          {form.fyPreset === 'custom' && (
            <FormField label="FY Starting Month">
              <Select value={form.fyStartMonth} onValueChange={v => upd('fyStartMonth', v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{FY_MONTHS.map(m => <SelectItem key={m} value={m}><span className="text-xs capitalize">{m}</span></SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          )}
          <DateField label="FY From" required date={fyFromDate} onSelect={d => { setFyFromDate(d); if (d) upd('fyFrom', format(d, 'dd MMM yyyy')); }} displayValue={form.fyFrom} />
          <DateField label="FY To" date={fyToDate} onSelect={d => { setFyToDate(d); if (d) upd('fyTo', format(d, 'dd MMM yyyy')); }} displayValue={form.fyTo} />
          <DateField label="Books Start Date" date={booksDate} onSelect={d => { setBooksDate(d); if (d) upd('booksStartDate', format(d, 'dd MMM yyyy')); }} displayValue={form.booksStartDate} />
        </div>

        <Separator className="my-4" />
        <p className="text-xs font-semibold text-foreground mb-3">Currency Settings</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Base Currency" required>
            <Select value={form.baseCurrency} onValueChange={v => {
              upd('baseCurrency', v);
              const c = CURRENCIES.find(c => c.code === v);
              if (c) { upd('currencySymbol', c.symbol); upd('currencyFormalName', c.name); }
            }}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}><span className="text-xs">{c.code} — {c.name}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Currency Symbol">
            <Input value={form.currencySymbol} onChange={e => upd('currencySymbol', e.target.value)} className="text-xs" />
          </FormField>
          <FormField label="Currency Formal Name">
            <Input value={form.currencyFormalName} onChange={e => upd('currencyFormalName', e.target.value)} className="text-xs" />
          </FormField>
        </div>

        <Separator className="my-4" />
        <p className="text-xs font-semibold text-foreground mb-3">Amount Display Options</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Suffix Symbol to Amount</span>
            <Switch checked={form.suffixSymbol} onCheckedChange={v => upd('suffixSymbol', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Add Space Between</span>
            <Switch checked={form.addSpaceBetween} onCheckedChange={v => upd('addSpaceBetween', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Show in Millions</span>
            <Switch checked={form.showInMillions} onCheckedChange={v => upd('showInMillions', v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Decimal Places">
              <Select value={form.decimalPlaces} onValueChange={v => upd('decimalPlaces', v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{['0', '1', '2', '3'].map(d => <SelectItem key={d} value={d}><span className="text-xs">{d}</span></SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Word for Decimal">
              <Input value={form.wordForDecimal} onChange={e => upd('wordForDecimal', e.target.value)} className="text-xs" />
            </FormField>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border text-center">
          <p className="text-xs text-muted-foreground mb-1">Live Preview</p>
          <p className="text-2xl font-bold text-foreground">{fmtAmountPreview()}</p>
        </div>
      </FormSection>
    );
  }

  // ── Step 4: Governance ─────────────────────────────────────────────────────
  function renderStep4() {
    return (
      <FormSection title="Governance & Compliance" icon={<Shield className="h-4 w-4" />}>
        <Tabs value={govTab} onValueChange={setGovTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="companyInfo" className="text-xs">Company Info</TabsTrigger>
            <TabsTrigger value="gst" className="text-xs">GST</TabsTrigger>
            <TabsTrigger value="incomeTax" className="text-xs">Income Tax</TabsTrigger>
            <TabsTrigger value="payroll" className="text-xs">Payroll</TabsTrigger>
          </TabsList>

          {/* Company Info tab */}
          <TabsContent value="companyInfo">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Switch
                  checked={form.hasCIN as boolean}
                  onCheckedChange={v => {
                    upd('hasCIN', v);
                    if (!v) { upd('cin', ''); upd('cinFormatted', ''); }
                  }}
                />
                <span className="text-xs font-medium">Company Registration (CIN)</span>
              </div>
              {(form.hasCIN as boolean) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="CIN" error={validateCIN(form.cin).valid ? undefined : validateCIN(form.cin).message}>
                    <Input value={form.cin} onChange={e => upd('cin', formatCIN(e.target.value))} placeholder="U74999DL2020PTC123456" className="text-xs font-mono" />
                  </FormField>
                  <DateField label="Incorporation Date" date={incorporationDt} onSelect={d => { setIncorpDt(d); if (d) upd('incorporationDate', format(d, 'dd MMM yyyy')); }} displayValue={form.incorporationDate} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="PAN" error={validatePAN(form.panNumber).valid ? undefined : validatePAN(form.panNumber).message}>
                  <Input value={form.panNumber} onChange={e => upd('panNumber', formatPAN(e.target.value))} placeholder="AAAAA0000A" className="text-xs font-mono" />
                </FormField>
                <FormField label="IEC Code">
                  <Input value={form.iecCode} onChange={e => upd('iecCode', e.target.value)} className="text-xs font-mono" />
                </FormField>
              </div>

              <Separator />
              <div className="flex items-center gap-2 mb-2">
                <Switch checked={form.msmeApplicable} onCheckedChange={v => upd('msmeApplicable', v)} />
                <span className="text-xs font-medium">MSME Applicable</span>
              </div>
              {form.msmeApplicable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Applicable From">
                    <Input value={form.msmeApplicableFrom} onChange={e => upd('msmeApplicableFrom', e.target.value)} className="text-xs" />
                  </FormField>
                  <FormField label="Enterprise Type">
                    <Select value={form.msmeEnterpriseType} onValueChange={v => upd('msmeEnterpriseType', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{ENTERPRISE_TYPES.map(t => <SelectItem key={t} value={t}><span className="text-xs">{t}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Udyam Registration No">
                    <Input value={form.msmeUdyamRegNo} onChange={e => upd('msmeUdyamRegNo', e.target.value)} placeholder="UDYAM-KA-01-0000001" className="text-xs font-mono" />
                  </FormField>
                  <FormField label="Activity Type">
                    <Select value={form.msmeActivityType} onValueChange={v => upd('msmeActivityType', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{MSME_ACTIVITIES.map(a => <SelectItem key={a} value={a}><span className="text-xs">{a}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Credit Period (Days)">
                    <Input value={form.msmeCreditPeriodDays} onChange={e => upd('msmeCreditPeriodDays', e.target.value)} className="text-xs" />
                  </FormField>
                  <div className="flex items-center gap-2 self-end pb-1">
                    <Switch checked={form.msmeNoCreditPeriod} onCheckedChange={v => upd('msmeNoCreditPeriod', v)} />
                    <span className="text-xs text-muted-foreground">No Credit Period</span>
                  </div>
                </div>
              )}

              <Separator />
              <p className="text-xs font-semibold mb-2">Other Registrations</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Shops & Establishment No">
                  <Input value={form.shopsEstablishmentNo} onChange={e => upd('shopsEstablishmentNo', e.target.value)} className="text-xs" />
                </FormField>
                <FormField label="Trade Licence No">
                  <Input value={form.tradeLicenceNo} onChange={e => upd('tradeLicenceNo', e.target.value)} className="text-xs" />
                </FormField>
                <FormField label="Professional Tax No">
                  <Input value={form.professionalTaxNo} onChange={e => upd('professionalTaxNo', e.target.value)} className="text-xs" />
                </FormField>
              </div>

              <Separator />
              <FormField label="Jurisdiction" hint="Legal jurisdiction clause for invoices and vouchers. Set once here — auto-copied to all voucher types.">
                <Input
                  value={form.jurisdiction ?? ''}
                  onChange={e => upd('jurisdiction', e.target.value)}
                  placeholder="e.g. Subject to Mumbai, Maharashtra jurisdiction"
                  className="text-xs"
                />
              </FormField>

              <Separator />
              <p className="text-xs font-semibold mb-2">Compliance</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Compliance Region">
                  <Select value={form.complianceRegion} onValueChange={v => upd('complianceRegion', v)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPLIANCE_REGIONS.map(r => <SelectItem key={r.value} value={r.value}><span className="text-xs">{r.label}</span></SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Accounting Terminology">
                  <Select value={form.accountingTerminology} onValueChange={v => upd('accountingTerminology', v)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ACCOUNTING_TERMINOLOGIES.map(a => <SelectItem key={a.value} value={a.value}><span className="text-xs">{a.label}</span></SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.auditLogEnabled} onCheckedChange={v => upd('auditLogEnabled', v)} />
                <span className="text-xs text-muted-foreground">Enable Audit Log</span>
              </div>
            </div>
          </TabsContent>

          {/* GST tab */}
          <TabsContent value="gst">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.hasGSTRegistration} onCheckedChange={v => upd('hasGSTRegistration', v)} />
                <span className="text-xs font-medium">Has GST Registration</span>
              </div>
              {form.hasGSTRegistration && (
                <>
                  {gstRegs.map(reg => (
                    <div key={reg.id} className="border border-border rounded-lg p-4 space-y-3 relative">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeGST(reg.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label="State">
                          <Select value={reg.state} onValueChange={v => updateGST(reg.id, 'state', v)}>
                            <SelectTrigger className="text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                            <SelectContent>{INDIAN_STATE_NAMES.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Address Type">
                          <Select value={reg.addressType} onValueChange={v => updateGST(reg.id, 'addressType', v)}>
                            <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{GST_ADDRESS_TYPES.map(t => <SelectItem key={t} value={t}><span className="text-xs">{t}</span></SelectItem>)}</SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Registration Type">
                          <Select value={reg.registrationType} onValueChange={v => updateGST(reg.id, 'registrationType', v)}>
                            <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{GST_REG_TYPES.map(t => <SelectItem key={t} value={t}><span className="text-xs">{t}</span></SelectItem>)}</SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="GSTIN" error={validateGSTIN(reg.gstin).valid ? undefined : validateGSTIN(reg.gstin).message}>
                          <div className="flex gap-2">
                            <Input value={reg.gstin} onChange={e => updateGST(reg.id, 'gstin', formatGSTIN(e.target.value))} placeholder="22AAAAA0000A1Z5" className="text-xs font-mono" />
                            <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => toast.info('GSTIN verification', { description: '[JWT] Will verify via GST Portal API' })}>
                              Verify
                            </Button>
                          </div>
                        </FormField>
                        <FormField label="GSTR-1 Periodicity">
                          <Select value={reg.gstr1Periodicity} onValueChange={v => updateGST(reg.id, 'gstr1Periodicity', v)}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{GSTR1_PERIODICITIES.map(p => <SelectItem key={p} value={p}><span className="text-xs">{p}</span></SelectItem>)}</SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Place of Supply">
                          <Select value={reg.placeOfSupply} onValueChange={v => updateGST(reg.id, 'placeOfSupply', v)}>
                            <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{PLACE_OF_SUPPLY.map(p => <SelectItem key={p} value={p}><span className="text-xs">{p}</span></SelectItem>)}</SelectContent>
                          </Select>
                        </FormField>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={reg.assesseeOfOtherTerritory} onCheckedChange={v => updateGST(reg.id, 'assesseeOfOtherTerritory', v)} />
                        <span className="text-xs text-muted-foreground">Assessee of Other Territory</span>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addGST} className="text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add GST Registration
                  </Button>
                </>
              )}

              <Separator />
              <p className="text-xs font-semibold mb-2">e-Invoice</p>
              <div className="flex items-center gap-2 mb-2">
                <Switch checked={form.eInvoiceApplicable} onCheckedChange={v => upd('eInvoiceApplicable', v)} />
                <span className="text-xs text-muted-foreground">e-Invoice Applicable</span>
              </div>
              {form.eInvoiceApplicable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Applicable From">
                    <Input value={form.eInvoiceFrom} onChange={e => upd('eInvoiceFrom', e.target.value)} className="text-xs" />
                  </FormField>
                </div>
              )}

              <Separator />
              <p className="text-xs font-semibold mb-2">e-Way Bill</p>
              <div className="flex items-center gap-2 mb-2">
                <Switch checked={form.eWayBillApplicable} onCheckedChange={v => upd('eWayBillApplicable', v)} />
                <span className="text-xs text-muted-foreground">e-Way Bill Applicable</span>
              </div>
              {form.eWayBillApplicable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Applicable From">
                    <Input value={form.eWayBillFrom} onChange={e => upd('eWayBillFrom', e.target.value)} className="text-xs" />
                  </FormField>
                  <FormField label="Applicable For">
                    <Select value={form.eWayBillFor} onValueChange={v => upd('eWayBillFor', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interstate"><span className="text-xs">Interstate</span></SelectItem>
                        <SelectItem value="intrastate"><span className="text-xs">Intrastate</span></SelectItem>
                        <SelectItem value="both"><span className="text-xs">Both</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Threshold Limit">
                    <Input value={form.eWayThreshold} onChange={e => upd('eWayThreshold', e.target.value)} className="text-xs" />
                  </FormField>
                  <FormField label="Threshold Includes">
                    <Select value={form.eWayThresholdIncludes} onValueChange={v => upd('eWayThresholdIncludes', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="taxable"><span className="text-xs">Taxable Value</span></SelectItem>
                        <SelectItem value="invoice"><span className="text-xs">Invoice Value</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              )}

              <Separator />
              <div className="flex items-center gap-2 mb-2">
                <Switch checked={form.hasLUTBond} onCheckedChange={v => upd('hasLUTBond', v)} />
                <span className="text-xs font-medium">LUT / Bond</span>
              </div>
              {form.hasLUTBond && (
                <>
                  {lutBonds.map(bond => (
                    <div key={bond.id} className="border border-border rounded-lg p-3 flex items-end gap-3 relative">
                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeLUT(bond.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                      <FormField label="From" className="flex-1">
                        <Input value={bond.applicableFrom} onChange={e => updateLUT(bond.id, 'applicableFrom', e.target.value)} className="text-xs" />
                      </FormField>
                      <FormField label="To" className="flex-1">
                        <Input value={bond.applicableTo} onChange={e => updateLUT(bond.id, 'applicableTo', e.target.value)} className="text-xs" />
                      </FormField>
                      <FormField label="LUT/Bond No" className="flex-1">
                        <Input value={bond.lutBondNo} onChange={e => updateLUT(bond.id, 'lutBondNo', e.target.value)} className="text-xs font-mono" />
                      </FormField>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addLUT} className="text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add LUT Bond Detail
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* Income Tax tab */}
          <TabsContent value="incomeTax">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.hasTDS} onCheckedChange={v => upd('hasTDS', v)} />
                <span className="text-xs font-medium">TDS Applicable</span>
              </div>
              {form.hasTDS && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="TAN" error={validateTAN(form.tdsTanNo).valid ? undefined : validateTAN(form.tdsTanNo).message}>
                      <Input value={form.tdsTanNo} onChange={e => upd('tdsTanNo', formatTAN(e.target.value))} placeholder="ABCD12345E" className="text-xs font-mono" />
                    </FormField>
                    <FormField label="Deductor Type">
                      <Select value={form.tdsDeductorType} onValueChange={v => upd('tdsDeductorType', v)}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{DEDUCTOR_TYPES.map(d => <SelectItem key={d} value={d}><span className="text-xs">{d}</span></SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Branch / Division">
                      <Input value={form.tdsDeductorBranch} onChange={e => upd('tdsDeductorBranch', e.target.value)} className="text-xs" />
                    </FormField>
                  </div>
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold">Person Responsible</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField label="Name">
                        <Input value={form.tdsPersonName} onChange={e => upd('tdsPersonName', e.target.value)} className="text-xs" />
                      </FormField>
                      <FormField label="Designation">
                        <Input value={form.tdsPersonDesignation} onChange={e => upd('tdsPersonDesignation', e.target.value)} className="text-xs" />
                      </FormField>
                      <FormField label="PAN">
                        <Input value={form.tdsPersonPan} onChange={e => upd('tdsPersonPan', formatPAN(e.target.value))} className="text-xs font-mono" />
                      </FormField>
                      <FormField label="Mobile">
                        <Input value={form.tdsPersonMobile} onChange={e => upd('tdsPersonMobile', e.target.value)} className="text-xs" />
                      </FormField>
                      <FormField label="Email">
                        <Input value={form.tdsPersonEmail} onChange={e => upd('tdsPersonEmail', e.target.value)} className="text-xs" />
                      </FormField>
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div className="flex items-center gap-2">
                <Switch checked={form.hasTCS} onCheckedChange={v => upd('hasTCS', v)} />
                <span className="text-xs font-medium">TCS Applicable</span>
              </div>
              {form.hasTCS && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="TCS TAN" error={validateTAN(form.tcsTanNo).valid ? undefined : validateTAN(form.tcsTanNo).message}>
                    <Input value={form.tcsTanNo} onChange={e => upd('tcsTanNo', formatTAN(e.target.value))} className="text-xs font-mono" />
                  </FormField>
                  <FormField label="Collector Type">
                    <Select value={form.tcsCollectorType} onValueChange={v => upd('tcsCollectorType', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{DEDUCTOR_TYPES.map(d => <SelectItem key={d} value={d}><span className="text-xs">{d}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Collector Branch">
                    <Input value={form.tcsCollectorBranch} onChange={e => upd('tcsCollectorBranch', e.target.value)} className="text-xs" />
                  </FormField>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Payroll tab */}
          <TabsContent value="payroll">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.hasPayrollStatutory} onCheckedChange={v => upd('hasPayrollStatutory', v)} />
                <span className="text-xs font-medium">Payroll Statutory Applicable</span>
              </div>
              {form.hasPayrollStatutory && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold">PF (Provident Fund)</p>
                    <FormField label="Company Code"><Input value={form.pfCompanyCode} onChange={e => upd('pfCompanyCode', e.target.value)} className="text-xs" /></FormField>
                    <FormField label="Account Code"><Input value={form.pfAccountCode} onChange={e => upd('pfAccountCode', e.target.value)} className="text-xs" /></FormField>
                    <FormField label="Security Code"><Input value={form.pfSecurityCode} onChange={e => upd('pfSecurityCode', e.target.value)} className="text-xs" /></FormField>
                  </div>
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold">ESI</p>
                    <FormField label="Company Code"><Input value={form.esiCompanyCode} onChange={e => upd('esiCompanyCode', e.target.value)} className="text-xs" /></FormField>
                    <FormField label="Branch Office"><Input value={form.esiBranchOffice} onChange={e => upd('esiBranchOffice', e.target.value)} className="text-xs" /></FormField>
                    <FormField label="Working Days/Month"><Input value={form.esiWorkingDays} onChange={e => upd('esiWorkingDays', e.target.value)} className="text-xs" /></FormField>
                  </div>
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold">NPS</p>
                    <FormField label="Corporate Reg No"><Input value={form.npsCorporateRegNo} onChange={e => upd('npsCorporateRegNo', e.target.value)} className="text-xs" /></FormField>
                    <FormField label="Branch Office No"><Input value={form.npsBranchOfficeNo} onChange={e => upd('npsBranchOfficeNo', e.target.value)} className="text-xs" /></FormField>
                  </div>
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold">LWF</p>
                    <FormField label="Registration No"><Input value={form.lwfRegNo} onChange={e => upd('lwfRegNo', e.target.value)} className="text-xs" /></FormField>
                    <FormField label="State">
                      <Select value={form.lwfState} onValueChange={v => upd('lwfState', v)}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{INDIAN_STATE_NAMES.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </FormSection>
    );
  }

  // ── Step 5: Settings ───────────────────────────────────────────────────────
  function renderStep5() {
    const modes: { key: 'single' | 'multi' | 'holding'; title: string; desc: string }[] = [
      { key: 'single', title: 'Single Company', desc: 'One entity. Parent Company IS the operating company.' },
      { key: 'multi', title: 'Multi-Company', desc: 'Multiple registered entities. Use Companies + Branches.' },
      { key: 'holding', title: 'Holding Group', desc: 'Parent is a holding entity. Subsidiaries are operating.' },
    ];
    return (
      <FormSection title="Settings & Deployment" icon={<Settings2 className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Timezone">
            <Select value={form.timezone} onValueChange={v => upd('timezone', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMEZONES.map(t => <SelectItem key={t.value} value={t.value}><span className="text-xs">{t.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Default Language">
            <Select value={form.language} onValueChange={v => upd('language', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en"><span className="text-xs">English</span></SelectItem>
                <SelectItem value="hi"><span className="text-xs">Hindi (Coming Soon)</span></SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onValueChange={v => upd('status', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        </div>

        <Separator className="my-4" />
        <p className="text-xs font-semibold text-foreground mb-3">Deployment Mode</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {modes.map(m => (
            <button
              key={m.key}
              onClick={() => upd('deploymentMode', m.key)}
              className={cn(
                'text-left rounded-xl border p-4 transition-all',
                form.deploymentMode === m.key
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                  form.deploymentMode === m.key ? 'border-primary' : 'border-muted-foreground/40',
                )}>
                  {form.deploymentMode === m.key && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <span className="text-xs font-semibold">{m.title}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{m.desc}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          This controls whether the Company Selector appears in the ERP header.
        </p>
      </FormSection>
    );
  }

  // ── Step 6: Branding ───────────────────────────────────────────────────────
  function renderStep6() {
    const logoFields = [
      { key: 'logoRight', label: 'Logo Right' },
      { key: 'logoCenter', label: 'Logo Center' },
      { key: 'logoLeft', label: 'Logo Left' },
      { key: 'favicon', label: 'Favicon' },
    ];
    return (
      <FormSection title="Branding & Identity" icon={<Palette className="h-4 w-4" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {logoFields.map(f => (
            <div key={f.key}>
              <p className="text-xs font-medium text-foreground mb-2">{f.label}</p>
              <div className="relative border-2 border-dashed border-border rounded-lg h-28 flex items-center justify-center hover:border-primary/30 transition-colors">
                {(form as unknown as Record<string, string>)[f.key] ? (
                  <>
                    <img src={(form as unknown as Record<string, string>)[f.key]} alt={f.label} className="h-full w-full object-contain p-2 rounded-lg" />
                    <button onClick={() => upd(f.key, '')} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Drop or click</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(f.key, e)} />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />
        <p className="text-xs font-semibold text-foreground mb-3">Brand Color Palette</p>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Primary Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLOR_SWATCHES.map(c => (
                <button key={c} onClick={() => upd('primaryColor', c)} className={cn('h-8 w-8 rounded-lg border-2 transition-all', form.primaryColor === c ? 'border-primary scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">{form.primaryColor}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Secondary Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLOR_SWATCHES.map(c => (
                <button key={c} onClick={() => upd('secondaryColor', c)} className={cn('h-8 w-8 rounded-lg border-2 transition-all', form.secondaryColor === c ? 'border-primary scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">{form.secondaryColor}</p>
          </div>
        </div>

        <div className="mt-4">
          <FormField label="Theme Mode">
            <Select value={form.themeMode} onValueChange={v => upd('themeMode', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light"><span className="text-xs">Light</span></SelectItem>
                <SelectItem value="dark"><span className="text-xs">Dark</span></SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <Separator className="my-4" />
        <p className="text-xs font-semibold text-foreground mb-3">Live Preview</p>
        <CompanyProfilePreview data={{
          legalEntityName: form.legalEntityName, tradingBrandName: form.tradingBrandName,
          businessEntity: form.businessEntity, industry: form.industry,
          hqCity: form.hqCity, hqCountry: form.hqCountry,
          corporateEmail: form.corporateEmail, website: form.website,
          status: form.status, logo: form.logoLeft || form.logoCenter || form.logoRight,
          primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
          shortCode: form.shortCode,
        }} />
      </FormSection>
    );
  }

  // ── Step 7: Audit Trail ────────────────────────────────────────────────────
  function renderStep7() {
    if (!isEditMode) {
      return (
        <FormSection title="Audit Trail" icon={<History className="h-4 w-4" />}>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No history yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Changes will be tracked after the initial save.
            </p>
          </div>
        </FormSection>
      );
    }
    // [JWT] Replace with real audit log API — GET /api/foundation/parent-company/audit
    const mockAudit = [
      { ts: '06 Apr 2026 10:30 AM', user: 'Arjun Mehta', action: 'Created Parent Company', field: '-' },
      { ts: '06 Apr 2026 11:15 AM', user: 'Arjun Mehta', action: 'Updated FY Start Month', field: 'fyStartMonth: april → january' },
      { ts: '06 Apr 2026 02:45 PM', user: 'Arjun Mehta', action: 'Updated Deployment Mode', field: 'deploymentMode: single → multi' },
    ];
    return (
      <FormSection title="Audit Trail" icon={<History className="h-4 w-4" />}>
        <div className="space-y-3">
          {mockAudit.map((entry, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{entry.action}</p>
                <p className="text-[10px] text-muted-foreground">{entry.field}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{entry.user} · {entry.ts}</p>
              </div>
            </div>
          ))}
        </div>
      </FormSection>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
    <SidebarProvider defaultOpen={false}>
    <div className="min-h-screen bg-background">
      <Confetti active={showConfetti} onComplete={() => setConfetti(false)} />
      <ERPHeader
        breadcrumbs={[
          { label: 'Operix Core', href: '/erp/dashboard' },
          { label: 'Command Center', href: '/erp/command-center' },
          { label: 'Foundation' },
          { label: 'Parent Company' },
        ]}
        showDatePicker={false}
        showCompany={false}
      />

      <div data-keyboard-form className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Parent Company</h1>
          <p className="text-sm text-muted-foreground">Configure your organisation root entity</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="hidden lg:block w-64 shrink-0">
            <ProgressStepper
              steps={STEPS}
              currentStep={step}
              onStepClick={setStep}
              completedSteps={done}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {renderStep()}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              {step < 7 ? (
                <Button data-primary onClick={() => setStep(s => Math.min(7, s + 1))}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button data-primary
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(done.length === 6 && 'ring-2 ring-primary/40 animate-pulse')}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {saving ? 'Saving...' : 'Save Parent Company'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </SidebarProvider>
    <EntitySetupDialog
      open={setupOpen}
      onOpenChange={setSetupOpen}
      entityName={form.legalEntityName}
      entityId={savedEntityId}
      shortCode={form.shortCode}
      entityType="parent"
      businessEntity={form.businessEntity}
      industry={form.industry}
      businessActivity={form.businessActivity}
      onComplete={(result) => {
        toast.success(`${form.legalEntityName} is ready. ${result.ledgersCreated} ledgers created.`);
      }}
    />
    </>
  );
}
