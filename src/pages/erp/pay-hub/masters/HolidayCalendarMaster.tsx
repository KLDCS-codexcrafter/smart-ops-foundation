/**
 * HolidayCalendarMaster.tsx — M-7 Holiday Calendar
 * Sheet (max-w-2xl) with holidays sub-table. Import National Holidays button.
 */
import { useState, useCallback } from 'react';
import { Calendar, Plus, Search, Edit2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useHolidayCalendars } from '@/hooks/usePayHubMasters3';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { HolidayCalendar, Holiday } from '@/types/payroll-masters';

type HCForm = Omit<HolidayCalendar, 'id' | 'created_at' | 'updated_at'>;
const BLANK: HCForm = {
  year: new Date().getFullYear(), name: '', location: 'All Locations',
  description: '', holidays: [], status: 'active',
};

const mkHoliday = (date:string, name:string, type: Holiday['type']): Holiday => ({
  id: `hol-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
  date, name, type, stateCode:'', stateName:'', isOptional: type==='optional', description:'',
});

function getNationalHolidays(year: number): Holiday[] {
  return [
    mkHoliday(`${year}-01-26`,'Republic Day','national'),
    mkHoliday(`${year}-08-15`,'Independence Day','national'),
    mkHoliday(`${year}-10-02`,'Gandhi Jayanti','national'),
    mkHoliday(`${year}-10-20`,'Diwali (approx)','national'),
    mkHoliday(`${year}-12-25`,'Christmas','national'),
  ];
}

export function HolidayCalendarMasterPanel() {
  const { calendars, create, update, toggleStatus } = useHolidayCalendars();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState<HCForm>({...BLANK, holidays:[]});

  const filtered = calendars.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || String(c.year).includes(search)
  );

  const openNew = () => { setEditId(null); setForm({...BLANK, holidays:[]}); setSheetOpen(true); };
  const openEdit = (c: HolidayCalendar) => {
    setEditId(c.id);
    const { id, created_at, updated_at, ...rest } = c;
    setForm({...rest, holidays:[...rest.holidays]});
    setSheetOpen(true);
  };

  const handleSave = useCallback(() => {
    if (!sheetOpen) return;
    if (!form.name.trim()) return;
    if (editId) update(editId, form); else create(form);
    setSheetOpen(false);
  }, [form, editId, sheetOpen, create, update]);

  useCtrlS(handleSave);

  const setF = <K extends keyof HCForm>(k: K, v: HCForm[K]) => setForm(p => ({...p,[k]:v}));

  const addHoliday = () => {
    setForm(p => ({...p, holidays:[...p.holidays, mkHoliday('','','company')]}));
  };
  const removeHoliday = (idx: number) => {
    setForm(p => ({...p, holidays: p.holidays.filter((_,i)=>i!==idx)}));
  };
  const updateHoliday = (idx: number, patch: Partial<Holiday>) => {
    setForm(p => ({...p, holidays: p.holidays.map((h,i)=> i===idx ? {...h,...patch} : h)}));
  };
  const importNational = () => {
    const existing = new Set(form.holidays.map(h=>h.date+h.name));
    const newOnes = getNationalHolidays(form.year).filter(h=> !existing.has(h.date+h.name));
    setForm(p => ({...p, holidays: [...p.holidays, ...newOnes]}));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Holiday Calendar</h2>
          <p className="text-sm text-muted-foreground">Manage yearly holiday calendars by location</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4"/>New Calendar</Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-8 text-xs" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <Table>
        <TableHeader><TableRow>
          <TableHead>Year</TableHead><TableHead>Calendar Name</TableHead><TableHead>Location</TableHead>
          <TableHead>Holidays</TableHead><TableHead>Status</TableHead><TableHead/>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map(c=>(
            <TableRow key={c.id}>
              <TableCell className="text-xs font-mono">{c.year}</TableCell>
              <TableCell className="text-xs font-medium">{c.name}</TableCell>
              <TableCell className="text-xs">{c.location}</TableCell>
              <TableCell className="text-xs">{c.holidays.length}</TableCell>
              <TableCell><Badge variant={c.status==='active'?'default':'secondary'} className="text-[10px]">{c.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(c)}><Edit2 className="h-3.5 w-3.5"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>toggleStatus(c.id)}>
                    {c.status==='active'?<ToggleRight className="h-3.5 w-3.5 text-green-600"/>:<ToggleLeft className="h-3.5 w-3.5 text-muted-foreground"/>}
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
            <SheetTitle>{editId?'Edit Calendar':'New Calendar'}</SheetTitle>
            <SheetDescription>Define holidays for a year and location</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Year *</Label><Input type="number" className="text-xs mt-1" value={form.year} onChange={e=>setF('year',+e.target.value)} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Calendar Name *</Label><Input className="text-xs mt-1" value={form.name} onChange={e=>setF('name',e.target.value)} onKeyDown={onEnterNext} placeholder="e.g. Head Office 2025-26"/></div>
            </div>
            <div><Label className="text-xs">Location</Label><Input className="text-xs mt-1" value={form.location} onChange={e=>setF('location',e.target.value)} onKeyDown={onEnterNext}/></div>
            <div><Label className="text-xs">Description</Label><Textarea className="text-xs mt-1" rows={2} value={form.description} onChange={e=>setF('description',e.target.value)}/></div>

            {/* Holidays sub-table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Holidays ({form.holidays.length})</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={importNational}>Import National Holidays</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={addHoliday}><Plus className="h-3 w-3 mr-1"/>Add Holiday</Button>
                </div>
              </div>
              {form.holidays.length > 0 && (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Type</TableHead><TableHead className="text-xs">State</TableHead>
                    <TableHead className="text-xs">Optional</TableHead><TableHead/>
                  </TableRow></TableHeader>
                  <TableBody>
                    {form.holidays.map((h, i)=>(
                      <TableRow key={h.id}>
                        <TableCell className="p-1"><Input type="date" className="text-xs h-7" value={h.date} onChange={e=>updateHoliday(i,{date:e.target.value})}/></TableCell>
                        <TableCell className="p-1"><Input className="text-xs h-7" value={h.name} onChange={e=>updateHoliday(i,{name:e.target.value})} onKeyDown={onEnterNext}/></TableCell>
                        <TableCell className="p-1">
                          <Select value={h.type} onValueChange={v=>updateHoliday(i,{type:v as Holiday['type']})}>
                            <SelectTrigger className="text-xs h-7"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="national">National</SelectItem>
                              <SelectItem value="state">State</SelectItem>
                              <SelectItem value="company">Company</SelectItem>
                              <SelectItem value="optional">Optional</SelectItem>
                              <SelectItem value="restricted">Restricted</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1"><Input className="text-xs h-7 w-16" value={h.stateCode} onChange={e=>updateHoliday(i,{stateCode:e.target.value})} onKeyDown={onEnterNext}/></TableCell>
                        <TableCell className="p-1"><Switch checked={h.isOptional} onCheckedChange={v=>updateHoliday(i,{isOptional:v})}/></TableCell>
                        <TableCell className="p-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>removeHoliday(i)}><X className="h-3 w-3"/></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleSave} data-primary>{editId?'Update':'Create'} Calendar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function HolidayCalendarMaster() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex-1">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Holiday Calendar'}]} showDatePicker={false} showCompany={false}/>
        <div className="p-6 max-w-7xl mx-auto"><HolidayCalendarMasterPanel/></div>
      </div>
    </SidebarProvider>
  );
}
