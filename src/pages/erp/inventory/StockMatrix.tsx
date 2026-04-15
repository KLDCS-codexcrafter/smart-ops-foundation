import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Boxes, Plus, Search, Edit2, Trash2, List, Network, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { StockGroup, StockGroupFormData, CostingMethod } from '@/types/stock-group';
import { onEnterNext } from '@/lib/keyboard';

const CATEGORY_TYPES=['Raw Material','Finished Goods','Semi-Finished','Component','By-Product','Co-Product','Scrap','Consumables','Stores & Consumables','Fixed Assets','Service','Spare Parts','Equipment','Tools','Packaging'];
const MATERIAL_TYPES=['Non-Perishable','Perishable','Service'];
const STOCK_NATURES=['Inventory','Non-Inventory'];
const USE_FOR=['All','Sales','Purchase','Manufacturing','Not Applicable'];
const MOVE_INDS=['Normal','Fast Moving','Slow Moving','Non-Moving'];
const COSTING_METHODS:{value:CostingMethod;label:string}[]=[
  {value:'weighted_avg',label:'Weighted Average (default)'},
  {value:'fifo_annual',label:'FIFO — Annual'},
  {value:'fifo_perpetual',label:'FIFO — Perpetual'},
  {value:'lifo_annual',label:'LIFO — Annual'},
  {value:'lifo_perpetual',label:'LIFO — Perpetual'},
  {value:'last_purchase',label:'Last Purchase Price'},
  {value:'standard_cost',label:'Standard Cost'},
  {value:'specific_id',label:'Specific Identification'},
  {value:'monthly_avg',label:'Monthly Average'},
  {value:'zero_cost',label:'Zero Cost'},
];
const ABC: Record<string, string>={A:'bg-emerald-500/10 text-emerald-700',B:'bg-amber-500/10 text-amber-700',C:'bg-slate-500/10 text-slate-600'};
const SKEY='erp_stock_groups';
// [JWT] GET /api/entity/storage/:key
const load=():StockGroup[]=>{try{return JSON.parse(localStorage.getItem(SKEY)||'[]');}catch{return [];}};
const BLK:StockGroupFormData={code:'',short_code:'',name:'',display_name:'',parent_id:null,
  category_type:'Raw Material',material_type:'Non-Perishable',stock_nature:'Inventory',use_for:'All',
  batch_grid_enabled:false,serial_grid_enabled:false,costing_method:'weighted_avg',
  movement_class:null,movement_indicator:'Normal',expiry_tracking:false,
  reorder_level:null,internal_notes:'',effective_from:'',
  igst_rate:null,cgst_rate:null,sgst_rate:null,cess_rate:null,gst_type:null};

export function StockMatrixPanel() {
  const [groups,setGroups]=useState<StockGroup[]>(load());
  // [JWT] GET /api/inventory/stock-groups
  const [search,setSearch]=useState('');
  const [view,setView]=useState<'table'|'tree'>('table');
  const [open,setOpen]=useState(false);
  const [edit,setEdit]=useState<StockGroup|null>(null);
  const [form,setForm]=useState<StockGroupFormData>(BLK);
  const [exp,setExp]=useState<Set<string>>(new Set());

  // [JWT] PATCH /api/entity/storage/:key
  const sv=(d:StockGroup[])=>{localStorage.setItem(SKEY,JSON.stringify(d));
  // [JWT] POST/PATCH/DELETE /api/inventory/stock-groups
  };
  const openC=()=>{setForm(BLK);setEdit(null);setOpen(true);};
  const openE=(g:StockGroup)=>{
    setForm({code:g.code,short_code:g.short_code||'',name:g.name,display_name:g.display_name||'',
      parent_id:g.parent_id||null,category_type:g.category_type,material_type:g.material_type,
      stock_nature:g.stock_nature,use_for:g.use_for,batch_grid_enabled:g.batch_grid_enabled,
      serial_grid_enabled:g.serial_grid_enabled,costing_method:g.costing_method,
      movement_class:g.movement_class||null,movement_indicator:g.movement_indicator,
      expiry_tracking:g.expiry_tracking,reorder_level:g.reorder_level||null,
      internal_notes:g.internal_notes||'',effective_from:g.effective_from||'',
      igst_rate:g.igst_rate??null,cgst_rate:g.cgst_rate??null,sgst_rate:g.sgst_rate??null,
      cess_rate:g.cess_rate??null,gst_type:g.gst_type??null});
    setEdit(g);setOpen(true);
  };
  const handleSave=()=>{
    if(!form.code.trim()||!form.name.trim()){toast.error('Code and Name required');return;}
    if(edit){
      const u=groups.map(g=>g.id===edit.id?{...g,...form,updated_at:new Date().toISOString()}:g);
      setGroups(u);sv(u);toast.success(`${form.name} updated`);
      // [JWT] PATCH /api/inventory/stock-groups/:id
    } else {
      const ng:StockGroup={...form,id:`sg-${Date.now()}`,status:'active',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
      const u=[...groups,ng];setGroups(u);sv(u);toast.success(`${form.name} created`);
      // [JWT] POST /api/inventory/stock-groups
    }
    setOpen(false);
  };
  const handleDel=(g:StockGroup)=>{
    if(groups.some(x=>x.parent_id===g.id)){toast.error('Has children — remove them first');return;}
    const u=groups.filter(x=>x.id!==g.id);setGroups(u);sv(u);toast.success(`${g.name} deleted`);
    // [JWT] DELETE /api/inventory/stock-groups/:id
  };
  const fil=groups.filter(g=>g.name.toLowerCase().includes(search.toLowerCase())||
    g.code.toLowerCase().includes(search.toLowerCase()));
  const roots=fil.filter(g=>!g.parent_id);
  const kids=(id:string)=>groups.filter(g=>g.parent_id===id);
  const tog=(id:string)=>setExp(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const renderRow=(g:StockGroup,d=0):React.ReactNode=>{
    const ch=kids(g.id);const ie=exp.has(g.id);
    return(<><TableRow key={g.id} className='group'>
      <TableCell style={{paddingLeft:`${d*20+12}px`}}>
        <div className='flex items-center gap-1.5'>
          {ch.length>0?(<button onClick={()=>tog(g.id)} className='text-muted-foreground hover:text-foreground'>
            {ie?<ChevronDown className='h-3.5 w-3.5'/>:<ChevronRight className='h-3.5 w-3.5'/>}</button>):<span className='w-3.5 inline-block'/>}
          <span className='text-sm font-medium'>{g.name}</span>
          {ch.length>0&&d>0&&<Badge variant='secondary' className='text-xs ml-1'>{ch.length}</Badge>}
        </div>
      </TableCell>
      <TableCell><Badge variant='secondary' className='font-mono text-xs'>{g.code}</Badge></TableCell>
      <TableCell className='text-xs text-muted-foreground'>{g.category_type}</TableCell>
      <TableCell>{g.movement_class&&<Badge className={`text-xs ${ABC[g.movement_class]}`}>{g.movement_class}</Badge>}</TableCell>
      <TableCell><div className='flex gap-1'>
        {g.batch_grid_enabled&&<Badge variant='outline' className='text-xs'>Batch</Badge>}
        {g.serial_grid_enabled&&<Badge variant='outline' className='text-xs'>Serial</Badge>}
      </div></TableCell>
      <TableCell><Badge className={`text-xs ${g.status==='active'?'bg-emerald-500/10 text-emerald-700':'bg-slate-500/10 text-slate-500'}`}>{g.status}</Badge></TableCell>
      <TableCell><div className='flex gap-1 opacity-0 group-hover:opacity-100'>
        <Button variant='ghost' size='icon' className='h-7 w-7' onClick={()=>openE(g)}><Edit2 className='h-3.5 w-3.5 text-muted-foreground'/></Button>
        <Button variant='ghost' size='icon' className='h-7 w-7' onClick={()=>handleDel(g)}><Trash2 className='h-3.5 w-3.5 text-destructive'/></Button>
      </div></TableCell>
    </TableRow>{ie&&ch.map(k=>renderRow(k,d+1))}</>);
  };

  return (
    <div data-keyboard-form className='max-w-5xl mx-auto space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <div><h1 className='text-2xl font-bold flex items-center gap-2'><Boxes className='h-6 w-6'/>Stock Matrix</h1>
        <p className='text-sm text-muted-foreground'>Hierarchical stock groups — costing method is a soft default (items can override)</p></div>
        <Button size='sm' className='gap-1.5' onClick={openC}><Plus className='h-4 w-4'/>Add Group</Button>
      </div>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <Card><CardHeader className='pb-2'><CardDescription>Total</CardDescription><CardTitle className='text-2xl'>{groups.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className='pb-2'><CardDescription>Active</CardDescription><CardTitle className='text-2xl text-emerald-600'>{groups.filter(g=>g.status==='active').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className='pb-2'><CardDescription>Batch Tracked</CardDescription><CardTitle className='text-2xl'>{groups.filter(g=>g.batch_grid_enabled).length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className='pb-2'><CardDescription>Serialized</CardDescription><CardTitle className='text-2xl'>{groups.filter(g=>g.serial_grid_enabled).length}</CardTitle></CardHeader></Card>
      </div>
      <div className='flex items-center justify-between gap-4'>
        <div className='relative'><Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground'/>
        <Input className='pl-8 h-9 w-64' placeholder='Search groups...' value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className='flex gap-2'>
          <Button variant={view==='table'?'secondary':'ghost'} size='sm' onClick={()=>setView('table')}><List className='h-4 w-4 mr-1'/>Table</Button>
          <Button variant={view==='tree'?'secondary':'ghost'} size='sm' onClick={()=>setView('tree')}><Network className='h-4 w-4 mr-1'/>Tree</Button>
        </div>
      </div>
      <Card><CardContent className='p-0'><Table>
        <TableHeader><TableRow className='bg-muted/40 hover:bg-muted/40'>
          {['Name','Code','Category','ABC','Tracking','Status',''].map(h=>(
            <TableHead key={h} className='text-xs font-semibold uppercase tracking-wider'>{h}</TableHead>
          ))}</TableRow></TableHeader>
        <TableBody>
          {fil.length===0?(<TableRow><TableCell colSpan={7} className='text-center py-16 text-muted-foreground'>
            <Boxes className='h-10 w-10 mx-auto mb-3 opacity-20'/>
            <p className='text-sm font-semibold text-foreground mb-1'>No stock groups yet</p>
            <Button size='sm' className='mt-2' onClick={openC}><Plus className='h-4 w-4 mr-1'/>Add Group</Button>
          </TableCell></TableRow>):view==='tree'?roots.map(r=>renderRow(r)):fil.map(g=>(
            <TableRow key={g.id} className='group'>
              <TableCell className='text-sm font-medium'>{g.name}</TableCell>
              <TableCell><Badge variant='secondary' className='font-mono text-xs'>{g.code}</Badge></TableCell>
              <TableCell className='text-xs text-muted-foreground'>{g.category_type}</TableCell>
              <TableCell>{g.movement_class&&<Badge className={`text-xs ${ABC[g.movement_class]}`}>{g.movement_class}</Badge>}</TableCell>
              <TableCell><div className='flex gap-1'>{g.batch_grid_enabled&&<Badge variant='outline' className='text-xs'>Batch</Badge>}{g.serial_grid_enabled&&<Badge variant='outline' className='text-xs'>Serial</Badge>}</div></TableCell>
              <TableCell><Badge className={`text-xs ${g.status==='active'?'bg-emerald-500/10 text-emerald-700':'bg-slate-500/10 text-slate-500'}`}>{g.status}</Badge></TableCell>
              <TableCell><div className='flex gap-1 opacity-0 group-hover:opacity-100'>
                <Button variant='ghost' size='icon' className='h-7 w-7' onClick={()=>openE(g)}><Edit2 className='h-3.5 w-3.5 text-muted-foreground'/></Button>
                <Button variant='ghost' size='icon' className='h-7 w-7' onClick={()=>handleDel(g)}><Trash2 className='h-3.5 w-3.5 text-destructive'/></Button>
              </div></TableCell>
            </TableRow>))}
        </TableBody></Table></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{edit?`Edit: ${edit.name}`:'New Stock Group'}</DialogTitle>
            <DialogDescription>Costing method is a soft default — items can override individually</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className='space-y-4'>
            <div className='grid grid-cols-3 gap-4'>
              <div className='space-y-1.5'><Label>Code *</Label><Input placeholder='RM' value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))}/></div>
              <div className='space-y-1.5'><Label>Short Code</Label><Input value={form.short_code||''} onChange={e=>setForm(f=>({...f,short_code:e.target.value}))}/></div>
              <div className='space-y-1.5'><Label>Name *</Label><Input placeholder='Raw Materials' value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'><Label>Display Name</Label><Input placeholder='For reports' value={form.display_name||''} onChange={e=>setForm(f=>({...f,display_name:e.target.value}))}/></div>
              <div className='space-y-1.5'><Label>Parent Group</Label>
                <Select value={form.parent_id||'none'} onValueChange={v=>setForm(f=>({...f,parent_id:v==='none'?null:v}))}>
                  <SelectTrigger><SelectValue placeholder='Root group'/></SelectTrigger>
                  <SelectContent><SelectItem value='none'>— Root Group —</SelectItem>
                    {groups.filter(g=>g.id!==edit?.id).map(g=><SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent></Select></div>
            </div>
            <Separator/>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'><Label>Category Type</Label>
                <Select value={form.category_type} onValueChange={v=>setForm(f=>({...f,category_type:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{CATEGORY_TYPES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className='space-y-1.5'><Label>Material Type</Label>
                <Select value={form.material_type} onValueChange={v=>setForm(f=>({...f,material_type:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{MATERIAL_TYPES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className='space-y-1.5'><Label>Stock Nature</Label>
                <Select value={form.stock_nature} onValueChange={v=>setForm(f=>({...f,stock_nature:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{STOCK_NATURES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className='space-y-1.5'><Label>Use For</Label>
                <Select value={form.use_for} onValueChange={v=>setForm(f=>({...f,use_for:v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{USE_FOR.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <Separator/>
            <div className='grid grid-cols-3 gap-4'>
              <div className='col-span-2 space-y-1.5'><Label>Costing Method (soft default)</Label>
                <Select value={form.costing_method} onValueChange={v=>setForm(f=>({...f,costing_method:v as CostingMethod}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{COSTING_METHODS.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
                <p className='text-xs text-muted-foreground'>Individual items can override this method</p>
              </div>
              <div className='space-y-1.5'><Label>ABC Class</Label>
                <Select value={form.movement_class||'none'} onValueChange={v=>setForm(f=>({...f,movement_class:v==='none'?null:v as 'A'|'B'|'C'}))}>
                  <SelectTrigger><SelectValue placeholder='Not classified'/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Not classified</SelectItem>
                    <SelectItem value='A'>A — High Value/Fast</SelectItem>
                    <SelectItem value='B'>B — Medium</SelectItem>
                    <SelectItem value='C'>C — Low Value/Slow</SelectItem>
                  </SelectContent></Select></div>
            </div>
            <div className='space-y-1.5'><Label>Movement Indicator</Label>
              <Select value={form.movement_indicator} onValueChange={v=>setForm(f=>({...f,movement_indicator:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{MOVE_INDS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select></div>
            <Separator/>
            <div className='flex gap-6 flex-wrap'>
              <label className='flex items-center gap-3 cursor-pointer'>
                <Switch checked={form.batch_grid_enabled} onCheckedChange={v=>setForm(f=>({...f,batch_grid_enabled:v}))}/>
                <div><p className='text-sm font-medium'>Batch Tracking</p><p className='text-xs text-muted-foreground'>Items inherit batch tracking</p></div>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <Switch checked={form.serial_grid_enabled} onCheckedChange={v=>setForm(f=>({...f,serial_grid_enabled:v}))}/>
                <div><p className='text-sm font-medium'>Serial Tracking</p><p className='text-xs text-muted-foreground'>Items inherit serial numbers</p></div>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <Switch checked={form.expiry_tracking} onCheckedChange={v=>setForm(f=>({...f,expiry_tracking:v}))}/>
                <div><p className='text-sm font-medium'>Expiry Tracking</p><p className='text-xs text-muted-foreground'>Mandatory expiry on inward</p></div>
              </label>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'><Label>Reorder Level</Label><Input type='number' value={form.reorder_level||''} onChange={e=>setForm(f=>({...f,reorder_level:parseFloat(e.target.value)||null}))}/></div>
              <div className='space-y-1.5'><Label>Effective From</Label><Input type='date' value={form.effective_from||''} onChange={e=>setForm(f=>({...f,effective_from:e.target.value}))}/></div>
            </div>
            <div className='space-y-1.5'><Label>Internal Notes</Label><Input value={form.internal_notes||''} onChange={e=>setForm(f=>({...f,internal_notes:e.target.value}))}/></div>
            <Separator/>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>GST Settings</h4>
            <p className='text-xs text-muted-foreground'>Leave blank to use individual item GST rates. Set a rate here to apply it as the default for all items in this group.</p>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'><Label>GST Type</Label>
                <Select value={form.gst_type||'none'} onValueChange={v=>setForm(f=>({...f,gst_type:v==='none'?null:v as StockGroupFormData['gst_type']}))}>
                  <SelectTrigger><SelectValue placeholder='Inherit from item'/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>— Inherit from item —</SelectItem>
                    <SelectItem value='taxable'>Taxable</SelectItem>
                    <SelectItem value='nil_rated'>Nil Rated</SelectItem>
                    <SelectItem value='exempt'>Exempt</SelectItem>
                    <SelectItem value='zero_rated'>Zero Rated</SelectItem>
                    <SelectItem value='non_gst'>Non-GST</SelectItem>
                  </SelectContent></Select></div>
              <div className='space-y-1.5'><Label>IGST Rate (%)</Label>
                <Input type='number' value={form.igst_rate??''} onKeyDown={onEnterNext} onChange={e=>{
                  const v=parseFloat(e.target.value)||null;
                  setForm(f=>({...f,igst_rate:v,cgst_rate:v?v/2:null,sgst_rate:v?v/2:null}));
                }}/></div>
            </div>
            {form.gst_type==='taxable'&&(
              <div className='space-y-1.5'><Label>Cess Rate (%)</Label>
                <Input type='number' value={form.cess_rate??''} onKeyDown={onEnterNext} onChange={e=>setForm(f=>({...f,cess_rate:parseFloat(e.target.value)||null}))}/></div>
            )}
          </div>
          <DialogFooter><Button variant='outline' onClick={()=>setOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSave}>{edit?'Update':'Create'} Group</Button></DialogFooter>
        </DialogContent></Dialog>
    </div>
  );
}

export default function StockMatrix(){
  return(<SidebarProvider><div className='min-h-screen flex flex-col w-full bg-background'>
    <ERPHeader/><main className='flex-1'><StockMatrixPanel/></main>
  </div></SidebarProvider>);
}
