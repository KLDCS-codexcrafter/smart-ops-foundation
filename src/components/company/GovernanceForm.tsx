/**
 * GovernanceForm.tsx — Reusable 4-tab governance form.
 * Extracted from ParentCompany.tsx renderStep4().
 * [JWT] Replace mock data with real API queries.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import {
  Shield, Plus, Trash2, CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormSection } from '@/components/company/FormSection';
import { FormField } from '@/components/company/FormField';
import {
  formatPAN, formatGSTIN, formatCIN, formatTAN,
  validatePAN, validateGSTIN, validateCIN, validateTAN,
  INDIAN_STATE_NAMES,
} from '@/lib/india-validations';
import { cn } from '@/lib/utils';
import { onEnterNext } from '@/lib/keyboard';

// ── Interfaces ───────────────────────────────────────────────────────────────
export interface GSTReg {
  id: string; state: string; addressType: string; registrationType: string;
  gstin: string; gstinFormatted: string; gstinVerified: boolean;
  gstr1Periodicity: string; placeOfSupply: string; assesseeOfOtherTerritory: boolean;
}
export interface LUTBond { id: string; applicableFrom: string; applicableTo: string; lutBondNo: string; }

// ── Constants ────────────────────────────────────────────────────────────────
const ENTERPRISE_TYPES = ['Micro', 'Small', 'Medium'];
const MSME_ACTIVITIES = ['Manufacturing', 'Services', 'Trading'];
const GST_ADDRESS_TYPES = ['Registered Office', 'Corporate Office', 'Branch Office', 'Warehouse', 'Factory'];
const GST_REG_TYPES = ['Regular', 'Composition', 'Casual Taxable Person', 'SEZ Unit/Developer', 'Non-Resident'];
const GSTR1_PERIODICITIES = ['Monthly', 'Quarterly'];
const PLACE_OF_SUPPLY = ['Default - Based on Supply Type', 'State of Supplier', 'State of Recipient'];
const DEDUCTOR_TYPES = ['Company', 'Government', 'Individual', 'Partnership', 'LLP', 'Trust', 'HUF', 'AOP/BOI', 'Local Authority'];
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

// ── Date picker helper ───────────────────────────────────────────────────────
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

// ── Props ────────────────────────────────────────────────────────────────────
interface GovernanceFormProps {
  formData: Record<string, unknown>;
  upd: (field: string, val: unknown) => void;
  gstRegs: GSTReg[];
  setGstRegs: React.Dispatch<React.SetStateAction<GSTReg[]>>;
  lutBonds: LUTBond[];
  setLutBonds: React.Dispatch<React.SetStateAction<LUTBond[]>>;
}

export function GovernanceForm({ formData, upd, gstRegs, setGstRegs, lutBonds, setLutBonds }: GovernanceFormProps) {
  const [govTab, setGovTab] = useState('companyInfo');
  const [incorporationDt, setIncorpDt] = useState<Date>();

  const f = (key: string) => (formData[key] ?? '') as string;
  const fb = (key: string) => !!formData[key];

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

  return (
    <FormSection data-keyboard-form title="Governance & Compliance" icon={<Shield className="h-4 w-4" />}>
      <Tabs value={govTab} onValueChange={setGovTab}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="companyInfo" className="text-xs">Company Info</TabsTrigger>
          <TabsTrigger value="gst" className="text-xs">GST</TabsTrigger>
          <TabsTrigger value="incomeTax" className="text-xs">Income Tax</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs">Payroll</TabsTrigger>
        </TabsList>

        {/* Company Info tab */}
        <TabsContent value="companyInfo"><div data-keyboard-form>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Switch
                checked={!!formData['hasCIN']}
                onCheckedChange={v => {
                  upd('hasCIN', v);
                  if (!v) { upd('cin', ''); upd('cinFormatted', ''); }
                }}
              />
              <span className="text-xs font-medium">Company Registration (CIN)</span>
            </div>
            {!!formData['hasCIN'] && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="CIN" error={validateCIN(f('cin')).valid ? undefined : validateCIN(f('cin')).message}>
                  <Input value={f('cin')} onChange={e => upd('cin', formatCIN(e.target.value))} placeholder="U74999DL2020PTC123456" className="text-xs font-mono" />
                </FormField>
                <DateField label="Incorporation Date" date={incorporationDt} onSelect={d => { setIncorpDt(d); if (d) upd('incorporationDate', format(d, 'dd MMM yyyy')); }} displayValue={f('incorporationDate')} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="PAN" error={validatePAN(f('panNumber')).valid ? undefined : validatePAN(f('panNumber')).message}>
                <Input value={f('panNumber')} onChange={e => upd('panNumber', formatPAN(e.target.value))} placeholder="AAAAA0000A" className="text-xs font-mono" />
              </FormField>
              <FormField label="IEC Code">
                <Input value={f('iecCode')} onChange={e => upd('iecCode', e.target.value)} className="text-xs font-mono" />
              </FormField>
            </div>

            <Separator />
            <div className="flex items-center gap-2 mb-2">
              <Switch checked={fb('msmeApplicable')} onCheckedChange={v => upd('msmeApplicable', v)} />
              <span className="text-xs font-medium">MSME Applicable</span>
            </div>
            {fb('msmeApplicable') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Applicable From">
                  <Input value={f('msmeApplicableFrom')} onChange={e => upd('msmeApplicableFrom', e.target.value)} className="text-xs" />
                </FormField>
                <FormField label="Enterprise Type">
                  <Select value={f('msmeEnterpriseType')} onValueChange={v => upd('msmeEnterpriseType', v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{ENTERPRISE_TYPES.map(t => <SelectItem key={t} value={t}><span className="text-xs">{t}</span></SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Udyam Registration No">
                  <Input value={f('msmeUdyamRegNo')} onChange={e => upd('msmeUdyamRegNo', e.target.value)} className="text-xs font-mono" />
                </FormField>
                <FormField label="Activity Type">
                  <Select value={f('msmeActivityType')} onValueChange={v => upd('msmeActivityType', v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{MSME_ACTIVITIES.map(a => <SelectItem key={a} value={a}><span className="text-xs">{a}</span></SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Credit Period (days)">
                  <Input value={f('msmeCreditPeriodDays')} onChange={e => upd('msmeCreditPeriodDays', e.target.value)} className="text-xs" />
                </FormField>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={fb('msmeNoCreditPeriod')} onCheckedChange={v => upd('msmeNoCreditPeriod', v)} />
                  <span className="text-xs text-muted-foreground">No Credit Period</span>
                </div>
              </div>
            )}

            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Shops & Establishment No">
                <Input value={f('shopsEstablishmentNo')} onChange={e => upd('shopsEstablishmentNo', e.target.value)} className="text-xs font-mono" />
              </FormField>
              <FormField label="Trade Licence No">
                <Input value={f('tradeLicenceNo')} onChange={e => upd('tradeLicenceNo', e.target.value)} className="text-xs font-mono" />
              </FormField>
              <FormField label="Professional Tax No">
                <Input value={f('professionalTaxNo')} onChange={e => upd('professionalTaxNo', e.target.value)} className="text-xs font-mono" />
              </FormField>
            </div>

            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Compliance Region">
                <Select value={f('complianceRegion')} onValueChange={v => upd('complianceRegion', v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPLIANCE_REGIONS.map(r => <SelectItem key={r.value} value={r.value}><span className="text-xs">{r.label}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Accounting Terminology">
                <Select value={f('accountingTerminology')} onValueChange={v => upd('accountingTerminology', v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNTING_TERMINOLOGIES.map(a => <SelectItem key={a.value} value={a.value}><span className="text-xs">{a.label}</span></SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={fb('auditLogEnabled')} onCheckedChange={v => upd('auditLogEnabled', v)} />
              <span className="text-xs text-muted-foreground">Audit Log Enabled</span>
            </div>

            <Separator />
            <FormField label="Jurisdiction" hint="Legal jurisdiction clause for invoices and vouchers. Set once here — auto-copied everywhere it is needed.">
              <Input
                value={f('jurisdiction') ?? ''}
                onChange={e => upd('jurisdiction', e.target.value)}
                className="text-xs"
                placeholder="e.g. Subject to Mumbai, Maharashtra jurisdiction"
              />
            </FormField>

            <Separator />
            <div className="flex items-start gap-3">
              <Switch
                checked={!!formData['enableMultiCurrency']}
                onCheckedChange={v => {
                  upd('enableMultiCurrency', v);
                }}
                className="mt-0.5"
              />
              <div>
                <span className="text-xs font-medium">Enable multi-currency transactions</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allows recording transactions in foreign currencies.
                  On save, auto-creates Forex Gain A/c (under Other Income),
                  Forex Loss A/c (under Finance Costs), and a Forex Adjustment journal voucher type.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* GST tab */}
        <TabsContent value="gst">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch checked={fb('hasGSTRegistration')} onCheckedChange={v => upd('hasGSTRegistration', v)} />
              <span className="text-xs font-medium">GST Registered</span>
            </div>
            {fb('hasGSTRegistration') && (
              <>
                {gstRegs.map(reg => (
                  <div key={reg.id} className="border border-border rounded-lg p-4 space-y-3 relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeGST(reg.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
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
                          <SelectContent>{GST_ADDRESS_TYPES.map(a => <SelectItem key={a} value={a}><span className="text-xs">{a}</span></SelectItem>)}</SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Registration Type">
                        <Select value={reg.registrationType} onValueChange={v => updateGST(reg.id, 'registrationType', v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{GST_REG_TYPES.map(r => <SelectItem key={r} value={r}><span className="text-xs">{r}</span></SelectItem>)}</SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="GSTIN" error={reg.gstin ? (validateGSTIN(reg.gstin).valid ? undefined : validateGSTIN(reg.gstin).message) : undefined}>
                        <Input value={reg.gstin} onChange={e => updateGST(reg.id, 'gstin', formatGSTIN(e.target.value))} placeholder="22AAAAA0000A1Z5" className="text-xs font-mono" />
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
              <Switch checked={fb('eInvoiceApplicable')} onCheckedChange={v => upd('eInvoiceApplicable', v)} />
              <span className="text-xs text-muted-foreground">e-Invoice Applicable</span>
            </div>
            {fb('eInvoiceApplicable') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Applicable From">
                  <Input value={f('eInvoiceFrom')} onChange={e => upd('eInvoiceFrom', e.target.value)} className="text-xs" />
                </FormField>
              </div>
            )}

            <Separator />
            <p className="text-xs font-semibold mb-2">e-Way Bill</p>
            <div className="flex items-center gap-2 mb-2">
              <Switch checked={fb('eWayBillApplicable')} onCheckedChange={v => upd('eWayBillApplicable', v)} />
              <span className="text-xs text-muted-foreground">e-Way Bill Applicable</span>
            </div>
            {fb('eWayBillApplicable') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Applicable From">
                  <Input value={f('eWayBillFrom')} onChange={e => upd('eWayBillFrom', e.target.value)} className="text-xs" />
                </FormField>
                <FormField label="Applicable For">
                  <Select value={f('eWayBillFor')} onValueChange={v => upd('eWayBillFor', v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interstate"><span className="text-xs">Interstate</span></SelectItem>
                      <SelectItem value="intrastate"><span className="text-xs">Intrastate</span></SelectItem>
                      <SelectItem value="both"><span className="text-xs">Both</span></SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Threshold Limit">
                  <Input value={f('eWayThreshold')} onChange={e => upd('eWayThreshold', e.target.value)} className="text-xs" />
                </FormField>
                <FormField label="Threshold Includes">
                  <Select value={f('eWayThresholdIncludes')} onValueChange={v => upd('eWayThresholdIncludes', v)}>
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
              <Switch checked={fb('hasLUTBond')} onCheckedChange={v => upd('hasLUTBond', v)} />
              <span className="text-xs font-medium">LUT / Bond</span>
            </div>
            {fb('hasLUTBond') && (
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
              <Switch checked={fb('hasTDS')} onCheckedChange={v => upd('hasTDS', v)} />
              <span className="text-xs font-medium">TDS Applicable</span>
            </div>
            {fb('hasTDS') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="TAN" error={validateTAN(f('tdsTanNo')).valid ? undefined : validateTAN(f('tdsTanNo')).message}>
                    <Input value={f('tdsTanNo')} onChange={e => upd('tdsTanNo', formatTAN(e.target.value))} placeholder="ABCD12345E" className="text-xs font-mono" />
                  </FormField>
                  <FormField label="Deductor Type">
                    <Select value={f('tdsDeductorType')} onValueChange={v => upd('tdsDeductorType', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{DEDUCTOR_TYPES.map(d => <SelectItem key={d} value={d}><span className="text-xs">{d}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Branch / Division">
                    <Input value={f('tdsDeductorBranch')} onChange={e => upd('tdsDeductorBranch', e.target.value)} className="text-xs" />
                  </FormField>
                </div>
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold">Person Responsible</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField label="Name">
                      <Input value={f('tdsPersonName')} onChange={e => upd('tdsPersonName', e.target.value)} className="text-xs" />
                    </FormField>
                    <FormField label="Designation">
                      <Input value={f('tdsPersonDesignation')} onChange={e => upd('tdsPersonDesignation', e.target.value)} className="text-xs" />
                    </FormField>
                    <FormField label="PAN">
                      <Input value={f('tdsPersonPan')} onChange={e => upd('tdsPersonPan', formatPAN(e.target.value))} className="text-xs font-mono" />
                    </FormField>
                    <FormField label="Mobile">
                      <Input value={f('tdsPersonMobile')} onChange={e => upd('tdsPersonMobile', e.target.value)} className="text-xs" />
                    </FormField>
                    <FormField label="Email">
                      <Input value={f('tdsPersonEmail')} onChange={e => upd('tdsPersonEmail', e.target.value)} className="text-xs" />
                    </FormField>
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-center gap-2">
              <Switch checked={fb('hasTCS')} onCheckedChange={v => upd('hasTCS', v)} />
              <span className="text-xs font-medium">TCS Applicable</span>
            </div>
            {fb('hasTCS') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="TCS TAN" error={validateTAN(f('tcsTanNo')).valid ? undefined : validateTAN(f('tcsTanNo')).message}>
                  <Input value={f('tcsTanNo')} onChange={e => upd('tcsTanNo', formatTAN(e.target.value))} className="text-xs font-mono" />
                </FormField>
                <FormField label="Collector Type">
                  <Select value={f('tcsCollectorType')} onValueChange={v => upd('tcsCollectorType', v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{DEDUCTOR_TYPES.map(d => <SelectItem key={d} value={d}><span className="text-xs">{d}</span></SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Collector Branch">
                  <Input value={f('tcsCollectorBranch')} onChange={e => upd('tcsCollectorBranch', e.target.value)} className="text-xs" />
                </FormField>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Payroll tab */}
        <TabsContent value="payroll">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch checked={fb('hasPayrollStatutory')} onCheckedChange={v => upd('hasPayrollStatutory', v)} />
              <span className="text-xs font-medium">Payroll Statutory Applicable</span>
            </div>
            {fb('hasPayrollStatutory') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold">PF (Provident Fund)</p>
                  <FormField label="Company Code"><Input value={f('pfCompanyCode')} onChange={e => upd('pfCompanyCode', e.target.value)} className="text-xs" /></FormField>
                  <FormField label="Account Code"><Input value={f('pfAccountCode')} onChange={e => upd('pfAccountCode', e.target.value)} className="text-xs" /></FormField>
                  <FormField label="Security Code"><Input value={f('pfSecurityCode')} onChange={e => upd('pfSecurityCode', e.target.value)} className="text-xs" /></FormField>
                </div>
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold">ESI</p>
                  <FormField label="Company Code"><Input value={f('esiCompanyCode')} onChange={e => upd('esiCompanyCode', e.target.value)} className="text-xs" /></FormField>
                  <FormField label="Branch Office"><Input value={f('esiBranchOffice')} onChange={e => upd('esiBranchOffice', e.target.value)} className="text-xs" /></FormField>
                  <FormField label="Working Days/Month"><Input value={f('esiWorkingDays')} onChange={e => upd('esiWorkingDays', e.target.value)} className="text-xs" /></FormField>
                </div>
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold">NPS</p>
                  <FormField label="Corporate Reg No"><Input value={f('npsCorporateRegNo')} onChange={e => upd('npsCorporateRegNo', e.target.value)} className="text-xs" /></FormField>
                  <FormField label="Branch Office No"><Input value={f('npsBranchOfficeNo')} onChange={e => upd('npsBranchOfficeNo', e.target.value)} className="text-xs" /></FormField>
                </div>
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold">LWF</p>
                  <FormField label="Registration No"><Input value={f('lwfRegNo')} onChange={e => upd('lwfRegNo', e.target.value)} className="text-xs" /></FormField>
                  <FormField label="State">
                    <Select value={f('lwfState')} onValueChange={v => upd('lwfState', v)}>
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
