/**
 * AssetMaster.tsx — Pay Hub Asset Master · Sprint 4
 * Two-tab screen: Asset Directory + Barcode Labels
 */
import { useState, useMemo, useCallback } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import {
  Box, Package, Search, Plus, Edit2, UserPlus, RotateCcw,
  Printer, QrCode, CheckSquare, Square, History,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAssetMaster } from '@/hooks/useAssetMaster';
import type { Asset, AssetCategory, AssetCondition } from '@/types/asset-master';
import { BLANK_ASSET, ASSET_CATEGORY_LABELS, ASSET_STATUS_COLORS } from '@/types/asset-master';
import type { Employee } from '@/types/employee';
import { EMPLOYEES_KEY } from '@/types/employee';
import { onEnterNext, useCtrlS, amountInputProps, toIndianFormat, fromIndianFormat } from '@/lib/keyboard';

const CATEGORY_OPTIONS = Object.entries(ASSET_CATEGORY_LABELS) as [AssetCategory, string][];
const CONDITION_OPTIONS: { value: AssetCondition; label: string }[] = [
  { value: 'new', label: 'New' }, { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' }, { value: 'damaged', label: 'Damaged' },
];
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'available', label: 'Available' }, { value: 'assigned', label: 'Assigned' },
  { value: 'under_repair', label: 'Under Repair' }, { value: 'disposed', label: 'Disposed' },
  { value: 'missing', label: 'Missing' },
];

export function AssetMasterPanel() {
  const { assets, stats, createAsset, updateAsset, assignAsset, returnAsset } = useAssetMaster();

  // ── Sheet (create/edit) state ───────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [customCode, setCustomCode] = useState('');
  const [form, setForm] = useState({ ...BLANK_ASSET });

  // ── Assign Dialog state ─────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState('');
  const [assignForm, setAssignForm] = useState({
    employeeId: '', employeeCode: '', employeeName: '',
    assignedDate: new Date().toISOString().slice(0, 10),
    condition: 'good' as AssetCondition, notes: '',
  });

  // ── Return Dialog state ─────────────────────────────────────────
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTargetId, setReturnTargetId] = useState('');
  const [returnForm, setReturnForm] = useState({
    returnDate: new Date().toISOString().slice(0, 10),
    conditionIn: 'good' as AssetCondition, notes: '',
  });

  // ── History expand state ────────────────────────────────────────
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // ── Barcode label selection ─────────────────────────────────────
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());

  // ── Filters ─────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Cross-module: active employees for Assign dropdown ──────────
  const activeEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (raw) {
        const all: Employee[] = JSON.parse(raw);
        return all.filter(e => e.status === 'active');
      }
    } catch { /* ignore */ }
    return [];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Company name for barcode labels ─────────────────────────────
  const companyName = useMemo(() => {
    try {
      // [JWT] GET /api/foundation/parent-company
      const raw = localStorage.getItem('erp_parent_company');
      if (raw) { const p = JSON.parse(raw); return p.name || 'Company'; }
    } catch { /* ignore */ }
    return 'Company';
  }, []);

  // ── uf helper ────────────────────────────────────────────────────
  const uf = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  // ── handleSave (Sheet) ───────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!sheetOpen) return;
    if (!form.name.trim()) return toast.error('Asset name is required');
    if (editId) {
      updateAsset(editId, form);
    } else {
      try { createAsset(form, customCode || undefined); } catch { return; }
    }
    setSheetOpen(false);
  }, [sheetOpen, form, editId, customCode, createAsset, updateAsset]);

  useCtrlS(handleSave);

  // ── Navigation helpers ───────────────────────────────────────────
  const openCreate = () => {
    setEditId(null); setForm({ ...BLANK_ASSET }); setCustomCode(''); setSheetOpen(true);
  };
  const openEdit = (a: Asset) => {
    setEditId(a.id);
    const { id, assetCode, created_at, updated_at, ...rest } = a;
    setForm(rest); setCustomCode(assetCode); setSheetOpen(true);
  };
  const openAssign = (assetId: string) => {
    setAssignTargetId(assetId);
    setAssignForm({ employeeId: '', employeeCode: '', employeeName: '',
      assignedDate: new Date().toISOString().slice(0, 10), condition: 'good', notes: '' });
    setAssignOpen(true);
  };
  const openReturn = (assetId: string) => {
    setReturnTargetId(assetId);
    setReturnForm({ returnDate: new Date().toISOString().slice(0, 10), conditionIn: 'good', notes: '' });
    setReturnOpen(true);
  };

  // ── handleAssign ─────────────────────────────────────────────────
  const handleAssign = () => {
    if (!assignForm.employeeId) return toast.error('Select an employee');
    assignAsset(assignTargetId, assignForm.employeeId, assignForm.employeeCode,
      assignForm.employeeName, assignForm.assignedDate, assignForm.condition, assignForm.notes);
    setAssignOpen(false);
  };

  // ── handleReturn ─────────────────────────────────────────────────
  const handleReturn = () => {
    returnAsset(returnTargetId, returnForm.returnDate, returnForm.conditionIn, returnForm.notes);
    setReturnOpen(false);
  };

  // ── Filtered assets ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assets.filter(a =>
      (!q || a.name.toLowerCase().includes(q) || a.assetCode.toLowerCase().includes(q)
        || a.serialNo.toLowerCase().includes(q) || a.currentAssigneeName.toLowerCase().includes(q))
      && (catFilter === 'all' || a.category === catFilter)
      && (statusFilter === 'all' || a.status === statusFilter)
    );
  }, [assets, search, catFilter, statusFilter]);

  // ── Assets selected for barcode print ───────────────────────────
  const printAssets = useMemo(() =>
    assets.filter(a => selectedForPrint.has(a.id)),
    [assets, selectedForPrint]);

  const togglePrintSelect = (id: string) => {
    setSelectedForPrint(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllForPrint = () => {
    if (selectedForPrint.size === assets.length) {
      setSelectedForPrint(new Set());
    } else {
      setSelectedForPrint(new Set(assets.map(a => a.id)));
    }
  };

  const warrantyStatus = (dateStr: string) => {
    if (!dateStr) return null;
    const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'text-red-600';
    if (diff < 30) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Box className="h-6 w-6 text-violet-500" />
          <div>
            <h2 className="text-xl font-bold">Asset Master</h2>
            <p className="text-xs text-muted-foreground">Company asset directory & equipment register</p>
          </div>
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Asset
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Assets', value: stats.total, color: 'text-foreground' },
          { label: 'Available', value: stats.available, color: 'text-green-600' },
          { label: 'Assigned', value: stats.assigned, color: 'text-blue-600' },
          { label: 'Under Repair', value: stats.underRepair, color: 'text-amber-600' },
          { label: 'Total Value', value: `₹${toIndianFormat(stats.totalValue)}`, color: 'text-violet-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory"><Package className="h-3.5 w-3.5 mr-1.5" />Asset Directory</TabsTrigger>
          <TabsTrigger value="barcodes"><QrCode className="h-3.5 w-3.5 mr-1.5" />Barcode Labels</TabsTrigger>
        </TabsList>

        {/* ── DIRECTORY TAB ─────────────────────────────────────── */}
        <TabsContent value="directory" className="space-y-3">
          {/* Filter bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 text-xs" placeholder="Search by name, code, serial, assignee…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Assets table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Make / Model</TableHead>
                <TableHead>Serial No</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  {assets.length === 0 ? 'No assets registered yet. Click "Add Asset" to begin.' : 'No assets match filters.'}
                </TableCell></TableRow>
              )}
              {filtered.map(asset => (
                <> 
                  <TableRow key={asset.id} className="group">
                    <TableCell className="font-mono text-xs text-violet-600">{asset.assetCode}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell className="text-xs">{ASSET_CATEGORY_LABELS[asset.category]}</TableCell>
                    <TableCell className="text-xs">{[asset.make, asset.model].filter(Boolean).join(' ')}</TableCell>
                    <TableCell className="font-mono text-xs">{asset.serialNo || '—'}</TableCell>
                    <TableCell className="text-xs">{asset.location || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {asset.status === 'assigned' ? (
                        <span className="text-blue-600">{asset.currentAssigneeName}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className={`text-xs ${warrantyStatus(asset.warrantyExpiry) || ''}`}>
                      {asset.warrantyExpiry || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ASSET_STATUS_COLORS[asset.status]}>{asset.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(asset)}>
                          <Edit2 className="h-3.5 w-3.5" /></Button>
                        {asset.status === 'available' && (
                          <Button size="icon" variant="ghost" title="Assign" onClick={() => openAssign(asset.id)}>
                            <UserPlus className="h-3.5 w-3.5 text-blue-500" /></Button>
                        )}
                        {asset.status === 'assigned' && (
                          <Button size="icon" variant="ghost" title="Return" onClick={() => openReturn(asset.id)}>
                            <RotateCcw className="h-3.5 w-3.5 text-amber-500" /></Button>
                        )}
                        <Button size="icon" variant="ghost" title="History"
                          onClick={() => setExpandedRow(expandedRow === asset.id ? null : asset.id)}>
                          <History className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* ── Inline history expansion ────────── */}
                  {expandedRow === asset.id && (
                    <TableRow key={`hist-${asset.id}`}>
                      <TableCell colSpan={10} className="bg-muted/30 px-6 py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Assignment History ({asset.assignments.length} records)
                        </p>
                        {asset.assignments.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No assignment history.</p>
                        ) : (
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead className="text-xs">Employee</TableHead>
                              <TableHead className="text-xs">Assigned</TableHead>
                              <TableHead className="text-xs">Returned</TableHead>
                              <TableHead className="text-xs">Condition Out</TableHead>
                              <TableHead className="text-xs">Condition In</TableHead>
                              <TableHead className="text-xs">Notes</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {asset.assignments.map(h => (
                                <TableRow key={h.id}>
                                  <TableCell className="text-xs">{h.employeeName} ({h.employeeCode})</TableCell>
                                  <TableCell className="text-xs">{h.assignedDate}</TableCell>
                                  <TableCell className="text-xs">{h.returnedDate || <Badge variant="outline" className="text-blue-600 border-blue-500/30">Active</Badge>}</TableCell>
                                  <TableCell className="text-xs capitalize">{h.conditionOut}</TableCell>
                                  <TableCell className="text-xs capitalize">{h.returnedDate ? h.conditionIn : '—'}</TableCell>
                                  <TableCell className="text-xs">{h.notes || '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ── BARCODE LABELS TAB ────────────────────────────────── */}
        <TabsContent value="barcodes" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={selectAllForPrint}>
                {selectedForPrint.size === assets.length ? <CheckSquare className="h-3.5 w-3.5 mr-1" /> : <Square className="h-3.5 w-3.5 mr-1" />}
                {selectedForPrint.size === assets.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-xs text-muted-foreground">{selectedForPrint.size} selected</span>
            </div>
            <Button size="sm" disabled={selectedForPrint.size === 0} onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print Labels
            </Button>
          </div>

          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No assets to label.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {assets.map(a => (
                <Card key={a.id} className={`cursor-pointer transition-all ${selectedForPrint.has(a.id) ? 'ring-2 ring-violet-500' : ''}`}
                  onClick={() => togglePrintSelect(a.id)}>
                  <CardContent className="p-3 flex gap-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${a.assetCode}`}
                      alt={`QR: ${a.assetCode}`} className="h-16 w-16 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-bold text-violet-600">{a.assetCode}</p>
                      <p className="text-xs font-medium truncate">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.serialNo || 'No S/N'}</p>
                      <p className="text-[10px] text-muted-foreground">{companyName}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Print-only area */}
          <div id="print-area" className="hidden print:block">
            <style>{`
              @media print {
                body > *:not(#print-area) { display: none !important; }
                #print-area { display: grid !important; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 12px; }
                .print-label { border: 1px solid #ccc; padding: 8px; display: flex; gap: 8px; break-inside: avoid; }
                .print-label img { width: 64px; height: 64px; }
                .print-label .info { font-size: 10px; }
                .print-label .code { font-family: monospace; font-weight: bold; }
              }
            `}</style>
            {printAssets.map(a => (
              <div key={a.id} className="print-label">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${a.assetCode}`} alt={a.assetCode} />
                <div className="info">
                  <p className="code">{a.assetCode}</p>
                  <p>{a.name}</p>
                  <p>{a.serialNo}</p>
                  <p>{companyName}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── CREATE/EDIT SHEET ──────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editId ? 'Edit Asset' : 'Add New Asset'}</SheetTitle>
            <SheetDescription>
              {editId ? 'Update asset details.' : 'Register a new company asset.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Asset Code */}
            <div>
              <Label className="text-xs">Asset Code</Label>
              <Input className="text-xs font-mono mt-1" placeholder="AST-000001 (auto-generated)"
                value={customCode} onChange={e => setCustomCode(e.target.value)}
                onKeyDown={onEnterNext} disabled={!!editId} />
              {!editId && <p className="text-[10px] text-muted-foreground mt-0.5">Leave blank for auto-generation</p>}
            </div>

            <Separator />

            {/* Name */}
            <div>
              <Label className="text-xs">Name *</Label>
              <Input className="text-xs mt-1" placeholder="e.g. MacBook Pro 14-inch"
                value={form.name} onChange={e => uf('name', e.target.value)} onKeyDown={onEnterNext} />
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs">Category *</Label>
              <Select value={form.category} onValueChange={v => uf('category', v as AssetCategory)}>
                <SelectTrigger className="text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Make / Model */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Make</Label>
                <Input className="text-xs mt-1" placeholder="e.g. Apple, Dell, HP"
                  value={form.make} onChange={e => uf('make', e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <Label className="text-xs">Model</Label>
                <Input className="text-xs mt-1" placeholder="e.g. EliteBook 840"
                  value={form.model} onChange={e => uf('model', e.target.value)} onKeyDown={onEnterNext} />
              </div>
            </div>

            {/* Serial Number */}
            <div>
              <Label className="text-xs">Serial Number</Label>
              <Input className="text-xs font-mono mt-1" placeholder="Device serial number"
                value={form.serialNo} onChange={e => uf('serialNo', e.target.value)} onKeyDown={onEnterNext} />
            </div>

            {/* Purchase Date / Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Purchase Date</Label>
                <SmartDateInput value={form.purchaseDate} onChange={v => uf('purchaseDate', v)} className="text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Purchase Value (₹)</Label>
                <Input className="text-xs mt-1" {...amountInputProps}
                  value={form.purchaseValue ? toIndianFormat(form.purchaseValue) : ''}
                  onChange={e => uf('purchaseValue', fromIndianFormat(e.target.value))}
                  onKeyDown={onEnterNext} />
              </div>
            </div>

            {/* Warranty Expiry */}
            <div>
              <Label className="text-xs">Warranty Expiry</Label>
              <SmartDateInput value={form.warrantyExpiry} onChange={v => uf('warrantyExpiry', v)} className="text-xs mt-1" />
              {form.warrantyExpiry && (() => {
                const diff = (new Date(form.warrantyExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                if (diff < 0) return <p className="text-[10px] text-red-600 mt-0.5">⚠ Warranty expired</p>;
                if (diff < 90) return <p className="text-[10px] text-amber-600 mt-0.5">⚠ Warranty expires in {Math.ceil(diff)} days</p>;
                return null;
              })()}
            </div>

            {/* Location / Department */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Location / Branch</Label>
                <Input className="text-xs mt-1" value={form.location}
                  onChange={e => uf('location', e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <Input className="text-xs mt-1" value={form.department}
                  onChange={e => uf('department', e.target.value)} onKeyDown={onEnterNext} />
              </div>
            </div>

            {/* Condition */}
            <div>
              <Label className="text-xs">Condition</Label>
              <Select value={form.condition} onValueChange={v => uf('condition', v as AssetCondition)}>
                <SelectTrigger className="text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs mt-1" rows={3} value={form.notes}
                onChange={e => uf('notes', e.target.value)} />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white" data-primary onClick={handleSave}>
              {editId ? 'Update Asset' : 'Create Asset'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── ASSIGN DIALOG ──────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2" data-keyboard-form>
            {activeEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active employees found. Add employees in Employee Master first.</p>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Employee *</Label>
                  <Select value={assignForm.employeeId} onValueChange={v => {
                    const emp = activeEmployees.find(e => e.id === v);
                    if (emp) setAssignForm(p => ({ ...p, employeeId: emp.id, employeeCode: emp.empCode, employeeName: emp.displayName }));
                  }}>
                    <SelectTrigger className="text-xs mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {activeEmployees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Assigned Date</Label>
                  <SmartDateInput value={assignForm.assignedDate}
                    onChange={v => setAssignForm(p => ({ ...p, assignedDate: v }))} className="text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Condition at Assignment</Label>
                  <Select value={assignForm.condition}
                    onValueChange={v => setAssignForm(p => ({ ...p, condition: v as AssetCondition }))}>
                    <SelectTrigger className="text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Input className="text-xs mt-1" placeholder="Optional notes"
                    value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))}
                    onKeyDown={onEnterNext} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-primary onClick={handleAssign}
              disabled={activeEmployees.length === 0}>
              Assign Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RETURN DIALOG ──────────────────────────────────────── */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Asset Return</DialogTitle>
          </DialogHeader>
          {(() => {
            const target = assets.find(a => a.id === returnTargetId);
            return target ? (
              <p className="text-xs text-muted-foreground">
                {target.name} — currently assigned to <span className="font-medium text-blue-600">{target.currentAssigneeName}</span>
              </p>
            ) : null;
          })()}
          <div className="space-y-3 py-2" data-keyboard-form>
            <div>
              <Label className="text-xs">Return Date</Label>
              <SmartDateInput value={returnForm.returnDate}
                onChange={v => setReturnForm(p => ({ ...p, returnDate: v }))} className="text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Condition on Return</Label>
              <Select value={returnForm.conditionIn}
                onValueChange={v => setReturnForm(p => ({ ...p, conditionIn: v as AssetCondition }))}>
                <SelectTrigger className="text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.filter(o => o.value !== 'new').map(o =>
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input className="text-xs mt-1" placeholder="Optional notes"
                value={returnForm.notes} onChange={e => setReturnForm(p => ({ ...p, notes: e.target.value }))}
                onKeyDown={onEnterNext} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleReturn}>
              Record Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AssetMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Pay Hub', href: '/erp/pay-hub' },
            { label: 'Asset Master' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <div className="flex-1 overflow-auto p-6">
          <AssetMasterPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
