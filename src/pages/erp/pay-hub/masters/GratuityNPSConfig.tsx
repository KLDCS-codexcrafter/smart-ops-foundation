/**
 * GratuityNPSConfig.tsx — M-12 Gratuity & NPS Config Panel
 * Config panel (not a list master). Always-visible form. Save button.
 */
import { useState, useCallback } from 'react';
import { Heart, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useGratuityNPS } from '@/hooks/usePayHubMasters3';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { GratuityNPSSettings } from '@/types/payroll-masters';

export function GratuityNPSPanel() {
  const { settings, save } = useGratuityNPS();
  const [form, setForm] = useState<GratuityNPSSettings>(JSON.parse(JSON.stringify(settings)));

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    save({
      gratuity: { ...form.gratuity, updated_at: now },
      nps: { ...form.nps, updated_at: now },
    });
  }, [form, save]);

  const isFormActive = true; // single-view config — always active
  useCtrlS(isFormActive ? handleSave : () => {});

  const setG = <K extends keyof GratuityNPSSettings['gratuity']>(k: K, v: GratuityNPSSettings['gratuity'][K]) =>
    setForm(p => ({ ...p, gratuity: { ...p.gratuity, [k]: v } }));
  const setN = <K extends keyof GratuityNPSSettings['nps']>(k: K, v: GratuityNPSSettings['nps'][K]) =>
    setForm(p => ({ ...p, nps: { ...p.nps, [k]: v } }));

  return (
    <div className="space-y-6" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Gratuity & NPS Configuration</h2>
          <p className="text-sm text-muted-foreground">Company-wide gratuity and NPS settings</p>
        </div>
        <Button onClick={handleSave} size="sm" className="gap-1" data-primary><Save className="h-4 w-4"/>Save Settings</Button>
      </div>

      {/* Gratuity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gratuity Settings</CardTitle>
          <CardDescription className="text-xs">Payment of Gratuity Act, 1972 compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs">Eligibility (years)</Label><Input type="number" className="text-xs mt-1" value={form.gratuity.eligibilityYears} onChange={e=>setG('eligibilityYears',+e.target.value)} onKeyDown={onEnterNext}/></div>
            <div>
              <Label className="text-xs">Applicable Act</Label>
              <Select value={form.gratuity.applicableAct} onValueChange={v=>setG('applicableAct',v as GratuityNPSSettings['gratuity']['applicableAct'])}>
                <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment_of_gratuity_act_1972">Payment of Gratuity Act, 1972</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs">Calculation Formula</Label><Input className="text-xs mt-1" value={form.gratuity.calculationFormula} onChange={e=>setG('calculationFormula',e.target.value)} onKeyDown={onEnterNext}/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs">Max Gratuity Amount (₹)</Label><Input type="number" className="text-xs mt-1" value={form.gratuity.maxGratuityAmount} onChange={e=>setG('maxGratuityAmount',+e.target.value)} onKeyDown={onEnterNext}/></div>
            <div><Label className="text-xs">Tax Exempt Limit (₹)</Label><Input type="number" className="text-xs mt-1" value={form.gratuity.taxExemptLimit} onChange={e=>setG('taxExemptLimit',+e.target.value)} onKeyDown={onEnterNext}/></div>
          </div>
        </CardContent>
      </Card>

      <Separator/>

      {/* NPS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">NPS (National Pension System)</CardTitle>
          <CardDescription className="text-xs">Employer and employee NPS contribution settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs">Employee Contribution (%)</Label><Input type="number" step="0.5" className="text-xs mt-1" value={form.nps.employeeContributionPct} onChange={e=>setN('employeeContributionPct',+e.target.value)} onKeyDown={onEnterNext}/></div>
            <div><Label className="text-xs">Employer Contribution (%)</Label><Input type="number" step="0.5" className="text-xs mt-1" value={form.nps.employerContributionPct} onChange={e=>setN('employerContributionPct',+e.target.value)} onKeyDown={onEnterNext}/></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Tier Type</Label>
              <Select value={form.nps.tierType} onValueChange={v=>setN('tierType',v as 'tier1'|'tier2')}>
                <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="tier1">Tier I</SelectItem><SelectItem value="tier2">Tier II</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Investment Choice</Label>
              <Select value={form.nps.investmentChoice} onValueChange={v=>setN('investmentChoice',v as 'active'|'auto')}>
                <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="auto">Auto</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs">Fund Manager</Label><Input className="text-xs mt-1" value={form.nps.fundManager} onChange={e=>setN('fundManager',e.target.value)} onKeyDown={onEnterNext}/></div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GratuityNPSConfig() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex-1">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Gratuity & NPS'}]} showDatePicker={false} showCompany={false}/>
        <div className="p-6 max-w-7xl mx-auto"><GratuityNPSPanel/></div>
      </div>
    </SidebarProvider>
  );
}
