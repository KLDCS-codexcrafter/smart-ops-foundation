/**
 * LeaveTypesMaster.tsx — M-6 Leave Types Master
 * Sheet-based. 7 seed leave types. Tabs for filtering.
 */
import { useState, useCallback } from 'react';
import { Palmtree, Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useLeaveTypes } from '@/hooks/usePayHubMasters3';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { LeaveType } from '@/types/payroll-masters';
import { LEAVE_TYPES_KEY } from '@/types/payroll-masters';
import { MasterPropagationDialog } from '@/components/pay-hub/MasterPropagationDialog';

type LTForm = Omit<LeaveType, 'id' | 'created_at' | 'updated_at'>;
const BLANK: LTForm = {
  code:'',name:'',shortName:'',daysPerYear:0,carryForward:false,maxCarryForward:0,
  carryForwardExpiryMonths:0,encashable:false,encashmentRatePct:0,maxEncashmentDays:0,
  applicableFrom:'joining',customApplicableAfterDays:0,proRata:false,clubbingAllowed:false,
  minDaysAtOnce:0.5,maxDaysAtOnce:30,advanceNoticeDays:1,documentRequired:false,
  documentRequiredAfterDays:3,applicableGender:'all',paidLeave:true,halfDayAllowed:true,status:'active',
};

const TAB_FILTERS: Record<string, (l: LeaveType) => boolean> = {
  all: () => true,
  earned: l => ['EL','AL'].includes(l.code) || l.name.toLowerCase().includes('earned') || l.name.toLowerCase().includes('annual'),
  casual_sick: l => ['CL','SL'].includes(l.code) || l.name.toLowerCase().includes('casual') || l.name.toLowerCase().includes('sick'),
  maternity: l => ['ML','PL'].includes(l.code) || l.name.toLowerCase().includes('maternity') || l.name.toLowerCase().includes('paternity'),
  other: l => !['EL','AL','CL','SL','ML','PL'].includes(l.code),
};

export function LeaveTypesMasterPanel() {
  const { leaveTypes, create, update, toggleStatus } = useLeaveTypes();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState<LTForm>({...BLANK});

  const filtered = leaveTypes
    .filter(TAB_FILTERS[tab] || TAB_FILTERS.all)
    .filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.code.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setEditId(null); setForm({...BLANK}); setSheetOpen(true); };
  const openEdit = (l: LeaveType) => {
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
          <h2 className="text-xl font-bold">Leave Types</h2>
          <p className="text-sm text-muted-foreground">Configure leave categories, entitlements and rules</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4"/>New Leave Type</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="earned">Earned & Annual</TabsTrigger><TabsTrigger value="casual_sick">Casual & Sick</TabsTrigger><TabsTrigger value="maternity">Maternity & Paternity</TabsTrigger><TabsTrigger value="other">Other</TabsTrigger></TabsList>
      </Tabs>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input className="pl-8 text-xs" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <Table>
        <TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Days/Year</TableHead>
          <TableHead>Carry Fwd</TableHead><TableHead>Encashable</TableHead><TableHead>Paid</TableHead>
          <TableHead>Gender</TableHead><TableHead>Status</TableHead><TableHead/>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.map(l=>(
            <TableRow key={l.id}>
              <TableCell className="font-mono text-xs text-violet-600 dark:text-violet-400">{l.code}</TableCell>
              <TableCell className="text-xs font-medium">{l.name}</TableCell>
              <TableCell className="text-xs">{l.daysPerYear || '∞'}</TableCell>
              <TableCell className="text-xs">{l.carryForward?`✓ (max ${l.maxCarryForward})`:'—'}</TableCell>
              <TableCell className="text-xs">{l.encashable?'✓':'—'}</TableCell>
              <TableCell className="text-xs">{l.paidLeave?'Yes':'No'}</TableCell>
              <TableCell className="text-xs capitalize">{l.applicableGender}</TableCell>
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
            <SheetTitle>{editId?'Edit Leave Type':'New Leave Type'}</SheetTitle>
            <SheetDescription>Configure leave entitlement and rules</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Code *</Label><Input className="text-xs mt-1" maxLength={8} value={form.code} onChange={e=>setF('code',e.target.value.toUpperCase())} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Short Name *</Label><Input className="text-xs mt-1" maxLength={8} value={form.shortName} onChange={e=>setF('shortName',e.target.value.toUpperCase())} onKeyDown={onEnterNext}/></div>
            </div>
            <div><Label className="text-xs">Name *</Label><Input className="text-xs mt-1" value={form.name} onChange={e=>setF('name',e.target.value)} onKeyDown={onEnterNext}/></div>
            <div><Label className="text-xs">Days Per Year</Label><Input type="number" className="text-xs mt-1" value={form.daysPerYear} onChange={e=>setF('daysPerYear',+e.target.value)} onKeyDown={onEnterNext}/><p className="text-[10px] text-muted-foreground mt-0.5">0 = unlimited (e.g. Comp Off)</p></div>

            {/* Carry Forward */}
            <div className="space-y-2">
              <div className="flex items-center gap-2"><Switch checked={form.carryForward} onCheckedChange={v=>setF('carryForward',v)}/><Label className="text-xs">Carry Forward</Label></div>
              {form.carryForward && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div><Label className="text-xs">Max CF Days</Label><Input type="number" className="text-xs mt-1" value={form.maxCarryForward} onChange={e=>setF('maxCarryForward',+e.target.value)} onKeyDown={onEnterNext}/></div>
                  <div><Label className="text-xs">Expiry Months</Label><Input type="number" className="text-xs mt-1" value={form.carryForwardExpiryMonths} onChange={e=>setF('carryForwardExpiryMonths',+e.target.value)} onKeyDown={onEnterNext}/></div>
                </div>
              )}
            </div>

            {/* Encashable */}
            <div className="space-y-2">
              <div className="flex items-center gap-2"><Switch checked={form.encashable} onCheckedChange={v=>setF('encashable',v)}/><Label className="text-xs">Encashable</Label></div>
              {form.encashable && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div><Label className="text-xs">Rate %</Label><Input type="number" className="text-xs mt-1" value={form.encashmentRatePct} onChange={e=>setF('encashmentRatePct',+e.target.value)} onKeyDown={onEnterNext}/></div>
                  <div><Label className="text-xs">Max Days</Label><Input type="number" className="text-xs mt-1" value={form.maxEncashmentDays} onChange={e=>setF('maxEncashmentDays',+e.target.value)} onKeyDown={onEnterNext}/></div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2"><Switch checked={form.paidLeave} onCheckedChange={v=>setF('paidLeave',v)}/><Label className="text-xs">Paid Leave</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.halfDayAllowed} onCheckedChange={v=>setF('halfDayAllowed',v)}/><Label className="text-xs">Half Day Allowed</Label></div>

            <div>
              <Label className="text-xs">Applicable Gender</Label>
              <Select value={form.applicableGender} onValueChange={v=>setF('applicableGender',v as LeaveType['applicableGender'])}>
                <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Applicable From</Label>
              <Select value={form.applicableFrom} onValueChange={v=>setF('applicableFrom',v as LeaveType['applicableFrom'])}>
                <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                <SelectContent><SelectItem value="joining">Joining</SelectItem><SelectItem value="confirmation">Confirmation</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2"><Switch checked={form.proRata} onCheckedChange={v=>setF('proRata',v)}/><Label className="text-xs">Pro-Rata</Label></div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Min Days at Once</Label><Input type="number" step="0.5" className="text-xs mt-1" value={form.minDaysAtOnce} onChange={e=>setF('minDaysAtOnce',+e.target.value)} onKeyDown={onEnterNext}/></div>
              <div><Label className="text-xs">Max Days at Once</Label><Input type="number" className="text-xs mt-1" value={form.maxDaysAtOnce} onChange={e=>setF('maxDaysAtOnce',+e.target.value)} onKeyDown={onEnterNext}/></div>
            </div>
            <div><Label className="text-xs">Advance Notice (days)</Label><Input type="number" className="text-xs mt-1" value={form.advanceNoticeDays} onChange={e=>setF('advanceNoticeDays',+e.target.value)} onKeyDown={onEnterNext}/></div>

            {/* Document */}
            <div className="space-y-2">
              <div className="flex items-center gap-2"><Switch checked={form.documentRequired} onCheckedChange={v=>setF('documentRequired',v)}/><Label className="text-xs">Document Required</Label></div>
              {form.documentRequired && (
                <div className="pl-6"><Label className="text-xs">After N Days</Label><Input type="number" className="text-xs mt-1" value={form.documentRequiredAfterDays} onChange={e=>setF('documentRequiredAfterDays',+e.target.value)} onKeyDown={onEnterNext}/></div>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleSave} data-primary>{editId?'Update':'Create'} Leave Type</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function LeaveTypesMaster() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex-1">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Leave Types'}]} showDatePicker={false} showCompany={false}/>
        <div className="p-6 max-w-7xl mx-auto"><LeaveTypesMasterPanel/></div>
      </div>
    </SidebarProvider>
  );
}
