/**
 * AttendanceTypesMaster.tsx — M-8 Attendance Types
 * Sheet-based. Color swatch picker. 9 seed records.
 */
import { useState, useCallback } from 'react';
import { Timer, Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
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
import { useAttendanceTypes } from '@/hooks/usePayHubMasters3';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { cn } from '@/lib/utils';
import type { AttendanceType } from '@/types/payroll-masters';

const COLORS = ['#22c55e','#ef4444','#f59e0b','#f97316','#8b5cf6','#06b6d4','#3b82f6','#10b981'];

const BASE_TYPES: AttendanceType['baseType'][] = [
  'present','absent','half_day','late','early_out','overtime','on_duty','work_from_home','compensatory_off',
];
const BASE_TYPE_LABELS: Record<string,string> = {
  present:'Present',absent:'Absent',half_day:'Half Day',late:'Late',early_out:'Early Out',
  overtime:'Overtime',on_duty:'On Duty',work_from_home:'WFH',compensatory_off:'Comp Off',
};

type ATForm = Omit<AttendanceType, 'id'|'created_at'|'updated_at'>;
const BLANK: ATForm = {
  code:'',name:'',shortName:'',baseType:'present',paidStatus:'full_paid',color:'#22c55e',
  countAsWorkingDay:true,requiresApproval:false,allowManualEntry:true,status:'active',
};

export function AttendanceTypesMasterPanel() {
  const { attendanceTypes, create, update, toggleStatus } = useAttendanceTypes();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState<ATForm>({...BLANK});

  const filtered = attendanceTypes.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditId(null); setForm({...BLANK}); setSheetOpen(true); };
  const openEdit = (a: AttendanceType) => {
    setEditId(a.id);
    const { id, created_at, updated_at, ...rest } = a;
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
  const setF = <K extends keyof ATForm>(k: K, v: ATForm[K]) => setForm(p => ({...p,[k]:v}));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Attendance Types</h2>
          <p className="text-sm text-muted-foreground">Define attendance categories and their pay impact</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4"/>New Type</Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-8 text-xs" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <Table>
        <TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Short</TableHead>
          <TableHead>Base Type</TableHead><TableHead>Paid Status</TableHead><TableHead>Count WD</TableHead>
          <TableHead>Req Approval</TableHead><TableHead>Status</TableHead><TableHead/>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map(a=>(
            <TableRow key={a.id}>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{backgroundColor:a.color}}/>
                  <span className="font-mono text-xs text-violet-600 dark:text-violet-400">{a.code}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs font-medium">{a.name}</TableCell>
              <TableCell className="text-xs">{a.shortName}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{BASE_TYPE_LABELS[a.baseType]||a.baseType}</Badge></TableCell>
              <TableCell className="text-xs capitalize">{a.paidStatus.replace('_',' ')}</TableCell>
              <TableCell className="text-xs">{a.countAsWorkingDay?'✓':'—'}</TableCell>
              <TableCell className="text-xs">{a.requiresApproval?'✓':'—'}</TableCell>
              <TableCell><Badge variant={a.status==='active'?'default':'secondary'} className="text-[10px]">{a.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>openEdit(a)}><Edit2 className="h-3.5 w-3.5"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>toggleStatus(a.id)}>
                    {a.status==='active'?<ToggleRight className="h-3.5 w-3.5 text-green-600"/>:<ToggleLeft className="h-3.5 w-3.5 text-muted-foreground"/>}
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
            <SheetTitle>{editId?'Edit Attendance Type':'New Attendance Type'}</SheetTitle>
            <SheetDescription>Configure attendance category and rules</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Code * (max 4)</Label><Input className="text-xs mt-1" maxLength={4} value={form.code} onChange={e=>setF('code',e.target.value.toUpperCase())} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Short Name * (max 4)</Label><Input className="text-xs mt-1" maxLength={4} value={form.shortName} onChange={e=>setF('shortName',e.target.value.toUpperCase())} onKeyDown={onEnterNext}/></div>
            </div>
            <div><Label className="text-xs">Name *</Label><Input className="text-xs mt-1" value={form.name} onChange={e=>setF('name',e.target.value)} onKeyDown={onEnterNext}/></div>
            <div>
              <Label className="text-xs">Base Type</Label>
              <Select value={form.baseType} onValueChange={v=>setF('baseType',v as AttendanceType['baseType'])}>
                <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>{BASE_TYPES.map(t=><SelectItem key={t} value={t}>{BASE_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paid Status</Label>
              <Select value={form.paidStatus} onValueChange={v=>setF('paidStatus',v as AttendanceType['paidStatus'])}>
                <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_paid">Full Paid</SelectItem>
                  <SelectItem value="half_paid">Half Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.countAsWorkingDay} onCheckedChange={v=>setF('countAsWorkingDay',v)}/><Label className="text-xs">Count as Working Day</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.requiresApproval} onCheckedChange={v=>setF('requiresApproval',v)}/><Label className="text-xs">Requires Approval</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.allowManualEntry} onCheckedChange={v=>setF('allowManualEntry',v)}/><Label className="text-xs">Allow Manual Entry</Label></div>
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
            <Button onClick={handleSave} data-primary>{editId?'Update':'Create'} Type</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function AttendanceTypesMaster() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex-1">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Attendance Types'}]} showDatePicker={false} showCompany={false}/>
        <div className="p-6 max-w-7xl mx-auto"><AttendanceTypesMasterPanel/></div>
      </div>
    </SidebarProvider>
  );
}
