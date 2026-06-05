/**
 * @file        src/pages/erp/webstorex/visualizer/VisualizerPage.tsx
 * @purpose     S152 Visualizer · DP-WS-12 product-agnostic · §O HONESTY label permanent.
 * @sprint      Sprint 152 · T-WebStoreX-A11.4 · ARC CLOSER
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listCompositions, createComposition, deleteComposition,
  addPlacement, updateComposition, dimensionChipText, suggestedScaleFor,
} from '@/lib/webstorex-visualizer-engine';
import { getCatalog, getStoreItem } from '@/lib/webstorex-engine';
import type { VisualizerComposition, WebStoreItem } from '@/types/webstorex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ImageIcon, Plus, Trash2, Download, Ruler, AlertTriangle, Layers,
} from 'lucide-react';

const HONESTY_LABEL = 'Visual approximation — verify dimensions against site measurements';

export function VisualizerPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userId = user?.id ?? 'demo-user';

  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhoto, setNewPhoto] = useState<string>('');
  const [refMarkMode, setRefMarkMode] = useState(false);
  const [refStart, setRefStart] = useState<{ x: number; y: number } | null>(null);
  const [refLengthCm, setRefLengthCm] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const compositions = useMemo<VisualizerComposition[]>(
    () => entityCode ? listCompositions(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );
  const active = useMemo<VisualizerComposition | null>(
    () => compositions.find((c) => c.id === activeId) ?? null,
    [compositions, activeId],
  );
  useEffect(() => {
    if (!active && compositions.length > 0) setActiveId(compositions[0].id);
  }, [compositions, active]);

  const catalog: WebStoreItem[] = useMemo(
    () => entityCode ? getCatalog(entityCode, { visibility: 'published' }) : [],
    [entityCode, tick],
  );
  const cutoutItems = useMemo(
    () => catalog.filter((c) => c.images.some((i) => i.kind === 'cutout')),
    [catalog],
  );

  // ── Canvas render ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 900; canvas.height = 600;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const room = new Image();
    room.onload = (): void => {
      ctx.drawImage(room, 0, 0, canvas.width, canvas.height);
      // reference line overlay
      if (active.referenceLine) {
        const r = active.referenceLine;
        ctx.strokeStyle = 'hsl(45 90% 55%)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke();
      }
      // placements
      let pendingLoads = active.placements.length;
      if (pendingLoads === 0) { drawHonestyLabel(ctx, canvas); return; }
      active.placements.forEach((p) => {
        const it = getStoreItem(entityCode, p.storeItemId);
        const cutout = it?.images.find((i) => i.id === p.cutoutImageId);
        if (!cutout) { pendingLoads--; if (pendingLoads === 0) drawHonestyLabel(ctx, canvas); return; }
        const img = new Image();
        img.onload = (): void => {
          const w = img.naturalWidth * p.scale;
          const h = img.naturalHeight * p.scale;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotationDeg * Math.PI) / 180);
          if (p.flipped) ctx.scale(-1, 1);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();
          pendingLoads--;
          if (pendingLoads === 0) drawHonestyLabel(ctx, canvas);
        };
        img.onerror = (): void => { pendingLoads--; if (pendingLoads === 0) drawHonestyLabel(ctx, canvas); };
        img.src = cutout.dataUrl;
      });
    };
    room.src = active.roomPhotoDataUrl;
  }, [active, entityCode, tick]);

  function drawHonestyLabel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // §O HONESTY: permanent on-canvas approximation label
    const pad = 10; const label = HONESTY_LABEL;
    ctx.font = '12px Inter, sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'hsla(0, 0%, 0%, 0.7)';
    ctx.fillRect(canvas.width - tw - pad * 2 - 8, canvas.height - 30, tw + pad * 2, 22);
    ctx.fillStyle = 'hsl(45 90% 70%)';
    ctx.fillText(label, canvas.width - tw - pad - 8, canvas.height - 14);
  }

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  // ── Handlers ──────────────────────────────────────────────────
  const onPhotoFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error('Photo exceeds 2 MB cap'); return; }
    const reader = new FileReader();
    reader.onload = (): void => setNewPhoto(String(reader.result ?? ''));
    reader.readAsDataURL(f);
  };

  const handleCreate = (): void => {
    try {
      const c = createComposition(entityCode, {
        name: newName.trim(), roomPhotoDataUrl: newPhoto, createdByUserId: userId,
      });
      setActiveId(c.id);
      setCreateOpen(false); setNewName(''); setNewPhoto('');
      toast.success('Composition created');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    }
  };

  const handleDelete = (id: string): void => {
    deleteComposition(entityCode, id);
    if (activeId === id) setActiveId(null);
    toast.success('Composition deleted');
    reload();
  };

  const handleAddItem = (storeItemId: string): void => {
    if (!active) return;
    try {
      addPlacement(entityCode, active.id, storeItemId);
      setAddOpen(false);
      toast.success('Item placed');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place');
    }
  };

  const handleExport = (): void => {
    const canvas = canvasRef.current; if (!canvas || !active) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `${active.name.replace(/\s+/g, '-')}.png`;
    a.click();
    toast.success('PNG exported');
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!refMarkMode || !active) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    if (!refStart) { setRefStart({ x, y }); return; }
    const realLen = Number(refLengthCm);
    if (!Number.isFinite(realLen) || realLen <= 0) {
      toast.error('Enter known length in cm first'); setRefStart(null); return;
    }
    updateComposition(entityCode, active.id, {
      referenceLine: { x1: refStart.x, y1: refStart.y, x2: x, y2: y, realLengthCm: realLen },
    }, userId);
    setRefStart(null); setRefMarkMode(false); setRefLengthCm('');
    toast.success('Reference scale set');
    reload();
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Visualizer
          </h1>
          <p className="text-xs text-muted-foreground">
            {compositions.length} composition{compositions.length === 1 ? '' : 's'} · §O on-canvas approximation label always rendered.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />New composition
          </Button>
        </div>
      </div>

      {/* Honesty banner */}
      <Card className="glass-card border-warning/40">
        <CardContent className="p-3 flex items-start gap-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-warning">{HONESTY_LABEL}</div>
            <div className="text-muted-foreground">
              No AI try-on · no 3D/AR · dimensions chip never invents. Reference-scale assist only.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Gallery */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gallery</div>
          {compositions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-4 text-center text-xs text-muted-foreground">
                No compositions yet.
              </CardContent>
            </Card>
          ) : compositions.map((c) => (
            <Card
              key={c.id}
              className={`glass-card cursor-pointer transition ${activeId === c.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveId(c.id)}
            >
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {c.placements.length} placement{c.placements.length === 1 ? '' : 's'}
                  {c.pxPerCm ? ` · scaled (${c.pxPerCm.toFixed(2)} px/cm)` : ' · no scale'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Canvas + controls */}
        <div className="space-y-3">
          {active ? (
            <>
              <Card className="glass-card">
                <CardContent className="p-3 flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                    <Layers className="h-4 w-4 mr-1" />Place item
                  </Button>
                  <Button
                    size="sm"
                    variant={refMarkMode ? 'default' : 'outline'}
                    onClick={() => { setRefMarkMode((v) => !v); setRefStart(null); }}
                  >
                    <Ruler className="h-4 w-4 mr-1" />
                    {refMarkMode ? 'Marking…' : 'Set reference scale'}
                  </Button>
                  {refMarkMode && (
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">Known length (cm)</Label>
                      <Input
                        className="h-8 w-24 font-mono"
                        value={refLengthCm}
                        onChange={(e) => setRefLengthCm(e.target.value)}
                        placeholder="213"
                      />
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-1" />Export PNG
                  </Button>
                  {active.placements.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        updateComposition(entityCode, active.id, { placements: [] }, userId);
                        toast.success('Placements cleared'); reload();
                      }}
                    >
                      Clear placements
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="w-full bg-muted/30 cursor-crosshair"
                  style={{ aspectRatio: '3 / 2' }}
                />
              </Card>

              {/* Placement dimensions chips */}
              {active.placements.length > 0 && (
                <Card className="glass-card">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Placed items</div>
                    {active.placements.map((p, i) => {
                      const it = getStoreItem(entityCode, p.storeItemId);
                      const suggested = it && active.pxPerCm
                        ? suggestedScaleFor(it, active.pxPerCm,
                            it.images.find((im) => im.id === p.cutoutImageId)?.dataUrl.length ?? 1)
                        : null;
                      return (
                        <div key={`pl-${i}-${p.storeItemId}`} className="flex items-center justify-between text-xs">
                          <div className="truncate">{it?.storeTitle ?? p.storeItemId}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {it ? dimensionChipText(it) : 'unknown item'}
                            </Badge>
                            {suggested !== null && (
                              <Badge variant="secondary" className="font-mono">
                                suggested scale {suggested.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Create or select a composition to begin.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create composition dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New composition</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Living room — east wall" />
            </div>
            <div>
              <Label className="text-xs">Room photo (≤ 2 MB)</Label>
              <Input type="file" accept="image/*" onChange={onPhotoFile} />
              {newPhoto && <div className="text-[10px] text-success mt-1">Photo loaded</div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || !newPhoto}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add item dialog — only items with cutout */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Place item</DialogTitle>
          </DialogHeader>
          {cutoutItems.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 text-center">
              No items have a cutout image on record. Visualize button is hidden for items without cutouts (asset discipline).
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-80 overflow-auto">
              {cutoutItems.map((it) => {
                const cutout = it.images.find((i) => i.kind === 'cutout');
                return (
                  <button
                    key={it.id}
                    onClick={() => handleAddItem(it.id)}
                    className="text-left rounded-md border border-border hover:border-primary transition p-2 space-y-1"
                  >
                    {cutout && <img src={cutout.dataUrl} alt={it.storeTitle} className="w-full h-20 object-contain bg-muted/40 rounded" />}
                    <div className="text-xs font-medium truncate">{it.storeTitle}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{dimensionChipText(it)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
