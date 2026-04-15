import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wifi, Plus, Search, Edit2, Trash2, Radio, Zap, Info, Tag, Activity, ScanLine, Package, MapPin, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { RFIDTag, RFIDTagStatus, RFIDEvent } from '@/types/rfid-tag';
import { onEnterNext } from '@/lib/keyboard';

const TAG_KEY = 'erp_rfid_tags';
const EVT_KEY = 'erp_rfid_events';
// [JWT] GET /api/entity/storage/:key
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
// [JWT] PATCH /api/entity/storage/:key
const sv = <T,>(k: string, d: T[]) => { localStorage.setItem(k, JSON.stringify(d)); };

const ITEM_KEY = 'erp_inventory_items';

const STATUS_COLORS: Record<RFIDTagStatus, string> = {
  unassigned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  read: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  decommissioned: 'bg-muted text-muted-foreground',
};

const STATUSES: RFIDTagStatus[] = ['unassigned', 'assigned', 'read', 'lost', 'decommissioned'];

interface ItemResult { id: string; code: string; name: string; }

const BLANK: Omit<RFIDTag, 'id' | 'created_at' | 'updated_at'> = {
  tag_uid: '', item_id: null, item_code: null, item_name: null,
  serial_number: null, batch_number: null, godown_id: null, godown_name: null,
  bin_label_id: null, assigned_date: null, last_read_date: null,
  last_read_location: null, status: 'unassigned', notes: null,
};

export function RFIDManagerPanel() {
  const [tags, setTags] = useState<RFIDTag[]>(ls<RFIDTag>(TAG_KEY));
  const [events, setEvents] = useState<RFIDEvent[]>(ls<RFIDEvent>(EVT_KEY));
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);

  // Items from inventory
  const allItems: ItemResult[] = useMemo(() => {
    const raw = ls<any>(ITEM_KEY);
    return raw.map((i: any) => ({ id: i.id, code: i.code, name: i.name }));
  }, []);

  const itemResults = useMemo(() => {
    if (!itemSearch.trim()) return [];
    const q = itemSearch.toLowerCase();
    return allItems.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)).slice(0, 20);
  }, [itemSearch, allItems]);

  // Godowns
  const godowns = useMemo(() => {
    // [JWT] GET /api/entity/storage/:key
    try { return JSON.parse(localStorage.getItem('erp_godowns') || '[]') as { id: string; name: string }[]; } catch { return []; }
  }, []);

  // Stats
  const total = tags.length;
  const assigned = tags.filter(t => t.status === 'assigned').length;
  const lastRead = tags.filter(t => t.status === 'read').length;
  const eventCount = events.length;

  // Filtered tags
  const filtered = useMemo(() => {
    if (!search.trim()) return tags;
    const q = search.toLowerCase();
    return tags.filter(t =>
      t.tag_uid.toLowerCase().includes(q) ||
      (t.item_name || '').toLowerCase().includes(q) ||
      (t.item_code || '').toLowerCase().includes(q)
    );
  }, [tags, search]);

  const openCreate = () => {
    setEditId(null); setForm({ ...BLANK }); setItemSearch(''); setShowItemPicker(false); setOpen(true);
  };

  const openEdit = (t: RFIDTag) => {
    setEditId(t.id);
    const { id, created_at, updated_at, ...rest } = t;
    setForm(rest); setItemSearch(''); setShowItemPicker(false); setOpen(true);
  };

  const handleSave = () => {
    if (!form.tag_uid.trim()) { toast.error('Tag UID is required'); return; }
    const now = new Date().toISOString();
    if (editId) {
      const u = tags.map(x => x.id === editId ? { ...x, ...form, updated_at: now } : x);
      setTags(u); sv(TAG_KEY, u);
      toast.success('RFID tag updated');
      // [JWT] PATCH /api/rfid/tags/:id
    } else {
      const t: RFIDTag = { ...form, id: crypto.randomUUID(), created_at: now, updated_at: now };
      const u = [t, ...tags]; setTags(u); sv(TAG_KEY, u);
      toast.success('RFID tag registered');
      // [JWT] POST /api/rfid/tags
    }
    setOpen(false);
  };

  const deleteTag = (id: string) => {
    const u = tags.filter(x => x.id !== id); setTags(u); sv(TAG_KEY, u);
    toast.success('RFID tag deleted');
    // [JWT] DELETE /api/rfid/tags/:id
  };

  const simulateWrite = (t: RFIDTag) => {
    toast.success(`RFID Write simulated for ${t.tag_uid}`, { description: '[JWT] POST /api/rfid/write — hardware integration required' });
    // [JWT] POST /api/rfid/write
  };

  const simulateRead = (t: RFIDTag) => {
    const now = new Date().toISOString();
    const updated = tags.map(x => x.id === t.id ? { ...x, status: 'read' as RFIDTagStatus, last_read_date: now, last_read_location: 'Warehouse Gate', updated_at: now } : x);
    setTags(updated); sv(TAG_KEY, updated);

    const evt: RFIDEvent = {
      id: crypto.randomUUID(), tag_uid: t.tag_uid, event_type: 'read',
      location: 'Warehouse Gate', reader_id: 'SIM-READER-01', timestamp: now,
    };
    const newEvents = [evt, ...events]; setEvents(newEvents); sv(EVT_KEY, newEvents);
    toast.success(`Read simulated: ${t.tag_uid} at Warehouse Gate`);
    // [JWT] POST /api/rfid/events
  };

  const startBulkScan = () => {
    toast.info('Bulk Scan initiated (simulated)', { description: '[JWT] POST /api/rfid/bulk-scan — requires connected RFID reader hardware' });
    // [JWT] POST /api/rfid/bulk-scan
  };

  const selectItem = (item: ItemResult) => {
    setForm(f => ({ ...f, item_id: item.id, item_code: item.code, item_name: item.name }));
    setShowItemPicker(false); setItemSearch('');
  };

  const eventTypeBadge = (t: RFIDEvent['event_type']) => {
    const c = t === 'write' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      : t === 'read' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    return <Badge className={c}>{t}</Badge>;
  };

  return (
    <div data-keyboard-form className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wifi className="h-6 w-6" />RFID Manager</h1>
        <p className="text-sm text-muted-foreground">RFID tag registration, read simulation & bulk scanning</p>
      </div>

      {/* Hardware Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Hardware Integration via API</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            RFID read/write operations require connected hardware (readers, antennas). This interface provides tag management and simulated events.
            When hardware is connected, events stream via <span className="font-mono">[JWT] GET /api/rfid/events/stream</span>.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Tags</CardDescription><CardTitle className="text-2xl">{total}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Registered RFID tags</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Assigned</CardDescription><CardTitle className="text-2xl text-blue-600">{assigned}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Linked to items</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Last Read</CardDescription><CardTitle className="text-2xl text-green-600">{lastRead}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Successfully scanned</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Read Events</CardDescription><CardTitle className="text-2xl">{eventCount}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Total event log entries</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tags">
        <TabsList>
          <TabsTrigger value="tags">RFID Tags</TabsTrigger>
          <TabsTrigger value="events">Read Events</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Scan</TabsTrigger>
        </TabsList>

        {/* === RFID Tags Tab === */}
        <TabsContent value="tags" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tag UID, item name or code..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button data-primary onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Register Tag</Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag UID</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Serial / Batch</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Read</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No RFID tags registered</TableCell></TableRow>
                )}
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell><span className="font-mono text-xs">{t.tag_uid}</span></TableCell>
                    <TableCell>
                      {t.item_name ? (
                        <div><p className="text-sm font-medium">{t.item_name}</p><p className="text-xs text-muted-foreground">{t.item_code}</p></div>
                      ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {t.serial_number && <p>SN: {t.serial_number}</p>}
                        {t.batch_number && <p>Batch: {t.batch_number}</p>}
                        {!t.serial_number && !t.batch_number && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.godown_name || t.last_read_location ? (
                        <div className="text-xs">
                          {t.godown_name && <p>{t.godown_name}</p>}
                          {t.last_read_location && <p className="text-muted-foreground">{t.last_read_location}</p>}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {t.last_read_date ? <span className="text-xs">{new Date(t.last_read_date).toLocaleDateString()}</span> : <span className="text-xs text-muted-foreground">Never</span>}
                    </TableCell>
                    <TableCell><Badge className={STATUS_COLORS[t.status]}>{t.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" title="Simulate Write" onClick={() => simulateWrite(t)}><Radio className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600" title="Simulate Read" onClick={() => simulateRead(t)}><Zap className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => openEdit(t)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Delete" onClick={() => deleteTag(t.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* === Read Events Tab === */}
        <TabsContent value="events" className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {/* [JWT] In production, events stream live from hardware via GET /api/rfid/events/stream (WebSocket/SSE) */}
            Event log — in production, live events stream from connected RFID readers via WebSocket.
          </p>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag UID</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reader ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No read events yet — simulate a read from the Tags tab</TableCell></TableRow>
                )}
                {events.map(e => (
                  <TableRow key={e.id}>
                    <TableCell><span className="font-mono text-xs">{e.tag_uid}</span></TableCell>
                    <TableCell>{eventTypeBadge(e.event_type)}</TableCell>
                    <TableCell className="text-sm">{e.location || '—'}</TableCell>
                    <TableCell><span className="font-mono text-xs">{e.reader_id || '—'}</span></TableCell>
                    <TableCell className="text-xs">{new Date(e.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* === Bulk Scan Tab === */}
        <TabsContent value="bulk" className="space-y-6">
          {/* Scan zone */}
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center space-y-4">
            <Radio className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">Bulk RFID Scan</p>
              <p className="text-sm text-muted-foreground mt-1">Connect an RFID reader and initiate a bulk scan to capture all tags in range.</p>
              <p className="text-xs text-muted-foreground mt-1">Scanned tags will be matched against registered inventory and flagged for discrepancies.</p>
            </div>
            <Button size="lg" onClick={startBulkScan}><ScanLine className="h-4 w-4 mr-2" />Start Bulk Scan</Button>
          </div>

          {/* Use case cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Cycle Count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Walk through warehouse with handheld reader to verify stock quantities against system records.</p>
                <p className="text-xs font-mono text-muted-foreground mt-2">[JWT] POST /api/rfid/bulk-scan/cycle-count</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Gate Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Fixed gate readers auto-detect tagged items entering or leaving warehouses and production zones.</p>
                <p className="text-xs font-mono text-muted-foreground mt-2">[JWT] POST /api/rfid/bulk-scan/gate-track</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Lost Asset Search</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Scan an area to locate assets marked as lost or missing. Matches against tags with 'lost' status.</p>
                <p className="text-xs font-mono text-muted-foreground mt-2">[JWT] POST /api/rfid/bulk-scan/lost-search</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* === Register / Edit Dialog === */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit RFID Tag' : 'Register RFID Tag'}</DialogTitle>
            <DialogDescription>{editId ? 'Update tag details' : 'Register a new RFID tag and optionally assign it to an item'}</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-4">
            {/* Tag UID */}
            <div className="space-y-1.5">
              <Label>Tag UID *</Label>
              <Input placeholder="e.g. E2003412AD…" className="font-mono uppercase" value={form.tag_uid}
                onChange={e => setForm(f => ({ ...f, tag_uid: e.target.value.toUpperCase() }))} />
            </div>

            {/* Item picker */}
            <div className="space-y-1.5">
              <Label>Assign to Item</Label>
              {form.item_id ? (
                <div className="flex items-center gap-2 p-2 rounded border bg-muted/50">
                  <div className="flex-1"><p className="text-sm font-medium">{form.item_name}</p><p className="text-xs text-muted-foreground">{form.item_code}</p></div>
                  <Button size="sm" variant="outline" onClick={() => { setForm(f => ({ ...f, item_id: null, item_code: null, item_name: null })); setShowItemPicker(true); }}>Change</Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search items..." className="pl-9" value={itemSearch}
                    onFocus={() => setShowItemPicker(true)}
                    onChange={e => { setItemSearch(e.target.value); setShowItemPicker(true); }} />
                  {showItemPicker && itemResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                      {itemResults.map(i => (
                        <button key={i.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onClick={() => selectItem(i)}>
                          <span className="font-medium">{i.name}</span> <span className="text-muted-foreground text-xs">({i.code})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Serial / Batch */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Serial Number</Label>
                <Input placeholder="SN-..." value={form.serial_number || ''} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Batch Number</Label>
                <Input placeholder="BATCH-..." value={form.batch_number || ''} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value || null }))} />
              </div>
            </div>

            {/* Godown */}
            <div className="space-y-1.5">
              <Label>Godown / Warehouse</Label>
              <Select value={form.godown_id || 'none'} onValueChange={v => {
                const g = godowns.find(x => x.id === v);
                setForm(f => ({ ...f, godown_id: v === 'none' ? null : v, godown_name: g?.name || null }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select godown..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as RFIDTagStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSave}>{editId ? 'Update' : 'Register Tag'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RFIDManager() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><RFIDManagerPanel /></main>
      </div>
    </SidebarProvider>
  );
}
