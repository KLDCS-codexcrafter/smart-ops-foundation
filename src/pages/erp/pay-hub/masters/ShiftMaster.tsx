/**
 * ShiftMaster.tsx — M-5 Shift Master screen
 * Sheet-based. Color swatch picker. Weekly off multi-checkbox. 4 seed shifts.
 */
import { useState, useCallback } from 'react';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, Moon, Sun } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useShifts } from '@/hooks/usePayHubMasters3';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { cn } from '@/lib/utils';
import type { Shift } from '@/types/payroll-masters';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

type ShiftForm = Omit<Shift, 'id' | 'created_at' | 'updated_at'>;
const BLANK: ShiftForm = {
  code:'',name:'',startTime:'09:00',endTime:'18:00',breakDuration:60,breakStartTime:'13:00',
  gracePeriodIn:10,gracePeriodOut:10,weeklyOff:['Sunday'],rotationPattern:'none',
  overtimeAfter:9,nightShift:false,halfDayHours:4,fullDayHours:8.5,color:'#6366f1',status:'active',
};

export function ShiftMasterPanel() {
  const { shifts, create, update, toggleStatus } = useShifts();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState<ShiftForm>({...BLANK});

  const filtered = shifts.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditId(null); setForm({...BLANK}); setSheetOpen(true); };
  const openEdit = (s: Shift) => {
    setEditId(s.id);
    const { id, created_at, updated_at, ...rest } = s;
    setForm(rest);
    setSheetOpen(true);
  };

  const handleSave = useCallback(() => {
    if (!sheetOpen) return;
    if (!form.name.trim()) return;
    if (editId) {
      update(editId, form);
    } else {
      create(form);
    }
    setSheetOpen(false);
  }, [form, editId, sheetOpen, create, update]);

  useCtrlS(handleSave);

  const setF = <K extends keyof ShiftForm>(k: K, v: ShiftForm[K]) => setForm(p => ({...p,[k]:v}));
  const toggleDay = (day: string) => {
    setForm(p => ({
      ...p,
      weeklyOff: p.weeklyOff.includes(day) ? p.weeklyOff.filter(d=>d!==day) : [...p.weeklyOff, day],
    }));
  };

  const stats = {
    total: shifts.length,
    active: shifts.filter(s=>s.status==='active').length,
    night: shifts.filter(s=>s.nightShift).length,
    rotational: shifts.filter(s=>s.rotationPattern!=='none').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Shift Master</h2>
          <p className="text-sm text-muted-foreground">Manage work shifts, timings and rotation patterns</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4"/>New Shift</Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {label:'Total Shifts',val:stats.total},
          {label:'Active',val:stats.active},
          {label:'Night Shifts',val:stats.night},
          {label:'Rotational',val:stats.rotational},
        ].map(s=>(
          <Card key={s.label}><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{s.val}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-8 text-xs" placeholder="Search shifts…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead>
            <TableHead>In / Out</TableHead><TableHead>Break</TableHead>
            <TableHead>Grace In/Out</TableHead><TableHead>Night</TableHead>
            <TableHead>OT After</TableHead><TableHead>Status</TableHead><TableHead/>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(s=>(
            <TableRow key={s.id}>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{backgroundColor:s.color}}/>
                  <span className="font-mono text-xs text-violet-600 dark:text-violet-400">{s.code}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs font-medium">{s.name}</TableCell>
              <TableCell className="text-xs">{s.startTime} – {s.endTime}</TableCell>
              <TableCell className="text-xs">{s.breakDuration}m</TableCell>
              <TableCell className="text-xs">{s.gracePeriodIn}/{s.gracePeriodOut}m</TableCell>
              <TableCell>{s.nightShift ? <Moon className="h-3.5 w-3.5 text-violet-500"/> : <Sun className="h-3.5 w-3.5 text-amber-500"/>}</TableCell>
              <TableCell className="text-xs">{s.overtimeAfter}h</TableCell>
              <TableCell><Badge variant={s.status==='active'?'default':'secondary'} className="text-[10px]">{s.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(s)}><Edit2 className="h-3.5 w-3.5"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>toggleStatus(s.id)}>
                    {s.status==='active'?<ToggleRight className="h-3.5 w-3.5 text-green-600"/>:<ToggleLeft className="h-3.5 w-3.5 text-muted-foreground"/>}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto" data-keyboard-form>
          <SheetHeader>
            <SheetTitle>{editId?'Edit Shift':'New Shift'}</SheetTitle>
            <SheetDescription>Configure shift timing and rules</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Code *</Label><Input className="text-xs mt-1" maxLength={8} value={form.code} onChange={e=>setF('code',e.target.value.toUpperCase())} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Name *</Label><Input className="text-xs mt-1" value={form.name} onChange={e=>setF('name',e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Start Time</Label><Input type="time" className="text-xs mt-1" value={form.startTime} onChange={e=>setF('startTime',e.target.value)} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">End Time</Label><Input type="time" className="text-xs mt-1" value={form.endTime} onChange={e=>setF('endTime',e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Break Duration (min)</Label><Input type="number" className="text-xs mt-1" value={form.breakDuration} onChange={e=>setF('breakDuration',+e.target.value)} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Break Start Time</Label><Input type="time" className="text-xs mt-1" value={form.breakStartTime} onChange={e=>setF('breakStartTime',e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Grace In (min)</Label><Input type="number" className="text-xs mt-1" value={form.gracePeriodIn} onChange={e=>setF('gracePeriodIn',+e.target.value)} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Grace Out (min)</Label><Input type="number" className="text-xs mt-1" value={form.gracePeriodOut} onChange={e=>setF('gracePeriodOut',+e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.nightShift} onCheckedChange={v=>setF('nightShift',v)}/><Label className="text-xs">Night Shift</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">OT After (hours)</Label><Input type="number" className="text-xs mt-1" value={form.overtimeAfter} onChange={e=>setF('overtimeAfter',+e.target.value)} onKeyDown={onEnterNext}/></div>
              <div>
                <Label className="text-xs">Rotation Pattern</Label>
                <Select value={form.rotationPattern} onValueChange={v=>setF('rotationPattern',v as Shift['rotationPattern'])}>
                  <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Half Day Hours</Label><Input type="number" className="text-xs mt-1" value={form.halfDayHours} onChange={e=>setF('halfDayHours',+e.target.value)} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Full Day Hours</Label><Input type="number" step="0.5" className="text-xs mt-1" value={form.fullDayHours} onChange={e=>setF('fullDayHours',+e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>
            {/* Weekly Off */}
            <div>
              <Label className="text-xs">Weekly Off</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {DAYS.map(d=>(
                  <label key={d} className="flex items-center gap-1 text-xs cursor-pointer">
                    <Checkbox checked={form.weeklyOff.includes(d)} onCheckedChange={()=>toggleDay(d)}/>{d.slice(0,3)}
                  </label>
                ))}
              </div>
            </div>
            {/* Color */}
            <div>
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2 mt-1">
                {COLORS.map(c=>(
                  <button key={c} className={cn('h-6 w-6 rounded-full border-2 transition-all',form.color===c?'border-foreground scale-110':'border-transparent')} style={{backgroundColor:c}} onClick={()=>setF('color',c)}/>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleSave} data-primary>{editId?'Update':'Create'} Shift</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ShiftMaster() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex-1">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Shift Master'}]} showDatePicker={false} showCompany={false}/>
        <div className="p-6 max-w-7xl mx-auto"><ShiftMasterPanel/></div>
      </div>
    </SidebarProvider>
  );
}
