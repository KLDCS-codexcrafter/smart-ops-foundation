/**
 * @file        src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx
 * @purpose     S29 Refurbished Unit Lifecycle ⭐ · 4-state board · A/B/C grades · margin per grade
 * @sprint      T-Phase-1.C.1f · Block F.1
 * @iso         Functional Suitability + Usability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { toast } from 'sonner';
import {
  createRefurbishedUnit,
  listRefurbishedUnits,
  computeRefurbMarginByGrade,
  markRefurbReady,
  markRefurbSold,
  markRefurbRecycled,
} from '@/lib/servicedesk-engine';
import type { RefurbStatus, RefurbGrade, RefurbAcquisitionType } from '@/types/refurbished-unit';

const ENTITY = 'OPRX';
const ACTOR = 'desk_user';
const STATUSES: RefurbStatus[] = ['in_refurb', 'ready', 'sold', 'recycled'];
const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))'];

export function RefurbishedUnitLifecycle(): JSX.Element {
  const [refresh, setRefresh] = useState(0);
  const [statusFilter, setStatusFilter] = useState<RefurbStatus>('in_refurb');
  const [gradeFilter, setGradeFilter] = useState<'all' | RefurbGrade>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    serial: '', product_id: '', grade: 'A' as RefurbGrade,
    acquired_via: 'trade_in' as RefurbAcquisitionType,
    refurb_cost: '0', resale_price: '0',
  });

  void refresh;
  const units = listRefurbishedUnits({ entity_id: ENTITY }).filter((u) => {
    if (u.status !== statusFilter) return false;
    if (gradeFilter !== 'all' && u.refurb_grade !== gradeFilter) return false;
    return true;
  });

  const marginByGrade = computeRefurbMarginByGrade(ENTITY);
  const pieData = (['A', 'B', 'C'] as RefurbGrade[]).map((g) => ({
    name: `Grade ${g}`,
    value: marginByGrade[g].total_margin / 100,
    count: marginByGrade[g].count,
  })).filter((d) => d.value > 0 || d.count > 0);

  const create = (): void => {
    if (!form.serial) { toast.error('Serial required'); return; }
    createRefurbishedUnit({
      entity_id: ENTITY,
      original_serial: form.serial,
      product_id: form.product_id,
      refurb_grade: form.grade,
      acquired_via: form.acquired_via,
      acquired_at: new Date().toISOString(),
      refurb_cost_paise: Math.round(Number(form.refurb_cost) * 100),
      resale_price_paise: Math.round(Number(form.resale_price) * 100),
      notes: '',
    });
    toast.success(`Refurb unit ${form.serial} created`);
    setOpen(false);
    setForm({ ...form, serial: '', product_id: '' });
    setRefresh((r) => r + 1);
  };

  const transition = (id: string, action: 'ready' | 'sold' | 'recycled'): void => {
    if (action === 'ready') markRefurbReady(id, ACTOR, ENTITY);
    else if (action === 'sold') markRefurbSold(id, ACTOR, 'CUST-DEMO', ENTITY);
    else markRefurbRecycled(id, ACTOR, ENTITY);
    toast.success(`Marked ${action}`);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Refurbished Unit Lifecycle ⭐</h1>
          <p className="text-sm text-muted-foreground">S29 Tier 2 OOB · Circular economy resale tracker</p>
        </div>
        <Button onClick={() => setOpen(true)}>Create Refurb</Button>
      </div>

      <div className="flex gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as RefurbStatus)}>
          <TabsList>
            {STATUSES.map((s) => <TabsTrigger key={s} value={s}>{s.replace('_', ' ')}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Select value={gradeFilter} onValueChange={(v) => setGradeFilter(v as 'all' | RefurbGrade)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            <SelectItem value="A">Grade A</SelectItem>
            <SelectItem value="B">Grade B</SelectItem>
            <SelectItem value="C">Grade C</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        {units.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No units in {statusFilter}.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-medium">Serial</th>
                <th className="p-3 font-medium">Grade</th>
                <th className="p-3 font-medium">Acquired</th>
                <th className="p-3 font-medium">Refurb ₹</th>
                <th className="p-3 font-medium">Resale ₹</th>
                <th className="p-3 font-medium">Margin ₹</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{u.original_serial}</td>
                  <td className="p-3"><Badge variant="outline">{u.refurb_grade}</Badge></td>
                  <td className="p-3 text-xs">{u.acquired_via}</td>
                  <td className="p-3 font-mono">{(u.refurb_cost_paise / 100).toFixed(0)}</td>
                  <td className="p-3 font-mono">{(u.resale_price_paise / 100).toFixed(0)}</td>
                  <td className="p-3 font-mono">
                    <Badge variant={u.margin_paise >= 0 ? 'default' : 'destructive'}>
                      {(u.margin_paise / 100).toFixed(0)}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {u.status === 'in_refurb' && <Button size="sm" variant="outline" onClick={() => transition(u.id, 'ready')}>Mark Ready</Button>}
                    {u.status === 'ready' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => transition(u.id, 'sold')}>Sold</Button>
                        <Button size="sm" variant="outline" onClick={() => transition(u.id, 'recycled')}>Recycle</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Margin per Grade (sold units)</h2>
        {pieData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sold units yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pieData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Refurbished Unit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Serial</Label><Input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} /></div>
              <div><Label>Product ID</Label><Input value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Grade</Label>
                <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v as RefurbGrade })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Acquired Via</Label>
                <Select value={form.acquired_via} onValueChange={(v) => setForm({ ...form, acquired_via: v as RefurbAcquisitionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trade_in">Trade-in</SelectItem>
                    <SelectItem value="warranty_swap">Warranty swap</SelectItem>
                    <SelectItem value="cancellation">Cancellation</SelectItem>
                    <SelectItem value="b_stock">B-stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Refurb cost ₹</Label><Input type="number" value={form.refurb_cost} onChange={(e) => setForm({ ...form, refurb_cost: e.target.value })} /></div>
              <div><Label>Resale price ₹</Label><Input type="number" value={form.resale_price} onChange={(e) => setForm({ ...form, resale_price: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
