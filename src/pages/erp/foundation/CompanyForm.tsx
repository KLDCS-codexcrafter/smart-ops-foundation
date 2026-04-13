/**
 * CompanyForm.tsx — 7-step wizard for Company and Subsidiary.
 * entityType prop switches between the two. mode=create|edit.
 * [JWT] Replace mock data with real API queries.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Building, Building2, MapPin, DollarSign, Shield, Settings2, Palette,
  History, CalendarIcon, Upload, X, Plus, Trash2,
  ChevronLeft, ChevronRight, Save, Loader2, Globe, CheckCircle2,
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
import { GovernanceForm, type GSTReg, type LUTBond } from '@/components/company/GovernanceForm';
import { Confetti } from '@/components/ui/confetti';
import {
  formatPAN, formatShortCode, suggestShortCode, INDIAN_STATE_NAMES,
} from '@/lib/india-validations';
import { cn } from '@/lib/utils';
import { EntitySetupDialog } from '@/components/foundation/EntitySetupDialog';
import type { SetupResult } from '@/services/entity-setup-service';
// ── Types ────────────────────────────────────────────────────────────────────
export type EntityFormType = 'company' | 'subsidiary';

interface CompanyFormProps {
  entityType: EntityFormType;
  mode: 'create' | 'edit';
  entityId?: string;
}

// Parent companies loaded dynamically from localStorage (see parentCompanies useMemo below)

const SUBSIDIARY_RELATIONSHIPS = [
  'Wholly Owned Subsidiary', 'Majority Owned Subsidiary',
  'Minority Owned Subsidiary', 'Joint Venture',
];

const CONSOLIDATION_METHODS = [
  { value: 'full', label: 'Full Consolidation', desc: '100% of assets and liabilities' },
  { value: 'proportional', label: 'Proportional', desc: 'Based on ownership percentage' },
  { value: 'equity', label: 'Equity Method', desc: 'Investment plus share of earnings' },
];

// ── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'Identity & Core', description: 'Legal details, short code' },
  { id: 2, title: 'Address & Contact', description: 'HQ address, contact info' },
  { id: 3, title: 'Financial', description: 'FY, currency, display' },
  { id: 4, title: 'Governance', description: 'CIN, PAN, GST, TDS, Payroll' },
  { id: 5, title: 'Settings', description: 'Timezone, language, status' },
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
const STATUS_OPTIONS = ['Active', 'Inactive', 'Under Formation', 'Suspended', 'Closed'];
const COLOR_SWATCHES = ['#0D9488', '#1E3A5F', '#1E40AF', '#7C3AED', '#B91C1C',
  '#D97706', '#065F46', '#0F766E', '#334155', '#1C1917'];

// ── Initial form ─────────────────────────────────────────────────────────────
const INITIAL_FORM: Record<string, unknown> = {
  legalEntityName: '', tradingBrandName: '', shortCode: '',
  businessEntity: '', industry: '', businessActivity: '',
  parentCompanyId: '', parentCompanyName: '',
  // Subsidiary-specific
  reportingToEntityId: '',
  subsidiaryRelationship: '', ownershipPercentage: '',
  acquisitionDate: '', investmentAmount: '',
  boardSeats: '', consolidatedReporting: false, consolidationMethod: '',
  // Address
  hqAddress: '', hqCountry: 'India', hqState: '', hqDistrict: '',
  hqCity: '', hqPostalCode: '', hqTimezone: 'Asia/Kolkata', hqLat: '', hqLng: '',
  corpSameAsHq: false, corpAddress: '', corpCountry: '', corpState: '',
  corpCity: '', corpPostalCode: '',
  mainPhoneCode: '+91', mainPhone: '',
  mainMobileCode: '+91', mainMobile: '',
  corporateEmail: '', supportEmail: '', website: '',
  // Financial
  fyPreset: 'india', fyStartMonth: 'april',
  fyFrom: '', fyTo: '', booksStartDate: '',
  baseCurrency: 'INR', currencySymbol: '₹', currencyFormalName: 'Indian Rupee',
  suffixSymbol: false, addSpaceBetween: false, showInMillions: false,
  decimalPlaces: '2', wordForDecimal: 'Paise',
  // Governance
  cin: '', cinFormatted: '', incorporationDate: '',
  panNumber: '', panFormatted: '', iecCode: '',
  shopsEstablishmentNo: '', tradeLicenceNo: '', professionalTaxNo: '',
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
  jurisdiction: '',
  enableMultiCurrency: false,
  auditLogEnabled: true,
  // Settings
  timezone: 'Asia/Kolkata', language: 'en', status: 'Active',
  mrp_tax_treatment: 'inclusive',
  // Branding
  logoRight: '', logoCenter: '', logoLeft: '', favicon: '',
  primaryColor: '#0D9488', secondaryColor: '#1E1B2E', themeMode: 'light',
};

// ── Component ────────────────────────────────────────────────────────────────
export default function CompanyForm({ entityType, mode, entityId }: CompanyFormProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Record<string, unknown>>({ ...INITIAL_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showConfetti, setConfetti] = useState(false);
  const [gstRegs, setGstRegs] = useState<GSTReg[]>([]);
  const [lutBonds, setLutBonds] = useState<LUTBond[]>([]);
  const [addrTab, setAddrTab] = useState('hq');
  const [setupOpen, setSetupOpen] = useState(false);
  const [savedEntityId] = useState(() => crypto.randomUUID());
  const [fyFromDate, setFyFromDate] = useState<Date>();
  const [fyToDate, setFyToDate] = useState<Date>();
  const [booksDate, setBooksDate] = useState<Date>();
  const [acqDate, setAcqDate] = useState<Date>();

  const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k)||'[]'); } catch { return []; } };
  const lsObj = <T,>(k: string, def: T): T => {
    try { const v = localStorage.getItem(k); return v ? {...def, ...JSON.parse(v)} : def; }
    catch { return def; }
  };

  const f = (key: string) => (form[key] ?? '') as string;
  const fb = (key: string) => !!form[key];

  const upd = useCallback((field: string, val: unknown) => {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }, []);

  const label = entityType === 'company' ? 'Company' : 'Subsidiary';
  const listPath = entityType === 'company' ? '/erp/foundation/companies' : '/erp/foundation/subsidiaries';

  // Dynamic parent company picker
  const parentCompanies = useMemo(() => {
    const parentRecord = lsObj<any>('erp_parent_company', {});
    const companies: any[] = ls('erp_companies');
    const subsidiaries: any[] = ls('erp_subsidiaries');
    const options: {id: string; name: string; shortCode: string; entity_type: string}[] = [];
    if (parentRecord?.legalEntityName) {
      options.push({
        id: 'parent-root',
        name: parentRecord.legalEntityName,
        shortCode: parentRecord.shortCode || 'ROOT',
        entity_type: 'Parent Company',
      });
    }
    companies.forEach(c => {
      if (c.id) options.push({ id: c.id, name: c.legalEntityName || c.name || '', shortCode: c.shortCode || '', entity_type: 'Company' });
    });
    subsidiaries.forEach(s => {
      if (s.id) options.push({ id: s.id, name: s.legalEntityName || s.name || '', shortCode: s.shortCode || '', entity_type: 'Subsidiary' });
    });
    if (options.length === 0) {
      options.push({ id: 'parent-001', name: 'SmartOps Industries Pvt Ltd', shortCode: 'SMRT', entity_type: 'Parent Company' });
    }
    return options;
  }, []); // reads on mount

  // Load existing data in edit mode
  useEffect(() => {
    if (mode !== 'edit' || !entityId) return;
    const key = entityType === 'company' ? 'erp_companies' : 'erp_subsidiaries';
    const records: any[] = ls(key);
    const existing = records.find(r => r.id === entityId);
    if (existing) {
      setForm(prev => ({ ...prev, ...existing }));
      if (existing.gstRegs) setGstRegs(existing.gstRegs);
      if (existing.lutBonds) setLutBonds(existing.lutBonds);
    }
  }, []); // eslint-disable-line

  // Auto-suggest short code
  useEffect(() => {
    if (f('legalEntityName') && !f('shortCode')) {
      upd('shortCode', suggestShortCode(f('legalEntityName')));
    }
  }, [form.legalEntityName]); // eslint-disable-line

  // Auto-calculate FY dates
  useEffect(() => {
    if (f('fyPreset') === 'custom') return;
    const monthIdx = FY_MONTHS.indexOf(f('fyStartMonth'));
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
    if (!fb('corpSameAsHq')) return;
    upd('corpAddress', f('hqAddress'));
    upd('corpCountry', f('hqCountry'));
    upd('corpState', f('hqState'));
    upd('corpCity', f('hqCity'));
    upd('corpPostalCode', f('hqPostalCode'));
  }, [form.corpSameAsHq, form.hqAddress, form.hqCountry, form.hqState, form.hqCity, form.hqPostalCode]); // eslint-disable-line

  // Completion tracking
  const completedSteps = useCallback(() => {
    const d: number[] = [];
    if (f('legalEntityName') && f('businessEntity') && f('industry') && f('shortCode') && f('parentCompanyId')) d.push(1);
    if (f('hqAddress') && f('hqCity') && f('hqState') && f('corporateEmail')) d.push(2);
    if (f('baseCurrency') && fyFromDate && fyToDate) d.push(3);
    if (f('cin') || f('panNumber') || fb('hasGSTRegistration')) d.push(4);
    if (f('timezone')) d.push(5);
    if (f('logoLeft') || f('logoCenter') || f('primaryColor') !== '#0D9488') d.push(6);
    return d;
  }, [form, fyFromDate, fyToDate]); // eslint-disable-line

  const done = completedSteps();

  useEffect(() => {
    if (done.length === 6 && !showConfetti) setConfetti(true);
  }, [done.length]); // eslint-disable-line

  // Amount display preview
  function fmtAmountPreview() {
    const dec = parseInt(f('decimalPlaces')) || 2;
    const s = f('currencySymbol') || '₹';
    const sp = fb('addSpaceBetween') ? ' ' : '';
    const num = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: dec, maximumFractionDigits: dec,
    }).format(1000000);
    return fb('suffixSymbol') ? `${num}${sp}${s}` : `${s}${sp}${num}`;
  }

  // Logo upload
  function handleLogoUpload(field: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => upd(field, ev.target?.result as string);
    r.readAsDataURL(file);
  }

  // Date picker helper
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

  // Save
  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      const storageKey = entityType === 'company' ? 'erp_companies' : 'erp_subsidiaries';
      const existing: any[] = ls(storageKey);
      const currentId = entityId ?? crypto.randomUUID();
      const record = {
        ...form, id: currentId, entity_type: entityType,
        gstRegs, lutBonds,
        updated_at: new Date().toISOString(),
        created_at: existing.find(r => r.id === currentId)?.created_at ?? new Date().toISOString(),
      };
      const idx = existing.findIndex((r: any) => r.id === currentId);
      if (idx >= 0) existing[idx] = record; else existing.push(record);
      localStorage.setItem(storageKey, JSON.stringify(existing));
      /* [JWT] POST or PATCH /api/foundation/companies or /api/foundation/subsidiaries */

      // Auto-create forex ledgers + voucher type when multi-currency is enabled
      if ((form as any).enableMultiCurrency) {
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
            localStorage.setItem('erp_voucher_types', JSON.stringify(vtypes));
          }
        } catch { /* non-fatal — forex setup can be retried */ }
      }

      // Also keep erp_company_settings write
      const settingsKey = 'erp_company_settings';
      const settings: any[] = ls(settingsKey);
      const mrpTreatment = (form as any).mrp_tax_treatment || 'inclusive';
      const settingsEntry = {
        id: crypto.randomUUID(), entity_id: currentId,
        mrp_tax_treatment: mrpTreatment,
        mrp_tax_treatment_label: mrpTreatment === 'inclusive'
          ? 'Tax Inclusive (MRP includes GST)' : 'Tax Exclusive (MRP before GST)',
        rate_change_requires_reason: true, base_currency: 'INR',
        default_costing_method: 'weighted_avg',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      const sIdx = settings.findIndex((s: any) => s.entity_id === currentId);
      if (sIdx >= 0) settings[sIdx] = settingsEntry; else settings.push(settingsEntry);
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      /* [JWT] POST /api/company/settings */

      toast.success(`${label} saved`, { description: '[JWT] Will persist to database.' });
      setSetupOpen(true);
    }, 800);
  }

  // Breadcrumbs
  const breadcrumbs = entityType === 'company'
    ? [
        { label: 'Operix Core', href: '/erp/dashboard' },
        { label: 'Command Center', href: '/erp/command-center' },
        { label: 'Foundation' },
        { label: 'Companies', href: '/erp/foundation/companies' },
        { label: mode === 'create' ? 'Create Company' : 'Edit Company' },
      ]
    : [
        { label: 'Operix Core', href: '/erp/dashboard' },
        { label: 'Command Center', href: '/erp/command-center' },
        { label: 'Foundation' },
        { label: 'Subsidiaries', href: '/erp/foundation/subsidiaries' },
        { label: mode === 'create' ? 'Create Subsidiary' : 'Edit Subsidiary' },
      ];

  // ── Step renderers ─────────────────────────────────────────────────────────
  function renderStep1() {
    const suggested = suggestShortCode(f('legalEntityName'));
    return (
      <FormSection title="Identity & Core Details" icon={<Building className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Legal Entity Name" required error={errors.legalEntityName}>
            <Input value={f('legalEntityName')} onChange={e => upd('legalEntityName', e.target.value)} placeholder="e.g. Sharma Traders Pvt Ltd" className="text-xs" />
          </FormField>
          <FormField label="Trading / Brand Name">
            <Input value={f('tradingBrandName')} onChange={e => upd('tradingBrandName', e.target.value)} className="text-xs" />
          </FormField>
          <FormField label="Short Code" required hint="Used as prefix for transaction codes. Cannot change after first transaction.">
            <div className="space-y-1.5">
              <Input value={f('shortCode')} onChange={e => upd('shortCode', formatShortCode(e.target.value))} maxLength={6} placeholder="e.g. SHTR" className="text-xs font-mono" />
              {suggested && f('legalEntityName') && (
                <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10" onClick={() => upd('shortCode', suggested)}>
                  Suggested: {suggested}
                </Badge>
              )}
            </div>
          </FormField>
          <FormField label="Business Entity" required>
            <Select value={f('businessEntity')} onValueChange={v => upd('businessEntity', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select entity type" /></SelectTrigger>
              <SelectContent>{BUSINESS_ENTITIES.map(b => <SelectItem key={b} value={b}><span className="text-xs">{b}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Industry / Sector" required>
            <Select value={f('industry')} onValueChange={v => upd('industry', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}><span className="text-xs">{i}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Business Activity" required>
            <Select value={f('businessActivity')} onValueChange={v => upd('businessActivity', v)}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select activity" /></SelectTrigger>
              <SelectContent>{BUSINESS_ACTIVITIES.map(a => <SelectItem key={a} value={a}><span className="text-xs">{a}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Parent Company" required>
            <Select value={f('parentCompanyId')} onValueChange={v => {
              upd('parentCompanyId', v);
              const pc = parentCompanies.find(p => p.id === v);
              if (pc) upd('parentCompanyName', pc.name);
            }}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select parent company" /></SelectTrigger>
              <SelectContent>
                {parentCompanies.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="text-xs">{p.name}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">{p.entity_type}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground">Organisation ID auto-generated on creation</p>
        </div>

        {/* Subsidiary-specific fields */}
        {entityType === 'subsidiary' && (
          <>
            <Separator className="my-4" />
            <div className="rounded-xl border border-border p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">Subsidiary Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Subsidiary Relationship" required>
                  <Select value={f('subsidiaryRelationship')} onValueChange={v => upd('subsidiaryRelationship', v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select relationship" /></SelectTrigger>
                    <SelectContent>{SUBSIDIARY_RELATIONSHIPS.map(r => <SelectItem key={r} value={r}><span className="text-xs">{r}</span></SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Ownership %" required hint="Between 0 and 100" error={
                  f('ownershipPercentage') && (Number(f('ownershipPercentage')) < 0 || Number(f('ownershipPercentage')) > 100)
                    ? 'Must be between 0 and 100' : undefined
                }>
                  <div className="relative">
                    <Input
                      type="number"
                      value={f('ownershipPercentage')}
                      onChange={e => upd('ownershipPercentage', e.target.value)}
                      min={0} max={100}
                      className="text-xs pr-8"
                    />
                    {f('ownershipPercentage') && Number(f('ownershipPercentage')) >= 0 && Number(f('ownershipPercentage')) <= 100 && (
                      <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                </FormField>
                <FormField label="Acquisition Date">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left text-xs font-normal', !acqDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {f('acquisitionDate') || 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={acqDate} onSelect={d => { setAcqDate(d); if (d) upd('acquisitionDate', format(d, 'dd MMM yyyy')); }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </FormField>
                <FormField label="Investment Amount (₹)" hint="Amount in Indian Rupees">
                  <Input value={f('investmentAmount')} onChange={e => upd('investmentAmount', e.target.value)} className="text-xs" />
                </FormField>
                <FormField label="Board Seats">
                  <Input type="number" value={f('boardSeats')} onChange={e => upd('boardSeats', e.target.value)} min={0} max={50} className="text-xs" />
                </FormField>
                <FormField label="Reporting To" hint="Operational reporting line — may differ from Parent Company">
                  <Select value={f('reportingToEntityId')} onValueChange={v => upd('reportingToEntityId', v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Same as Parent Company" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same"><span className="text-xs">— Same as Parent Company —</span></SelectItem>
                      {parentCompanies.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="text-xs">{p.name}
                            <Badge variant="outline" className="ml-2 text-[10px]">{p.entity_type}</Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={fb('consolidatedReporting')} onCheckedChange={v => upd('consolidatedReporting', v)} />
                <span className="text-xs font-medium">Consolidated Reporting</span>
              </div>
              {fb('consolidatedReporting') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {CONSOLIDATION_METHODS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => upd('consolidationMethod', m.value)}
                      className={cn(
                        'text-left rounded-xl border p-4 transition-all',
                        f('consolidationMethod') === m.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                          f('consolidationMethod') === m.value ? 'border-primary' : 'border-muted-foreground/40',
                        )}>
                          {f('consolidationMethod') === m.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-xs font-semibold">{m.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <Separator className="my-4" />
        <CompanyProfilePreview data={{
          legalEntityName: f('legalEntityName'), tradingBrandName: f('tradingBrandName'),
          businessEntity: f('businessEntity'), industry: f('industry'),
          hqCity: f('hqCity'), hqCountry: f('hqCountry'),
          corporateEmail: f('corporateEmail'), website: f('website'),
          status: f('status'), logo: f('logoLeft') || f('logoCenter') || f('logoRight'),
          primaryColor: f('primaryColor'), secondaryColor: f('secondaryColor'),
          shortCode: f('shortCode'),
        }} />
      </FormSection>
    );
  }

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
                <Input value={f('hqAddress')} onChange={e => upd('hqAddress', e.target.value)} placeholder="Street address" className="text-xs" />
              </FormField>
              <FormField label="Country">
                <Select value={f('hqCountry')} onValueChange={v => upd('hqCountry', v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}><span className="text-xs">{c}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="State" required>
                <Select value={f('hqState')} onValueChange={v => upd('hqState', v)}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{INDIAN_STATE_NAMES.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="District">
                <Input value={f('hqDistrict')} onChange={e => upd('hqDistrict', e.target.value)} className="text-xs" />
              </FormField>
              <FormField label="City" required>
                <Input value={f('hqCity')} onChange={e => upd('hqCity', e.target.value)} className="text-xs" />
              </FormField>
              <FormField label="Postal Code">
                <Input value={f('hqPostalCode')} onChange={e => upd('hqPostalCode', e.target.value)} maxLength={6} className="text-xs font-mono" />
              </FormField>
              <FormField label="Timezone">
                <Select value={f('hqTimezone')} onValueChange={v => upd('hqTimezone', v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map(t => <SelectItem key={t.value} value={t.value}><span className="text-xs">{t.label}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Latitude">
                <Input value={f('hqLat')} onChange={e => upd('hqLat', e.target.value)} placeholder="Optional" className="text-xs" />
              </FormField>
              <FormField label="Longitude">
                <Input value={f('hqLng')} onChange={e => upd('hqLng', e.target.value)} placeholder="Optional" className="text-xs" />
              </FormField>
            </div>
          </TabsContent>
          <TabsContent value="corp">
            <div className="flex items-center gap-2 mb-4">
              <Switch checked={fb('corpSameAsHq')} onCheckedChange={v => upd('corpSameAsHq', v)} />
              <span className="text-xs text-muted-foreground">Same as HQ</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Address" className="md:col-span-2">
                <Input value={f('corpAddress')} onChange={e => upd('corpAddress', e.target.value)} disabled={fb('corpSameAsHq')} className="text-xs" />
              </FormField>
              <FormField label="Country">
                <Select value={f('corpCountry')} onValueChange={v => upd('corpCountry', v)} disabled={fb('corpSameAsHq')}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}><span className="text-xs">{c}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="State">
                <Select value={f('corpState')} onValueChange={v => upd('corpState', v)} disabled={fb('corpSameAsHq')}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{INDIAN_STATE_NAMES.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="City">
                <Input value={f('corpCity')} onChange={e => upd('corpCity', e.target.value)} disabled={fb('corpSameAsHq')} className="text-xs" />
              </FormField>
              <FormField label="Postal Code">
                <Input value={f('corpPostalCode')} onChange={e => upd('corpPostalCode', e.target.value)} disabled={fb('corpSameAsHq')} maxLength={6} className="text-xs font-mono" />
              </FormField>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Main Phone">
            <div className="flex gap-2">
              <Select value={f('mainPhoneCode')} onValueChange={v => upd('mainPhoneCode', v)}>
                <SelectTrigger className="w-20 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ISD_CODES.map(c => <SelectItem key={c} value={c}><span className="text-xs">{c}</span></SelectItem>)}</SelectContent>
              </Select>
              <Input value={f('mainPhone')} onChange={e => upd('mainPhone', e.target.value)} className="text-xs" />
            </div>
          </FormField>
          <FormField label="Main Mobile">
            <div className="flex gap-2">
              <Select value={f('mainMobileCode')} onValueChange={v => upd('mainMobileCode', v)}>
                <SelectTrigger className="w-20 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ISD_CODES.map(c => <SelectItem key={c} value={c}><span className="text-xs">{c}</span></SelectItem>)}</SelectContent>
              </Select>
              <Input value={f('mainMobile')} onChange={e => upd('mainMobile', e.target.value)} className="text-xs" />
            </div>
          </FormField>
          <FormField label="Corporate Email" required>
            <Input type="email" value={f('corporateEmail')} onChange={e => upd('corporateEmail', e.target.value)} className="text-xs" />
          </FormField>
          <FormField label="Support Email">
            <Input type="email" value={f('supportEmail')} onChange={e => upd('supportEmail', e.target.value)} className="text-xs" />
          </FormField>
          <FormField label="Website">
            <Input value={f('website')} onChange={e => upd('website', e.target.value)} placeholder="https://" className="text-xs" />
          </FormField>
        </div>
      </FormSection>
    );
  }

  function renderStep3() {
    return (
      <FormSection title="Financial Year & Currency" icon={<DollarSign className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="FY Preset" required>
            <Select value={f('fyPreset')} onValueChange={v => {
              upd('fyPreset', v);
              const preset = FY_PRESETS.find(p => p.value === v);
              if (preset && preset.month) upd('fyStartMonth', preset.month);
            }}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{FY_PRESETS.map(p => <SelectItem key={p.value} value={p.value}><span className="text-xs">{p.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          {f('fyPreset') === 'custom' && (
            <FormField label="FY Starting Month">
              <Select value={f('fyStartMonth')} onValueChange={v => upd('fyStartMonth', v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{FY_MONTHS.map(m => <SelectItem key={m} value={m}><span className="text-xs capitalize">{m}</span></SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          )}
          <DateField label="FY From" required date={fyFromDate} onSelect={d => { setFyFromDate(d); if (d) upd('fyFrom', format(d, 'dd MMM yyyy')); }} displayValue={f('fyFrom')} />
          <DateField label="FY To" date={fyToDate} onSelect={d => { setFyToDate(d); if (d) upd('fyTo', format(d, 'dd MMM yyyy')); }} displayValue={f('fyTo')} />
          <DateField label="Books Start Date" date={booksDate} onSelect={d => { setBooksDate(d); if (d) upd('booksStartDate', format(d, 'dd MMM yyyy')); }} displayValue={f('booksStartDate')} />
        </div>

        <Separator className="my-4" />
        <p className="text-xs font-semibold text-foreground mb-3">Currency Settings</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Base Currency" required>
            <Select value={f('baseCurrency')} onValueChange={v => {
              upd('baseCurrency', v);
              const c = CURRENCIES.find(c => c.code === v);
              if (c) { upd('currencySymbol', c.symbol); upd('currencyFormalName', c.name); }
            }}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}><span className="text-xs">{c.code} — {c.name}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Currency Symbol">
            <Input value={f('currencySymbol')} onChange={e => upd('currencySymbol', e.target.value)} className="text-xs" />
          </FormField>
          <FormField label="Currency Formal Name">
            <Input value={f('currencyFormalName')} onChange={e => upd('currencyFormalName', e.target.value)} className="text-xs" />
          </FormField>
        </div>

        <Separator className="my-4" />
        <p className="text-xs font-semibold text-foreground mb-3">Amount Display Options</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Suffix Symbol to Amount</span>
            <Switch checked={fb('suffixSymbol')} onCheckedChange={v => upd('suffixSymbol', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Add Space Between</span>
            <Switch checked={fb('addSpaceBetween')} onCheckedChange={v => upd('addSpaceBetween', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Show in Millions</span>
            <Switch checked={fb('showInMillions')} onCheckedChange={v => upd('showInMillions', v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Decimal Places">
              <Select value={f('decimalPlaces')} onValueChange={v => upd('decimalPlaces', v)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{['0', '1', '2', '3'].map(d => <SelectItem key={d} value={d}><span className="text-xs">{d}</span></SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Word for Decimal">
              <Input value={f('wordForDecimal')} onChange={e => upd('wordForDecimal', e.target.value)} className="text-xs" />
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

  function renderStep4() {
    return (
      <GovernanceForm
        formData={form}
        upd={upd}
        gstRegs={gstRegs}
        setGstRegs={setGstRegs}
        lutBonds={lutBonds}
        setLutBonds={setLutBonds}
      />
    );
  }

  function renderStep5() {
    return (
      <>
      <FormSection title="Settings" icon={<Settings2 className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Timezone">
            <Select value={f('timezone')} onValueChange={v => upd('timezone', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMEZONES.map(t => <SelectItem key={t.value} value={t.value}><span className="text-xs">{t.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Default Language">
            <Select value={f('language')} onValueChange={v => upd('language', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en"><span className="text-xs">English</span></SelectItem>
                <SelectItem value="hi"><span className="text-xs">Hindi (Coming Soon)</span></SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={f('status')} onValueChange={v => upd('status', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}><span className="text-xs">{s}</span></SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Inventory & Pricing Settings" icon={<DollarSign className="h-4 w-4" />}>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">
            MRP Tax Treatment *
            <span className="text-xs text-muted-foreground ml-2">
              How is MRP displayed on labels and invoices?
            </span>
          </p>
          <Select value={f('mrp_tax_treatment')} onValueChange={v => upd('mrp_tax_treatment', v)}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Select MRP treatment..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inclusive">
                <span className="text-xs">Tax Inclusive — MRP includes GST (FMCG, Pharma, Consumer Goods)</span>
              </SelectItem>
              <SelectItem value="exclusive">
                <span className="text-xs">Tax Exclusive — MRP is before GST (B2B, Industrial, Services)</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            As per Legal Metrology Act 2009, consumer goods must display MRP inclusive of all taxes.
            This setting affects label printing (A.5) and invoice display.
          </p>
        </div>
      </FormSection>
      </>
    );
  }

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
          {logoFields.map(lf => (
            <div key={lf.key}>
              <p className="text-xs font-medium text-foreground mb-2">{lf.label}</p>
              <div className="relative border-2 border-dashed border-border rounded-lg h-28 flex items-center justify-center hover:border-primary/30 transition-colors">
                {f(lf.key) ? (
                  <>
                    <img src={f(lf.key)} alt={lf.label} className="h-full w-full object-contain p-2 rounded-lg" />
                    <button onClick={() => upd(lf.key, '')} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Drop or click</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(lf.key, e)} />
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
                <button key={c} onClick={() => upd('primaryColor', c)} className={cn('h-8 w-8 rounded-lg border-2 transition-all', f('primaryColor') === c ? 'border-primary scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">{f('primaryColor')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Secondary Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLOR_SWATCHES.map(c => (
                <button key={c} onClick={() => upd('secondaryColor', c)} className={cn('h-8 w-8 rounded-lg border-2 transition-all', f('secondaryColor') === c ? 'border-primary scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">{f('secondaryColor')}</p>
          </div>
        </div>

        <div className="mt-4">
          <FormField label="Theme Mode">
            <Select value={f('themeMode')} onValueChange={v => upd('themeMode', v)}>
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
          legalEntityName: f('legalEntityName'), tradingBrandName: f('tradingBrandName'),
          businessEntity: f('businessEntity'), industry: f('industry'),
          hqCity: f('hqCity'), hqCountry: f('hqCountry'),
          corporateEmail: f('corporateEmail'), website: f('website'),
          status: f('status'), logo: f('logoLeft') || f('logoCenter') || f('logoRight'),
          primaryColor: f('primaryColor'), secondaryColor: f('secondaryColor'),
          shortCode: f('shortCode'),
        }} />
      </FormSection>
    );
  }

  function renderStep7() {
    if (mode === 'create') {
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
    // [JWT] Replace with real audit log API
    const mockAudit = [
      { ts: '06 Apr 2026 10:30 AM', user: 'Arjun Mehta', action: `Created ${label}`, field: '-' },
      { ts: '06 Apr 2026 11:15 AM', user: 'Arjun Mehta', action: 'Updated Status', field: 'status: Under Formation → Active' },
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

  return (
    <>
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <Confetti active={showConfetti} onComplete={() => setConfetti(false)} />
        <ERPHeader
          breadcrumbs={breadcrumbs}
          showDatePicker={false}
          showCompany={false}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">
              {mode === 'create' ? `Create ${label}` : `Edit ${label}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {entityType === 'company'
                ? 'Register a new legal entity under your parent company.'
                : 'Register a subsidiary entity linked for consolidated reporting.'}
            </p>
          </div>

          <div className="flex gap-6">
            <div className="hidden lg:block w-64 shrink-0">
              <ProgressStepper
                steps={STEPS}
                currentStep={step}
                onStepClick={setStep}
                completedSteps={done}
              />
            </div>

            <div className="flex-1 min-w-0">
              {renderStep()}

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
                  <Button onClick={() => setStep(s => Math.min(7, s + 1))}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(done.length === 6 && 'ring-2 ring-primary/40 animate-pulse')}
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {saving ? 'Saving...' : `Save ${label}`}
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
      entityName={f('legalEntityName')}
      entityId={savedEntityId}
      shortCode={f('shortCode')}
      entityType={entityType === 'company' ? 'subsidiary' : 'subsidiary'}
      businessEntity={f('businessEntity')}
      industry={f('industry')}
      businessActivity={f('businessActivity')}
      onComplete={(result) => {
        toast.success(`${f('legalEntityName')} is ready. ${result.ledgersCreated} ledgers created.`);
        navigate(listPath);
      }}
    />
    </>
  );
}
