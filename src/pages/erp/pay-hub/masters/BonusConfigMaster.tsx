/**
 * BonusConfigMaster.tsx — M-11 Bonus Configuration
 * Sheet-based. Bonus type drives conditional fields (statutory shows wage ceiling).
 */
import { useState, useCallback } from 'react';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useBonusConfigs } from '@/hooks/usePayHubMasters3';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { BonusConfig } from '@/types/payroll-masters';

const BONUS_TYPE_LABELS: Record<BonusConfig['bonusType'],string> = {
  statutory:'Statutory',ex_gratia:'Ex-Gratia',performance:'Performance',festival:'Festival',annual:'Annual',
};

type BCForm = Omit<BonusConfig, 'id'|'created_at'|'updated_at'>;
const BLANK: BCForm = {
  code:'',name:'',bonusType:'statutory',calculationType:'percentage_basic',value:8.33,
  minPercent:8.33,maxPercent:20,eligibilityDays:30,eligibilityWageCeiling:21000,
  taxable:true,effectiveFrom:'',status:'active',
};

export function BonusConfigMasterPanel() {
  const { bonusConfigs, create, update, toggleStatus } = useBonusConfigs();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState<BCForm>({...BLANK});

  const filtered = bonusConfigs.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditId(null); setForm({...BLANK}); setSheetOpen(true); };
  const openEdit = (b: BonusConfig) => {
    setEditId(b.id);
    const { id, created_at, updated_at, ...rest } = b;
    setForm(rest);
    setSheetOpen(true);
  };

  const handleSave = useCallback(() => {
    if (!sheetOpen) return;
    if (!form.name.trim()) return;
    if (editId) update(editId, form); else create(form);
    setSheetOpen(false);
  }, [form, editId, sheetOpen, create, update]);

  useCtrlS(handleSave);
  const setF = <K extends keyof BCForm>(k: K, v: BCForm[K]) => setForm(p => ({...p,[k]:v}));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Bonus Configuration</h2>
          <p className="text-sm text-muted-foreground">Statutory, performance and festival bonus rules</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4"/>New Bonus Config</Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-8 text-xs" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <Table>
        <TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead>
          <TableHead>Calc</TableHead><TableHead>Value</TableHead><TableHead>Taxable</TableHead>
          <TableHead>Status</TableHead><TableHead/>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map(b=>(
            <TableRow key={b.id}>
              <TableCell className="font-mono text-xs text-violet-600 dark:text-violet-400">{b.code}</TableCell>
              <TableCell className="text-xs font-medium">{b.name}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{BONUS_TYPE_LABELS[b.bonusType]}</Badge></TableCell>
              <TableCell className="text-xs capitalize">{b.calculationType.replace(/_/g,' ')}</TableCell>
              <TableCell className="text-xs">{b.calculationType==='fixed'?`₹${b.value.toLocaleString()}`:`${b.value}%`}</TableCell>
              <TableCell className="text-xs">{b.taxable?'Yes':'No'}</TableCell>
              <TableCell><Badge variant={b.status==='active'?'default':'secondary'} className="text-[10px]">{b.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(b)}><Edit2 className="h-3.5 w-3.5"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>toggleStatus(b.id)}>
                    {b.status==='active'?<ToggleRight className="h-3.5 w-3.5 text-green-600"/>:<ToggleLeft className="h-3.5 w-3.5 text-muted-foreground"/>}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto" data-keyboard-form>
          <SheetHeader>
            <SheetTitle>{editId?'Edit Bonus Config':'New Bonus Config'}</SheetTitle>
            <SheetDescription>Configure bonus type, calculation and eligibility</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Code *</Label><Input className="text-xs mt-1" maxLength={8} value={form.code} onChange={e=>setF('code',e.target.value.toUpperCase())} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Name *</Label><Input className="text-xs mt-1" value={form.name} onChange={e=>setF('name',e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>
            <div>
              <Label className="text-xs">Bonus Type</Label>
              <Select value={form.bonusType} onValueChange={v=>setF('bonusType',v as BonusConfig['bonusType'])}>
                <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="statutory">Statutory</SelectItem>
                  <SelectItem value="ex_gratia">Ex-Gratia</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="festival">Festival</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Calculation Type</Label>
              <Select value={form.calculationType} onValueChange={v=>setF('calculationType',v as BonusConfig['calculationType'])}>
                <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage_basic">% of Basic</SelectItem>
                  <SelectItem value="percentage_gross">% of Gross</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">{form.calculationType==='fixed'?'Amount (₹)':'Value (%)'}</Label><Input type="number" step="0.01" className="text-xs mt-1" value={form.value} onChange={e=>setF('value',+e.target.value)} onKeyDown={onEnterNext}/></div>

{form.bonusType === 'statutory' && (
              <>
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 leading-relaxed">
                  <p className="font-semibold mb-1">Payment of Bonus Act, 1965</p>
                  <p>Applicable to establishments with 20 or more employees. Statutory bonus rate: minimum 8.33%, maximum 20% of annual wages. Eligible wage ceiling: ₹21,000/month. Minimum 30 working days in the accounting year required for eligibility.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Min %</Label><Input type="number" step="0.01" className="text-xs mt-1" value={form.minPercent} onChange={e=>setF('minPercent',+e.target.value)} onKeyDown={onEnterNext}/></div>
                  <div><Label className="text-xs">Max %</Label><Input type="number" step="0.01" className="text-xs mt-1" value={form.maxPercent} onChange={e=>setF('maxPercent',+e.target.value)} onKeyDown={onEnterNext}/></div>
                </div>
                <div><Label className="text-xs">Wage Ceiling (₹/month)</Label><Input type="number" className="text-xs mt-1" value={form.eligibilityWageCeiling} onChange={e=>setF('eligibilityWageCeiling',+e.target.value)} onKeyDown={onEnterNext}/></div>
              </>
            )}

            <div><Label className="text-xs">Eligibility (min working days/year)</Label><Input type="number" className="text-xs mt-1" value={form.eligibilityDays} onChange={e=>setF('eligibilityDays',+e.target.value)} onKeyDown={onEnterNext}/></div>
            <div><Label className="text-xs">Effective From</Label><Input type="date" className="text-xs mt-1" value={form.effectiveFrom} onChange={e=>setF('effectiveFrom',e.target.value)} onKeyDown={onEnterNext}/></div>
            <div className="flex items-center gap-3"><Switch checked={form.taxable} onCheckedChange={v=>setF('taxable',v)}/><Label className="text-xs">Taxable</Label></div>
          </div>
          <SheetFooter>
            <Button onClick={handleSave} data-primary>{editId?'Update':'Create'} Bonus Config</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function BonusConfigMaster() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex-1">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Bonus Config'}]} showDatePicker={false} showCompany={false}/>
        <div className="p-6 max-w-7xl mx-auto"><BonusConfigMasterPanel/></div>
      </div>
    </SidebarProvider>
  );
}
