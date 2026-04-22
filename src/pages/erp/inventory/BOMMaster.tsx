/**
 * BOMMaster.tsx — Bill of Materials master screen
 *
 * List + form for BOMs. Versioned per product (one active at a time, prior
 * versions kept for historical voucher traceability). Supports multi-level
 * BOMs via the `sub_bom_id` field on each component (a Semi-Finished
 * component may itself have its own BOM).
 *
 * Sprint T10-pre.2a-S1a — masters groundwork. The recursive explosion logic
 * lives in S1b's Manufacturing Journal voucher. This screen only stores +
 * validates the data shape and surfaces "linked sub-BOM" badges for clarity.
 *
 * INPUT        none (entityCode resolved from useEntityCode)
 * OUTPUT       UI; persists via useBOM (localStorage in sandbox / API in prod)
 *
 * DEPENDENCIES useEntityCode, SelectCompanyGate, useBOM, useInventoryItems,
 *              shadcn/ui primitives, SmartDateInput, LedgerPicker
 *
 * TALLY-ON-TOP Neutral. BOM is master data, not a voucher.
 */
import { useMemo, useState, useCallback } from 'react';
import {
  Plus, Save, Trash2, Copy, Search, Edit2, Network,
  ChevronDown, X, AlertTriangle, Check, Layers,
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { LedgerPicker } from '@/components/finecore/pickers/LedgerPicker';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useBOM } from '@/hooks/useBOM';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { onEnterNext } from '@/lib/keyboard';
import type { Bom, BomComponent, BomByProduct, BomComponentType } from '@/types/bom';
import type { InventoryItem, ItemType } from '@/types/inventory-item';

// ─── Helpers ────────────────────────────────────────────────────

const PRODUCT_ITEM_TYPES: ItemType[] = ['Finished Goods', 'Semi-Finished'];
const COMPONENT_EXCLUDED_TYPES: ItemType[] = ['Service', 'Fixed Asset'];

function deriveComponentType(itemType: ItemType): BomComponentType {
  if (itemType === 'Semi-Finished') return 'semi_finished';
  if (itemType === 'Consumables' || itemType === 'Stores & Consumables'
      || itemType === 'Packaging Material') return 'consumable';
  return 'raw_material';
}

function componentTypeLabel(t: BomComponentType): string {
  if (t === 'raw_material') return 'Raw Material';
  if (t === 'semi_finished') return 'Semi-Finished';
  return 'Consumable';
}

function newRowId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface FormState {
  product_item_id: string;
  product_item_code: string;
  product_item_name: string;
  output_qty: number;
  output_uom: string;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  components: BomComponent[];
  byproducts: BomByProduct[];
  overhead_ledger_id: string | null;
  overhead_ledger_name: string | null;
  notes: string;
}

function buildEmptyForm(): FormState {
  return {
    product_item_id: '',
    product_item_code: '',
    product_item_name: '',
    output_qty: 1,
    output_uom: 'NOS',
    valid_from: new Date().toISOString().slice(0, 10),
    valid_to: null,
    is_active: false,
    components: [],
    byproducts: [],
    overhead_ledger_id: null,
    overhead_ledger_name: null,
    notes: '',
  };
}

function bomToForm(bom: Bom): FormState {
  return {
    product_item_id: bom.product_item_id,
    product_item_code: bom.product_item_code,
    product_item_name: bom.product_item_name,
    output_qty: bom.output_qty,
    output_uom: bom.output_uom,
    valid_from: bom.valid_from,
    valid_to: bom.valid_to ?? null,
    is_active: bom.is_active,
    components: bom.components.map(c => ({ ...c })),
    byproducts: bom.byproducts.map(b => ({ ...b })),
    overhead_ledger_id: bom.overhead_ledger_id ?? null,
    overhead_ledger_name: bom.overhead_ledger_name ?? null,
    notes: bom.notes ?? '',
  };
}

// ─── Sub-BOM Link Picker (mini-dialog) ─────────────────────────

interface SubBomLinkDialogProps {
  open: boolean;
  onClose: () => void;
  componentItemId: string;
  componentItemName: string;
  candidateBoms: Bom[];
  onPick: (bomId: string) => void;
}

function SubBomLinkDialog({
  open, onClose, componentItemName, candidateBoms, onPick,
}: SubBomLinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-4 w-4" /> Link sub-BOM
          </DialogTitle>
          <DialogDescription>
            Pick the BOM that produces &quot;{componentItemName}&quot;.
            Only active BOMs for this item are shown.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64 rounded-md border">
          {candidateBoms.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No active BOMs found for this item. Create one first.
            </div>
          ) : (
            <div className="divide-y">
              {candidateBoms.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { onPick(b.id); onClose(); }}
                  className="w-full text-left p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{b.product_item_name}</p>
                    <Badge variant="outline" className="text-[10px] font-mono">v{b.version_no}</Badge>
                    <Badge className="text-[10px] bg-success/15 text-success border-success/30">Active</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    output: {b.output_qty} {b.output_uom} · valid {b.valid_from} → {b.valid_to ?? 'open'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Panel ────────────────────────────────────────────────

interface BOMMasterPanelProps {
  entityCode: string;
}

export function BOMMasterPanel({ entityCode }: BOMMasterPanelProps) {
  const {
    boms,
    createBom,
    updateBom,
    deleteBom,
    cloneAsNewVersion,
    findActiveBomId,
  } = useBOM(entityCode);
  const { items } = useInventoryItems();

  const [search, setSearch] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [form, setForm] = useState<FormState>(buildEmptyForm());
  const [byproductsOpen, setByproductsOpen] = useState(false);
  const [subBomDialog, setSubBomDialog] = useState<{ rowIdx: number } | null>(null);

  // Index items by id for quick lookups
  const itemsById = useMemo(() => {
    const m = new Map<string, InventoryItem>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  // Items eligible to be a BOM product (Finished Goods or Semi-Finished)
  const productItems = useMemo(
    () => items.filter(it => PRODUCT_ITEM_TYPES.includes(it.item_type)),
    [items],
  );

  // Items eligible to appear as a component
  const componentItems = useMemo(
    () => items.filter(it => !COMPONENT_EXCLUDED_TYPES.includes(it.item_type)),
    [items],
  );

  // Group BOMs by product for the left list
  const groupedByProduct = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = boms.filter(b => {
      if (!q) return true;
      return (
        b.product_item_name.toLowerCase().includes(q)
        || b.product_item_code.toLowerCase().includes(q)
      );
    });
    const groups = new Map<string, { product_id: string; product_code: string; product_name: string; versions: Bom[] }>();
    for (const b of filtered) {
      const g = groups.get(b.product_item_id);
      if (g) {
        g.versions.push(b);
      } else {
        groups.set(b.product_item_id, {
          product_id: b.product_item_id,
          product_code: b.product_item_code,
          product_name: b.product_item_name,
          versions: [b],
        });
      }
    }
    const arr = Array.from(groups.values());
    for (const g of arr) g.versions.sort((a, b) => b.version_no - a.version_no);
    arr.sort((a, b) => a.product_name.localeCompare(b.product_name));
    return arr;
  }, [boms, search]);

  // ─── Form Handlers ──────────────────────────────────────────

  const openNewForm = useCallback(() => {
    setEditingId(null);
    setCreatingNew(true);
    setForm(buildEmptyForm());
    setByproductsOpen(false);
  }, []);

  const selectExistingBom = useCallback((bom: Bom) => {
    setEditingId(bom.id);
    setCreatingNew(false);
    setForm(bomToForm(bom));
    setByproductsOpen(bom.byproducts.length > 0);
  }, []);

  const closeForm = useCallback(() => {
    setEditingId(null);
    setCreatingNew(false);
    setForm(buildEmptyForm());
  }, []);

  const handleProductChange = (productId: string) => {
    const item = itemsById.get(productId);
    if (!item) return;
    setForm(prev => ({
      ...prev,
      product_item_id: item.id,
      product_item_code: item.code,
      product_item_name: item.name,
      output_uom: item.primary_uom_symbol ?? prev.output_uom,
    }));
  };

  const addComponentRow = () => {
    setForm(prev => ({
      ...prev,
      components: [
        ...prev.components,
        {
          id: newRowId('bcomp'),
          item_id: '',
          item_code: '',
          item_name: '',
          component_type: 'raw_material',
          qty: 1,
          uom: '',
          wastage_percent: 0,
          sub_bom_id: null,
        },
      ],
    }));
  };

  const updateComponent = (idx: number, patch: Partial<BomComponent>) => {
    setForm(prev => {
      const next = prev.components.map((c, i) => i === idx ? { ...c, ...patch } : c);
      return { ...prev, components: next };
    });
  };

  const handleComponentItemChange = (idx: number, itemId: string) => {
    const item = itemsById.get(itemId);
    if (!item) return;
    const compType = deriveComponentType(item.item_type);
    const linkedBomId = compType === 'semi_finished' ? findActiveBomId(item.id) : null;
    updateComponent(idx, {
      item_id: item.id,
      item_code: item.code,
      item_name: item.name,
      component_type: compType,
      uom: item.primary_uom_symbol ?? '',
      sub_bom_id: linkedBomId,
    });
  };

  const removeComponent = (idx: number) => {
    setForm(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== idx),
    }));
  };

  const addByproductRow = () => {
    setForm(prev => ({
      ...prev,
      byproducts: [
        ...prev.byproducts,
        {
          id: newRowId('bbp'),
          item_id: '',
          item_code: '',
          item_name: '',
          qty_per_batch: 0,
          uom: '',
          recovery_ledger_id: null,
          recovery_ledger_name: null,
        },
      ],
    }));
    setByproductsOpen(true);
  };

  const updateByproduct = (idx: number, patch: Partial<BomByProduct>) => {
    setForm(prev => {
      const next = prev.byproducts.map((b, i) => i === idx ? { ...b, ...patch } : b);
      return { ...prev, byproducts: next };
    });
  };

  const handleByproductItemChange = (idx: number, itemId: string) => {
    const item = itemsById.get(itemId);
    if (!item) return;
    updateByproduct(idx, {
      item_id: item.id,
      item_code: item.code,
      item_name: item.name,
      uom: item.primary_uom_symbol ?? '',
    });
  };

  const removeByproduct = (idx: number) => {
    setForm(prev => ({
      ...prev,
      byproducts: prev.byproducts.filter((_, i) => i !== idx),
    }));
  };

  // ─── Save / Delete / Clone ──────────────────────────────────

  const handleSave = () => {
    if (!form.product_item_id) {
      // toast handled inside hook for invalid input shapes; we add this guard upfront
      return;
    }
    if (editingId) {
      const ok = updateBom(editingId, {
        product_item_code: form.product_item_code,
        product_item_name: form.product_item_name,
        output_qty: form.output_qty,
        output_uom: form.output_uom,
        valid_from: form.valid_from,
        valid_to: form.valid_to,
        is_active: form.is_active,
        components: form.components,
        byproducts: form.byproducts,
        overhead_ledger_id: form.overhead_ledger_id,
        overhead_ledger_name: form.overhead_ledger_name,
        notes: form.notes,
      });
      if (ok) {
        // Stay on same selected id; reload form from store next render via boms change
        // We re-pull the latest version into the form below.
      }
    } else {
      const created = createBom({
        entity_id: entityCode,
        product_item_id: form.product_item_id,
        product_item_code: form.product_item_code,
        product_item_name: form.product_item_name,
        output_qty: form.output_qty,
        output_uom: form.output_uom,
        valid_from: form.valid_from,
        valid_to: form.valid_to,
        is_active: form.is_active,
        components: form.components,
        byproducts: form.byproducts,
        overhead_ledger_id: form.overhead_ledger_id,
        overhead_ledger_name: form.overhead_ledger_name,
        notes: form.notes,
      });
      if (created) {
        setEditingId(created.id);
        setCreatingNew(false);
      }
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    const confirmed = window.confirm('Delete this BOM version? This cannot be undone.');
    if (!confirmed) return;
    const ok = deleteBom(editingId);
    if (ok) closeForm();
  };

  const handleClone = () => {
    if (!editingId) return;
    const cloned = cloneAsNewVersion(editingId);
    if (cloned) {
      setEditingId(cloned.id);
      setCreatingNew(false);
      setForm(bomToForm(cloned));
    }
  };

  const toggleProductExpand = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  // Note: after toggling is_active and saving, sibling BOMs are flipped to
  // inactive inside useBOM. The left list re-renders to show the new badges.
  // Re-selecting from the list refreshes the form if needed.

  const showingForm = creatingNew || editingId !== null;
  const subBomCandidates = useMemo(() => {
    if (!subBomDialog) return [];
    const row = form.components[subBomDialog.rowIdx];
    if (!row) return [];
    return boms.filter(b => b.product_item_id === row.item_id && b.is_active);
  }, [subBomDialog, form.components, boms]);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5" /> Bill of Materials
          </h1>
          <p className="text-xs text-muted-foreground">
            Define how Finished Goods and Semi-Finished items are produced. Multi-level supported.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by product…"
              className="pl-9 h-9 w-64"
            />
          </div>
          <Button size="sm" onClick={openNewForm}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New BOM
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-12 gap-3">
        {/* Left list */}
        <Card className="col-span-12 lg:col-span-4 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Products with BOMs ({groupedByProduct.length})
          </p>
          {groupedByProduct.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No BOMs yet. Click &quot;New BOM&quot; to define one.
            </p>
          ) : (
            <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
              {groupedByProduct.map(group => {
                const isOpen = expandedProducts.has(group.product_id);
                return (
                  <div key={group.product_id} className="rounded-md border bg-card/50">
                    <button
                      type="button"
                      onClick={() => toggleProductExpand(group.product_id)}
                      className="w-full text-left p-2 hover:bg-accent flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{group.product_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {group.product_code} · {group.versions.length} version{group.versions.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="border-t divide-y">
                        {group.versions.map(v => {
                          const isSel = editingId === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => selectExistingBom(v)}
                              className={`w-full text-left px-3 py-2 text-[11px] hover:bg-accent flex items-center justify-between gap-2 ${isSel ? 'bg-primary/10' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono">v{v.version_no}</Badge>
                                {v.is_active ? (
                                  <Badge className="text-[10px] bg-success/15 text-success border-success/30">Active</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                                )}
                              </div>
                              <span className="text-muted-foreground truncate">
                                {v.valid_from} → {v.valid_to ?? 'open'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right detail / form */}
        <Card className="col-span-12 lg:col-span-8 p-4">
          {!showingForm ? (
            <div className="text-center text-xs text-muted-foreground py-12">
              Select a BOM from the left or click <span className="font-semibold">New BOM</span> to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Section: Product & header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-xs">Product</Label>
                  <Select
                    value={form.product_item_id}
                    onValueChange={handleProductChange}
                    disabled={!creatingNew}
                  >
                    <SelectTrigger className="text-xs mt-1">
                      <SelectValue placeholder="Select Finished Goods or Semi-Finished item…" />
                    </SelectTrigger>
                    <SelectContent>
                      {productItems.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">
                          No FG / SF items found. Create one in ItemCraft first.
                        </div>
                      ) : productItems.map(it => (
                        <SelectItem key={it.id} value={it.id}>
                          <span className="font-mono text-[11px] mr-2">{it.code}</span>{it.name}
                          <Badge variant="outline" className="text-[10px] ml-2">{it.item_type}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Version</Label>
                  <div className="text-xs mt-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground font-mono">
                    {editingId
                      ? `v${boms.find(b => b.id === editingId)?.version_no ?? '?'}`
                      : 'auto on save'}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Output Qty</Label>
                  <Input
                    type="number"
                    className="text-xs mt-1 font-mono"
                    value={form.output_qty}
                    onKeyDown={onEnterNext}
                    onChange={e => setForm(p => ({ ...p, output_qty: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Output UOM</Label>
                  <Input
                    className="text-xs mt-1"
                    value={form.output_uom}
                    readOnly
                  />
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))}
                    />
                    <Label className="text-xs">Is Active</Label>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Valid From</Label>
                  <SmartDateInput
                    value={form.valid_from}
                    onChange={iso => setForm(p => ({ ...p, valid_from: iso }))}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Valid To (optional)</Label>
                  <SmartDateInput
                    value={form.valid_to ?? ''}
                    onChange={iso => setForm(p => ({ ...p, valid_to: iso || null }))}
                    className="mt-1"
                  />
                </div>
              </div>

              {form.is_active && (() => {
                const existing = boms.find(
                  b => b.product_item_id === form.product_item_id
                    && b.is_active
                    && b.id !== editingId,
                );
                if (!existing) return null;
                return (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/30">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-warning">
                      Saving will deactivate the current active BOM (v{existing.version_no}) for this product.
                    </p>
                  </div>
                );
              })()}

              {/* Components grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Components</p>
                  <Button variant="outline" size="sm" onClick={addComponentRow}>
                    <Plus className="h-3 w-3 mr-1" /> Add Component
                  </Button>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-[28%]">Item</TableHead>
                        <TableHead className="text-xs w-[12%]">Type</TableHead>
                        <TableHead className="text-xs w-[10%]">Qty</TableHead>
                        <TableHead className="text-xs w-[10%]">UOM</TableHead>
                        <TableHead className="text-xs w-[12%]">Wastage %</TableHead>
                        <TableHead className="text-xs w-[20%]">Sub-BOM</TableHead>
                        <TableHead className="text-xs w-[8%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.components.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4">
                            No components yet. Click &quot;Add Component&quot;.
                          </TableCell>
                        </TableRow>
                      ) : form.components.map((c, idx) => {
                        const linkedBom = c.sub_bom_id ? boms.find(b => b.id === c.sub_bom_id) : null;
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Select
                                value={c.item_id}
                                onValueChange={(v) => handleComponentItemChange(idx, v)}
                              >
                                <SelectTrigger className="text-xs h-8">
                                  <SelectValue placeholder="Select item…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {componentItems.map(it => (
                                    <SelectItem key={it.id} value={it.id}>
                                      <span className="font-mono text-[11px] mr-2">{it.code}</span>{it.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {componentTypeLabel(c.component_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="text-xs h-8 font-mono"
                                value={c.qty}
                                onKeyDown={onEnterNext}
                                onChange={e => updateComponent(idx, { qty: parseFloat(e.target.value) || 0 })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input className="text-xs h-8" value={c.uom} readOnly />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="text-xs h-8 font-mono"
                                value={c.wastage_percent}
                                onKeyDown={onEnterNext}
                                onChange={e => updateComponent(idx, { wastage_percent: parseFloat(e.target.value) || 0 })}
                              />
                            </TableCell>
                            <TableCell>
                              {c.component_type !== 'semi_finished' ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : linkedBom ? (
                                <div className="flex items-center gap-1">
                                  <Badge className="text-[10px] bg-success/15 text-success border-success/30">
                                    Linked: v{linkedBom.version_no}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => updateComponent(idx, { sub_bom_id: null })}
                                    title="Unlink sub-BOM"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">
                                    No BOM
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[10px]"
                                    onClick={() => setSubBomDialog({ rowIdx: idx })}
                                    disabled={!c.item_id}
                                  >
                                    Link…
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeComponent(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Byproducts collapsible */}
              <Collapsible open={byproductsOpen} onOpenChange={setByproductsOpen}>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 gap-1">
                      <ChevronDown className={`h-3 w-3 transition-transform ${byproductsOpen ? 'rotate-180' : ''}`} />
                      Byproducts {form.byproducts.length > 0 && `(${form.byproducts.length})`}
                    </Button>
                  </CollapsibleTrigger>
                  <Button variant="outline" size="sm" onClick={addByproductRow}>
                    <Plus className="h-3 w-3 mr-1" /> Add Byproduct
                  </Button>
                </div>
                <CollapsibleContent className="mt-2">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-[30%]">Item</TableHead>
                          <TableHead className="text-xs w-[15%]">Qty per Batch</TableHead>
                          <TableHead className="text-xs w-[10%]">UOM</TableHead>
                          <TableHead className="text-xs w-[35%]">Recovery Ledger</TableHead>
                          <TableHead className="text-xs w-[10%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.byproducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                              No byproducts. Optional — add one if production yields recoverable output.
                            </TableCell>
                          </TableRow>
                        ) : form.byproducts.map((b, idx) => (
                          <TableRow key={b.id}>
                            <TableCell>
                              <Select
                                value={b.item_id}
                                onValueChange={(v) => handleByproductItemChange(idx, v)}
                              >
                                <SelectTrigger className="text-xs h-8">
                                  <SelectValue placeholder="Select byproduct…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {componentItems.map(it => (
                                    <SelectItem key={it.id} value={it.id}>
                                      <span className="font-mono text-[11px] mr-2">{it.code}</span>{it.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="text-xs h-8 font-mono"
                                value={b.qty_per_batch}
                                onKeyDown={onEnterNext}
                                onChange={e => updateByproduct(idx, { qty_per_batch: parseFloat(e.target.value) || 0 })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input className="text-xs h-8" value={b.uom} readOnly />
                            </TableCell>
                            <TableCell>
                              <LedgerPicker
                                value={b.recovery_ledger_id ?? ''}
                                onChange={(id, name) => updateByproduct(idx, { recovery_ledger_id: id, recovery_ledger_name: name })}
                                entityCode={entityCode}
                                placeholder="Pick recovery ledger…"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeByproduct(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Overhead ledger */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Overhead Ledger (optional)</Label>
                  <div className="mt-1">
                    <LedgerPicker
                      value={form.overhead_ledger_id ?? ''}
                      onChange={(id, name) => setForm(p => ({ ...p, overhead_ledger_id: id, overhead_ledger_name: name }))}
                      entityCode={entityCode}
                      placeholder="Pick overhead absorption ledger…"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  className="text-xs mt-1"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <div>
                  {editingId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingId && (
                    <Button variant="outline" size="sm" onClick={handleClone}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Clone as New Version
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button data-primary size="sm" onClick={handleSave}>
                    {editingId ? <><Check className="h-3.5 w-3.5 mr-1" /> Save</> : <><Save className="h-3.5 w-3.5 mr-1" /> Create</>}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Sub-BOM link dialog */}
      {subBomDialog && (
        <SubBomLinkDialog
          open={true}
          onClose={() => setSubBomDialog(null)}
          componentItemId={form.components[subBomDialog.rowIdx]?.item_id ?? ''}
          componentItemName={form.components[subBomDialog.rowIdx]?.item_name ?? ''}
          candidateBoms={subBomCandidates}
          onPick={(bomId) => updateComponent(subBomDialog.rowIdx, { sub_bom_id: bomId })}
        />
      )}
    </div>
  );
}

// ─── Page Wrapper ─────────────────────────────────────────────

export default function BOMMaster() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <div className="flex-1">
          <ERPHeader breadcrumbs={[{ label: 'Inventory' }, { label: 'BOM Master' }]} />
          <div className="p-6 max-w-7xl mx-auto">
            {entityCode
              ? <BOMMasterPanel entityCode={entityCode} />
              : <SelectCompanyGate title="Select a company to manage Bill of Materials" />}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

/* Mark these helpers re-exportable for any future shared use without
   triggering "unused" lint complaints in this file. */
export type { FormState };
