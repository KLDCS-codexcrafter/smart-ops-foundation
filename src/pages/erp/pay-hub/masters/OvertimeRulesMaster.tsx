/**
 * OvertimeRulesMaster.tsx — M-9 OT Rules with slabs sub-table
 * Sheet (sm:max-w-2xl). OT slabs inline editable.
 */
import { useState, useCallback } from 'react';
import { Clock, Plus, Search, Edit2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useOvertimeRules } from '@/hooks/usePayHubMasters3';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { OvertimeRule, OvertimeSlab } from '@/types/payroll-masters';

type OTForm = Omit<OvertimeRule, 'id'|'created_at'|'updated_at'>;
const BLANK: OTForm = {
  code:'',name:'',description:'',minOvertimeHours:1,
  maxOvertimeHoursDaily:4,maxOvertimeHoursWeekly:12,maxOvertimeHoursMonthly:48,
  slabs:[],effectiveFrom:'',status:'active',
};

export function OvertimeRulesMasterPanel() {
  const { rules, create, update, toggleStatus } = useOvertimeRules();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState<OTForm>({...BLANK, slabs:[]});

  const filtered = rules.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditId(null); setForm({...BLANK, slabs:[]}); setSheetOpen(true); };
  const openEdit = (r: OvertimeRule) => {
    setEditId(r.id);
    const { id, created_at, updated_at, ...rest } = r;
    setForm({...rest, slabs:[...rest.slabs]});
    setSheetOpen(true);
  };

  const handleSave = useCallback(() => {
    if (!sheetOpen) return;
    if (!form.name.trim()) return;
    if (editId) update(editId, form); else create(form);
    setSheetOpen(false);
  }, [form, editId, sheetOpen, create, update]);

  useCtrlS(handleSave);
  const setF = <K extends keyof OTForm>(k: K, v: OTForm[K]) => setForm(p => ({...p,[k]:v}));

  const addSlab = () => {
    const slab: OvertimeSlab = { id:`slab-${Date.now()}`, fromHours:0, toHours:2, rateMultiplier:1.5, dayType:'weekday' };
    setForm(p => ({...p, slabs:[...p.slabs, slab]}));
  };
  const removeSlab = (idx:number) => setForm(p => ({...p, slabs:p.slabs.filter((_,i)=>i!==idx)}));
  const updateSlab = (idx:number, patch:Partial<OvertimeSlab>) => {
    setForm(p => ({...p, slabs:p.slabs.map((s,i)=> i===idx?{...s,...patch}:s)}));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Overtime Rules</h2>
          <p className="text-sm text-muted-foreground">Configure OT eligibility, limits and rate slabs</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4"/>New OT Rule</Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-8 text-xs" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <Table>
        <TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Min OT Hours</TableHead>
          <TableHead>Max Daily</TableHead><TableHead>Slabs</TableHead><TableHead>Eff. From</TableHead>
          <TableHead>Status</TableHead><TableHead/>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map(r=>(
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs text-violet-600 dark:text-violet-400">{r.code}</TableCell>
              <TableCell className="text-xs font-medium">{r.name}</TableCell>
              <TableCell className="text-xs">{r.minOvertimeHours}h</TableCell>
              <TableCell className="text-xs">{r.maxOvertimeHoursDaily}h</TableCell>
              <TableCell className="text-xs">{r.slabs.length}</TableCell>
              <TableCell className="text-xs">{r.effectiveFrom||'—'}</TableCell>
              <TableCell><Badge variant={r.status==='active'?'default':'secondary'} className="text-[10px]">{r.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(r)}><Edit2 className="h-3.5 w-3.5"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>toggleStatus(r.id)}>
                    {r.status==='active'?<ToggleRight className="h-3.5 w-3.5 text-green-600"/>:<ToggleLeft className="h-3.5 w-3.5 text-muted-foreground"/>}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto" data-keyboard-form>
          <SheetHeader>
            <SheetTitle>{editId?'Edit OT Rule':'New OT Rule'}</SheetTitle>
            <SheetDescription>Configure overtime limits and rate slabs</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Code *</Label><Input className="text-xs mt-1" maxLength={8} value={form.code} onChange={e=>setF('code',e.target.value.toUpperCase())} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Name *</Label><Input className="text-xs mt-1" value={form.name} onChange={e=>setF('name',e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>
            <div><Label className="text-xs">Description</Label><Input className="text-xs mt-1" value={form.description} onChange={e=>setF('description',e.target.value)} onKeyDown={onEnterNext}/></div>
            <div><Label className="text-xs">Effective From</Label><Input type="date" className="text-xs mt-1" value={form.effectiveFrom} onChange={e=>setF('effectiveFrom',e.target.value)} onKeyDown={onEnterNext}/></div>
            <div><Label className="text-xs">Min OT Hours to qualify</Label><Input type="number" step="0.5" className="text-xs mt-1" value={form.minOvertimeHours} onChange={e=>setF('minOvertimeHours',+e.target.value)} onKeyDown={onEnterNext}/></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Max Daily</Label><Input type="number" className="text-xs mt-1" value={form.maxOvertimeHoursDaily} onChange={e=>setF('maxOvertimeHoursDaily',+e.target.value)} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Max Weekly</Label><Input type="number" className="text-xs mt-1" value={form.maxOvertimeHoursWeekly} onChange={e=>setF('maxOvertimeHoursWeekly',+e.target.value)} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Max Monthly</Label><Input type="number" className="text-xs mt-1" value={form.maxOvertimeHoursMonthly} onChange={e=>setF('maxOvertimeHoursMonthly',+e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>

            {/* OT Slabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">OT Slabs ({form.slabs.length})</Label>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={addSlab}><Plus className="h-3 w-3 mr-1"/>Add Slab</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">1.0 = same rate, 1.5 = time-and-a-half, 2.0 = double time</p>
              {form.slabs.length > 0 && (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Day Type</TableHead><TableHead className="text-xs">From (h)</TableHead>
                    <TableHead className="text-xs">To (h)</TableHead><TableHead className="text-xs">Rate ×</TableHead><TableHead/>
                  </TableRow></TableHeader>
                  <TableBody>
                    {form.slabs.map((s,i)=>(
                      <TableRow key={s.id}>
                        <TableCell className="p-1">
                          <Select value={s.dayType} onValueChange={v=>updateSlab(i,{dayType:v as OvertimeSlab['dayType']})}>
                            <SelectTrigger className="text-xs h-7"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekday">Weekday</SelectItem>
                              <SelectItem value="weekend">Weekend</SelectItem>
                              <SelectItem value="holiday">Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1"><Input type="number" step="0.5" className="text-xs h-7 w-16" value={s.fromHours} onChange={e=>updateSlab(i,{fromHours:+e.target.value})}/></TableCell>
                        <TableCell className="p-1"><Input type="number" step="0.5" className="text-xs h-7 w-16" value={s.toHours} onChange={e=>updateSlab(i,{toHours:+e.target.value})}/></TableCell>
                        <TableCell className="p-1"><Input type="number" step="0.25" className="text-xs h-7 w-16" value={s.rateMultiplier} onChange={e=>updateSlab(i,{rateMultiplier:+e.target.value})}/></TableCell>
                        <TableCell className="p-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>removeSlab(i)}><X className="h-3 w-3"/></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleSave} data-primary>{editId?'Update':'Create'} OT Rule</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function OvertimeRulesMaster() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex-1">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Overtime Rules'}]} showDatePicker={false} showCompany={false}/>
        <div className="p-6 max-w-7xl mx-auto"><OvertimeRulesMasterPanel/></div>
      </div>
    </SidebarProvider>
  );
}
