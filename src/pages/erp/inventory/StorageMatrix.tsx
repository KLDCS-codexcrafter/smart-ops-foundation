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
import { Warehouse, Plus, Search, Edit2, Trash2, MapPin, Phone, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Godown, GodownAgreement, GodownOwnershipType, GodownDepartmentCode } from '@/types/godown';
import { OWNERSHIP_LABELS, RENTED_TYPES, DEPARTMENT_LABELS, DEPARTMENT_BADGE_COLORS } from '@/types/godown';
import { useSAMPersons } from '@/hooks/useSAMPersons';
import { useProjectCentres } from '@/hooks/useProjectCentres';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';

const STATES=['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh','Dadra & Nagar Haveli','Daman & Diu','Andaman & Nicobar Islands'];
const OWN_C:Record<string,string>={own_own_stock:'bg-emerald-500/10 text-emerald-700',own_third_party_stock:'bg-blue-500/10 text-blue-700',third_party_our_stock:'bg-amber-500/10 text-amber-700',third_party_third_party_stock:'bg-slate-500/10 text-slate-600',job_work_location:'bg-purple-500/10 text-purple-700',consignment_at_dealer:'bg-cyan-500/10 text-cyan-700',cwc_swc_godown:'bg-orange-500/10 text-orange-700',customs_bonded:'bg-red-500/10 text-red-700',sez_ftz:'bg-indigo-500/10 text-indigo-700'};
const GKEY='erp_godowns';
// [JWT] GET /api/entity/storage/:key
const load=():Godown[]=>{try{return JSON.parse(localStorage.getItem(GKEY)||'[]');}catch{return[];}};
const BG={code:'',name:'',ownership_type:'own_own_stock' as GodownOwnershipType,party_name:'',address:'',city:'',state:'Maharashtra',pincode:'',country:'India',total_capacity:null as number|null,capacity_unit:'sqft',contact_person:'',contact_phone:'',contact_email:'',gst_number:'',description:'',
  // Sprint T-Phase-1.2.1 · Departmental accountability
  department_code:null as GodownDepartmentCode|null,
  responsible_person_id:null as string|null,
  responsible_person_name:null as string|null,
  is_virtual:false,
  requires_issue_note:false,
  project_centre_id:null as string|null,
};
const BA={agreement_number:'',lessor_name:'',lessor_gstin:'',lessor_pan:'',start_date:'',end_date:'',notice_period_days:null as number|null,lock_in_months:null as number|null,auto_renewal:false,monthly_rent:null as number|null,security_deposit:null as number|null,charge_type:'fixed' as GodownAgreement['charge_type'],rate:null as number|null,billing_cycle:'monthly' as GodownAgreement['billing_cycle'],escalation_rate:null as number|null,tds_applicable:false,tds_section:'194-I',tds_rate:null as number|null,license_type:'general',license_number:'',license_expiry:'',insurance_policy:'',insurance_expiry:''};

export function StorageMatrixPanel(){
    const [godowns,setGodowns]=useState<Godown[]>(load()); // [JWT] GET /api/inventory/godowns
    const [search,setSearch]=useState('');
    const [open,setOpen]=useState(false);
    const [edit,setEdit]=useState<Godown|null>(null);
    const [gf,setGf]=useState(BG);
    const [af,setAf]=useState(BA);
    const [showA,setShowA]=useState(false);

    // [JWT] PATCH /api/entity/storage/:key
    const sv=(d:Godown[])=>{localStorage.setItem(GKEY,JSON.stringify(d));};// [JWT] CRUD /api/inventory/godowns
    const isRented=(ot:GodownOwnershipType)=>RENTED_TYPES.includes(ot);
    const checkTDS=(rent:number|null)=>{
        if(rent&&rent*12>240000){setAf(f=>({...f,tds_applicable:true,tds_section:'194-I',tds_rate:10}));
            toast.warning('Annual rent > ₹2,40,000 — TDS (Section 194-I) auto-flagged at 10%'); // [JWT] GET /api/compliance/tds-rules/194-I
        }
    };
    const openC=()=>{setGf(BG);setAf(BA);setShowA(false);setEdit(null);setOpen(true);};
    const openE=(g:Godown)=>{
        setGf({code:g.code,name:g.name,ownership_type:g.ownership_type,party_name:g.party_name||'',address:g.address||'',city:g.city||'',state:g.state||'Maharashtra',pincode:g.pincode||'',country:g.country||'India',total_capacity:g.total_capacity||null,capacity_unit:g.capacity_unit||'sqft',contact_person:g.contact_person||'',contact_phone:g.contact_phone||'',contact_email:g.contact_email||'',gst_number:g.gst_number||'',description:g.description||''});
        const ag=g.agreements?.[0];
        setAf(ag?
        {agreement_number:ag.agreement_number,lessor_name:ag.lessor_name,lessor_gstin:ag.lessor_gstin||'',lessor_pan:ag.lessor_pan||'',start_date:ag.start_date,end_date:ag.end_date||'',notice_period_days:ag.notice_period_days||null,lock_in_months:ag.lock_in_months||null,auto_renewal:ag.auto_renewal,monthly_rent:ag.monthly_rent||null,security_deposit:ag.security_deposit||null,charge_type:ag.charge_type,rate:ag.rate||null,billing_cycle:ag.billing_cycle,escalation_rate:ag.escalation_rate||null,tds_applicable:ag.tds_applicable,tds_section:ag.tds_section||'194-I',tds_rate:ag.tds_rate||null,license_type:ag.license_type||'general',license_number:ag.license_number||'',license_expiry:ag.license_expiry||'',insurance_policy:ag.insurance_policy||'',insurance_expiry:ag.insurance_expiry||''}:BA);
        setShowA(isRented(g.ownership_type));setEdit(g);setOpen(true);
    };
    const handleSave=()=>{
        if(!gf.code.trim()||!gf.name.trim()){toast.error('Code and Name required');return;}
        const agreements:GodownAgreement[]=showA&&af.agreement_number?[{...af,id:`agr-${Date.now()}`,godown_id:edit?.id||'',status:'active' as const,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}]:(edit?.agreements||[]);
        if(edit){
            const u=godowns.map(g=>g.id===edit.id?{...g,...gf,agreements,updated_at:new Date().toISOString()}:g);
            setGodowns(u);sv(u);toast.success(`${gf.name} updated`); // [JWT] PATCH /api/inventory/godowns/:id
        } else {
            const ng:Godown={...gf,id:`gdn-${Date.now()}`,status:'active',zones:[],agreements,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
            const u=[ng,...godowns];setGodowns(u);sv(u);toast.success(`${gf.name} created`); // [JWT] POST /api/inventory/godowns
        }
        setOpen(false);
    };
    const fil=godowns.filter(g=>g.name.toLowerCase().includes(search.toLowerCase())||
    g.code.toLowerCase().includes(search.toLowerCase()));

    return (
    <div data-keyboard-form className='max-w-5xl mx-auto space-y-6 p-6'>
    <div className='flex items-center justify-between'>
    <div><h1 className='text-2xl font-bold flex items-center gap-2'><Warehouse className='h-6 w-6'/>Storage Matrix</h1>
    <p className='text-sm text-muted-foreground'>Godown hierarchy — 5 levels optional (Godown → Zone → Rack → Shelf → Bin)</p></div>
    <Button data-primary size='sm' className='gap-1.5' onClick={openC}><Plus className='h-4 w-4'/>Add Godown</Button>
    </div>
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
    <Card><CardHeader className='pb-2'><CardDescription>Total Godowns</CardDescription><CardTitle className='text-2xl'>{godowns.length}</CardTitle></CardHeader></Card>
    <Card><CardHeader className='pb-2'><CardDescription>Active</CardDescription><CardTitle className='text-2xl text-emerald-600'>{godowns.filter(g=>g.status==='active').length}</CardTitle></CardHeader></Card>
    <Card><CardHeader className='pb-2'><CardDescription>Own Premises</CardDescription><CardTitle className='text-2xl'>{godowns.filter(g=>g.ownership_type.startsWith('own_')).length}</CardTitle></CardHeader></Card>
    <Card><CardHeader className='pb-2'><CardDescription>Rented / 3rd Party</CardDescription><CardTitle className='text-2xl text-amber-600'>{godowns.filter(g=>RENTED_TYPES.includes(g.ownership_type)).length}</CardTitle></CardHeader></Card>
    </div>
    <div className='flex items-center gap-4'><div className='relative flex-1 max-w-sm'><Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground'/><Input className='pl-8 h-9' placeholder='Search godowns...' value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    <Card><CardContent className='p-0'><Table>
    <TableHeader><TableRow className='bg-muted/40 hover:bg-muted/40'>
    {['Code','Name','Ownership','Location','Phone','GST','Status',''].map(h=><TableHead key={h} className='text-xs font-semibold uppercase tracking-wider'>{h}</TableHead>)}
    </TableRow></TableHeader>
    <TableBody>
    {fil.length===0?(<TableRow><TableCell colSpan={8} className='text-center py-16 text-muted-foreground'>
    <Warehouse className='h-10 w-10 mx-auto mb-3 opacity-20'/>
    <p className='text-sm font-semibold mb-1 text-foreground'>No godowns</p><Button data-primary size='sm' className='mt-2' onClick={openC}><Plus className='h-4 w-4 mr-1'/>Add Godown</Button>
    </TableCell></TableRow>):fil.map(g=>(
    <TableRow key={g.id} className='group'>
    <TableCell><Badge variant='secondary' className='font-mono text-xs'>{g.code}</Badge></TableCell>
    <TableCell className='font-medium text-sm'>{g.name}</TableCell>
    <TableCell><Badge className={`text-xs ${OWN_C[g.ownership_type]||''}`}>{OWNERSHIP_LABELS[g.ownership_type]}</Badge></TableCell>
    <TableCell>{(g.city||g.state)&&<div className='flex items-center gap-1 text-xs text-muted-foreground'><MapPin className='h-3 w-3'/>{[g.city,g.state].filter(Boolean).join(', ')}</div>}</TableCell>
    <TableCell>{g.contact_phone&&<div className='flex items-center gap-1 text-xs text-muted-foreground'><Phone className='h-3 w-3'/>{g.contact_phone}</div>}</TableCell>
    <TableCell className='font-mono text-xs text-muted-foreground'>{g.gst_number||'—'}</TableCell>
    <TableCell><Badge className={`text-xs ${g.status==='active'?'bg-emerald-500/10 text-emerald-700':'bg-slate-500/10 text-slate-500'}`}>{g.status}</Badge></TableCell>
    <TableCell><div className='flex gap-1 opacity-0 group-hover:opacity-100'>
    <Button variant='ghost' size='icon' className='h-7 w-7' onClick={()=>openE(g)}><Edit2 className='h-3.5 w-3.5 text-muted-foreground'/></Button>
    <Button variant='ghost' size='icon' className='h-7 w-7' onClick={()=>{const u=godowns.filter(x=>x.id!==g.id);setGodowns(u);sv(u);toast.success(`${g.name} deleted`);}}><Trash2 className='h-3.5 w-3.5 text-destructive'/></Button>
    </div></TableCell>
    </TableRow>))}
    </TableBody></Table></CardContent></Card>

    <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
    <DialogHeader><DialogTitle>{edit?`Edit: ${edit.name}`:'New Godown'}</DialogTitle>
    <DialogDescription>Physical storage location details</DialogDescription></DialogHeader>
    <Tabs defaultValue='details'>
    <TabsList><TabsTrigger value='details'>Details</TabsTrigger><TabsTrigger value='contact'>Contact & Capacity</TabsTrigger>{showA&&<TabsTrigger value='agreement'>Rental Agreement</TabsTrigger>}</TabsList>

    <TabsContent value='details' className='space-y-4 mt-4'>
    <div data-keyboard-form className='grid grid-cols-3 gap-4'>
    <div className='space-y-1.5'><Label>Code *</Label><Input placeholder='GDN-MUM-01' value={gf.code} onChange={e=>setGf(f=>({...f,code:e.target.value.toUpperCase()}))}/></div>
    <div className='col-span-2 space-y-1.5'><Label>Name *</Label><Input placeholder='Mumbai Main Warehouse' value={gf.name} onChange={e=>setGf(f=>({...f,name:e.target.value}))}/></div>
    </div>
    <div className='space-y-1.5'><Label>Ownership Type</Label>
    <Select value={gf.ownership_type} onValueChange={v=>{const ot=v as GodownOwnershipType;setGf(f=>({...f,ownership_type:ot}));setShowA(isRented(ot));}}>
    <SelectTrigger><SelectValue/></SelectTrigger>
    <SelectContent>{(Object.keys(OWNERSHIP_LABELS) as GodownOwnershipType[]).map(k=><SelectItem key={k} value={k}>{OWNERSHIP_LABELS[k]}</SelectItem>)}</SelectContent>
    </Select>
    {showA&&<p className='text-xs text-amber-600 flex items-center gap-1 mt-1'><AlertTriangle className='h-3 w-3'/>Rental agreement section activated</p>}
    </div>
    <Separator/>
    <div className='space-y-1.5'><Label>Address</Label><Input placeholder='Street / Survey No / Plot No' value={gf.address} onChange={e=>setGf(f=>({...f,address:e.target.value}))}/></div>
    <div className='grid grid-cols-3 gap-4'>
      <div className='space-y-1.5'><Label>City</Label><Input placeholder='Mumbai' value={gf.city} onChange={e=>setGf(f=>({...f,city:e.target.value}))}/></div>
      <div className='space-y-1.5'><Label>State</Label><Select value={gf.state} onValueChange={v=>setGf(f=>({...f,state:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{STATES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
      <div className='space-y-1.5'><Label>PIN Code</Label><Input placeholder='400001' maxLength={6} value={gf.pincode} onChange={e=>setGf(f=>({...f,pincode:e.target.value.replace(/\D/g,'').slice(0,6)}))}/></div>
    </div>
    <div className='space-y-1.5'><Label>GST Number of this Location</Label>
      <Input placeholder='27AABCU9603R1ZX' value={gf.gst_number} onChange={e=>setGf(f=>({...f,gst_number:e.target.value.toUpperCase()}))}/>
      <p className='text-xs text-muted-foreground'>Must match GSTN Additional Place of Business for e-way bills</p>
    </div>
    <div className='space-y-1.5'><Label>Description</Label><Input value={gf.description} onChange={e=>setGf(f=>({...f,description:e.target.value}))}/></div>
    </TabsContent>

    <TabsContent value='contact' className='space-y-4 mt-4'>
    <div className='grid grid-cols-3 gap-4'>
      <div className='space-y-1.5'><Label>Contact Person</Label><Input value={gf.contact_person} onChange={e=>setGf(f=>({...f,contact_person:e.target.value}))}/></div>
      <div className='space-y-1.5'><Label>Phone</Label><Input maxLength={10} value={gf.contact_phone} onChange={e=>setGf(f=>({...f,contact_phone:e.target.value.replace(/\D/g,'').slice(0,10)}))}/></div>
      <div className='space-y-1.5'><Label>Email</Label><Input value={gf.contact_email} onChange={e=>setGf(f=>({...f,contact_email:e.target.value}))}/></div>
    </div>
    <Separator/>
    <div className='grid grid-cols-2 gap-4'>
      <div className='space-y-1.5'><Label>Total Capacity</Label><Input type='number' value={gf.total_capacity||''} onChange={e=>setGf(f=>({...f,total_capacity:parseFloat(e.target.value)||null}))}/></div>
      <div className='space-y-1.5'><Label>Unit</Label><Select value={gf.capacity_unit} onValueChange={v=>setGf(f=>({...f,capacity_unit:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['sqft','sqm','cubic_meter','pallets','quintals','MT'].map(u=><SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
    </div>
    </TabsContent>

    {showA&&(<TabsContent value='agreement' className='space-y-4 mt-4'>
    <div className='grid grid-cols-2 gap-4'>
      <div className='space-y-1.5'><Label>Agreement Number</Label><Input placeholder='WH/RENT/2024-25/001' value={af.agreement_number} onChange={e=>setAf(f=>({...f,agreement_number:e.target.value}))}/></div>
      <div className='space-y-1.5'><Label>Lessor Name</Label><Input value={af.lessor_name} onChange={e=>setAf(f=>({...f,lessor_name:e.target.value}))}/></div>
      <div className='space-y-1.5'><Label>Lessor GSTIN (ITC)</Label><Input placeholder='18% GST eligible for ITC' value={af.lessor_gstin} onChange={e=>setAf(f=>({...f,lessor_gstin:e.target.value.toUpperCase()}))}/></div>
      <div className='space-y-1.5'><Label>Lessor PAN (TDS)</Label><Input value={af.lessor_pan} onChange={e=>setAf(f=>({...f,lessor_pan:e.target.value.toUpperCase()}))}/></div>
      <div className='space-y-1.5'><Label>Start Date</Label><Input type='date' value={af.start_date} onChange={e=>setAf(f=>({...f,start_date:e.target.value}))}/></div>
      <div className='space-y-1.5'><Label>End Date</Label><Input type='date' value={af.end_date} onChange={e=>setAf(f=>({...f,end_date:e.target.value}))}/></div>
    </div>
    <Separator/>
    <div className='grid grid-cols-3 gap-4'>
      <div className='space-y-1.5'><Label>Monthly Rent (₹)</Label>
        <Input type='number' value={af.monthly_rent||''} onChange={e=>{const r=parseFloat(e.target.value)||null;setAf(f=>({...f,monthly_rent:r}));checkTDS(r);}}/></div>
      <div className='space-y-1.5'><Label>Security Deposit (₹)</Label><Input type='number' value={af.security_deposit||''} onChange={e=>setAf(f=>({...f,security_deposit:parseFloat(e.target.value)||null}))}/></div>
      <div className='space-y-1.5'><Label>Billing Cycle</Label><Select value={af.billing_cycle} onValueChange={v=>setAf(f=>({...f,billing_cycle:v as typeof f.billing_cycle}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['monthly','quarterly','annual'].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
      <div className='space-y-1.5'><Label>Escalation %/Year</Label><Input type='number' placeholder='5' value={af.escalation_rate||''} onChange={e=>setAf(f=>({...f,escalation_rate:parseFloat(e.target.value)||null}))}/></div>
      <div className='space-y-1.5'><Label>Notice Period (days)</Label><Input type='number' placeholder='30' value={af.notice_period_days||''} onChange={e=>setAf(f=>({...f,notice_period_days:parseInt(e.target.value)||null}))}/></div>
      <div className='space-y-1.5'><Label>Lock-in (months)</Label><Input type='number' placeholder='12' value={af.lock_in_months||''} onChange={e=>setAf(f=>({...f,lock_in_months:parseInt(e.target.value)||null}))}/></div>
    </div>
    <Separator/>
    <label className='flex items-center gap-3 cursor-pointer border rounded-lg p-3'>
      <Switch checked={af.tds_applicable} onCheckedChange={v=>setAf(f=>({...f,tds_applicable:v}))}/>
      <div>
        <p className='text-sm font-medium'>TDS Applicable (Section 194-I)</p>
        <p className='text-xs text-muted-foreground'>Auto-flagged when annual rent exceeds ₹2,40,000. 10% on building, 2% on machinery</p>
      </div>
    </label>
    {af.tds_applicable&&(<div className='grid grid-cols-2 gap-4'>
      <div className='space-y-1.5'><Label>TDS Section</Label><Select value={af.tds_section||'194-I'} onValueChange={v=>setAf(f=>({...f,tds_section:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value='194-I'>194-I Building/Land (10%)</SelectItem><SelectItem value='194-IB'>194-IB Individual Landlord (5%)</SelectItem><SelectItem value='194-I-plant'>194-I Plant/Machinery (2%)</SelectItem></SelectContent></Select></div>
      <div className='space-y-1.5'><Label>TDS Rate (%)</Label><Input type='number' value={af.tds_rate||''} onChange={e=>setAf(f=>({...f,tds_rate:parseFloat(e.target.value)||null}))}/></div>
    </div>)}
    <Separator/>
    <div className='grid grid-cols-2 gap-4'>
      <div className='space-y-1.5'><Label>License Type</Label><Select value={af.license_type||'general'} onValueChange={v=>setAf(f=>({...f,license_type:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['general','FSSAI','Drug License','CWC Receipt','Bonded Warehouse','SEZ'].map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
      <div className='space-y-1.5'><Label>License Number</Label><Input value={af.license_number} onChange={e=>setAf(f=>({...f,license_number:e.target.value}))}/></div>
      <div className='space-y-1.5'><Label>License Expiry</Label><Input type='date' value={af.license_expiry} onChange={e=>setAf(f=>({...f,license_expiry:e.target.value}))}/></div>
      <div className='space-y-1.5'><Label>Insurance Policy No</Label><Input value={af.insurance_policy} onChange={e=>setAf(f=>({...f,insurance_policy:e.target.value}))}/></div>
      <div className='space-y-1.5'><Label>Insurance Expiry</Label><Input type='date' value={af.insurance_expiry} onChange={e=>setAf(f=>({...f,insurance_expiry:e.target.value}))}/></div>
    </div>
    </TabsContent>)}
    </Tabs>
    <DialogFooter className='mt-4'><Button variant='outline' onClick={()=>setOpen(false)}>Cancel</Button><Button data-primary onClick={handleSave}>{edit?'Update':'Create'} Godown</Button></DialogFooter>
    </DialogContent></Dialog>
    </div>
    );
}

export default function StorageMatrix(){
 return(<SidebarProvider><div className='min-h-screen flex flex-col w-full bg-background'>
<ERPHeader/><main className='flex-1'><StorageMatrixPanel/></main>
</div></SidebarProvider>);
}
