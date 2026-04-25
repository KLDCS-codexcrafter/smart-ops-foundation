/**
 * LoanTypesMaster.tsx — M-10 Loan Types
 * Simple Sheet-based master. No sub-tables.
 */
import { useState, useCallback } from 'react';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useLoanTypes } from '@/hooks/usePayHubMasters3';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { LoanType } from '@/types/payroll-masters';

type LTForm = Omit<LoanType, 'id'|'created_at'|'updated_at'>;
const BLANK: LTForm = {
  code:'',name:'',interestRatePct:0,interestType:'nil',
  maxAmountMultiplier:6,maxTenureMonths:24,eligibleAfterDays:180,status:'active',
};

export function LoanTypesMasterPanel() {
  const { loanTypes, create, update, toggleStatus } = useLoanTypes();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState<LTForm>({...BLANK});

  const filtered = loanTypes.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) || l.code.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditId(null); setForm({...BLANK}); setSheetOpen(true); };
  const openEdit = (l: LoanType) => {
    setEditId(l.id);
    const { id, created_at, updated_at, ...rest } = l;
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
  const setF = <K extends keyof LTForm>(k: K, v: LTForm[K]) => setForm(p => ({...p,[k]:v}));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Loan Types</h2>
          <p className="text-sm text-muted-foreground">Configure employee loan categories, interest and tenure</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4"/>New Loan Type</Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-8 text-xs" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <Table>
        <TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Interest</TableHead>
          <TableHead>Type</TableHead><TableHead>Max Multiplier</TableHead><TableHead>Max Tenure</TableHead>
          <TableHead>Eligible After</TableHead><TableHead>Status</TableHead><TableHead/>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map(l=>(
            <TableRow key={l.id}>
              <TableCell className="font-mono text-xs text-violet-600 dark:text-violet-400">{l.code}</TableCell>
              <TableCell className="text-xs font-medium">{l.name}</TableCell>
              <TableCell className="text-xs">{l.interestRatePct}%</TableCell>
              <TableCell className="text-xs capitalize">{l.interestType}</TableCell>
              <TableCell className="text-xs">{l.maxAmountMultiplier}× basic</TableCell>
              <TableCell className="text-xs">{l.maxTenureMonths} months</TableCell>
              <TableCell className="text-xs">{l.eligibleAfterDays} days</TableCell>
              <TableCell><Badge variant={l.status==='active'?'default':'secondary'} className="text-[10px]">{l.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(l)}><Edit2 className="h-3.5 w-3.5"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>toggleStatus(l.id)}>
                    {l.status==='active'?<ToggleRight className="h-3.5 w-3.5 text-green-600"/>:<ToggleLeft className="h-3.5 w-3.5 text-muted-foreground"/>}
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
            <SheetTitle>{editId?'Edit Loan Type':'New Loan Type'}</SheetTitle>
            <SheetDescription>Configure loan parameters</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Code *</Label><Input className="text-xs mt-1" maxLength={8} value={form.code} onChange={e=>setF('code',e.target.value.toUpperCase())} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Name *</Label><Input className="text-xs mt-1" value={form.name} onChange={e=>setF('name',e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Interest Rate (%)</Label><Input type="number" step="0.01" className="text-xs mt-1" value={form.interestRatePct} onChange={e=>setF('interestRatePct',+e.target.value)} onKeyDown={onEnterNext}/></div>
              <div>
                <Label className="text-xs">Interest Type</Label>
                <Select value={form.interestType} onValueChange={v=>setF('interestType',v as LoanType['interestType'])}>
                  <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="compound">Compound</SelectItem>
                    <SelectItem value="nil">Nil (0%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Max Amount Multiplier (× basic)</Label><Input type="number" className="text-xs mt-1" value={form.maxAmountMultiplier} onChange={e=>setF('maxAmountMultiplier',+e.target.value)} onKeyDown={onEnterNext}/></div>
            <div><Label className="text-xs">Max Tenure (months)</Label><Input type="number" className="text-xs mt-1" value={form.maxTenureMonths} onChange={e=>setF('maxTenureMonths',+e.target.value)} onKeyDown={onEnterNext}/></div>
            <div><Label className="text-xs">Eligible After (days of service)</Label><Input type="number" className="text-xs mt-1" value={form.eligibleAfterDays} onChange={e=>setF('eligibleAfterDays',+e.target.value)} onKeyDown={onEnterNext}/></div>
          </div>
          <SheetFooter>
            <Button onClick={handleSave} data-primary>{editId?'Update':'Create'} Loan Type</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function LoanTypesMaster() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex-1">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Loan Types'}]} showDatePicker={false} showCompany={false}/>
        <div className="p-6 max-w-7xl mx-auto"><LoanTypesMasterPanel/></div>
      </div>
    </SidebarProvider>
  );
}
