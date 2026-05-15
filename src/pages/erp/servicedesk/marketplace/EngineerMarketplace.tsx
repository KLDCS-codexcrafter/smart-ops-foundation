/**
 * @file        src/pages/erp/servicedesk/marketplace/EngineerMarketplace.tsx
 * @purpose     S27 Engineer Marketplace · Employee/Subcontractor/Freelancer 3-tab + capacity heatmap
 * @sprint      T-Phase-1.C.1f · Block D.1
 * @iso         Functional Suitability + Usability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { toast } from 'sonner';
// Precision Arc · Stage 3B · Block 4c — paise integer-domain conversion (rupees->paise).
import { roundTo, dMul } from '@/lib/decimal-helpers';
import {
  registerEngineerMarketplaceProfile,
  listEngineerMarketplaceProfiles,
} from '@/lib/servicedesk-engine';
import type { EngagementType } from '@/types/engineer-marketplace';

const ENTITY = 'OPRX';

interface Props {
  defaultTab?: EngagementType | 'all';
  showCapacityOnly?: boolean;
}

type TabValue = EngagementType | 'all';

export function EngineerMarketplace({ defaultTab = 'all', showCapacityOnly = false }: Props = {}): JSX.Element {
  const [tab, setTab] = useState<TabValue>(defaultTab);
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    engineer_id: '',
    engineer_name: '',
    engagement_type: 'subcontractor' as EngagementType,
    capacity: '40',
    skills: '',
    rate: '500',
    payment_terms: 'NET30',
  });

  void refresh;
  const all = listEngineerMarketplaceProfiles({ entity_id: ENTITY });
  const filtered = tab === 'all' ? all : all.filter((p) => p.engagement_type === tab);

  const handleRegister = (): void => {
    if (!form.engineer_id || !form.engineer_name) {
      toast.error('Engineer ID + name required');
      return;
    }
    registerEngineerMarketplaceProfile({
      entity_id: ENTITY,
      engineer_id: form.engineer_id,
      engineer_name: form.engineer_name,
      engagement_type: form.engagement_type,
      capacity_hours_per_week: Number(form.capacity) || 0,
      skill_tags: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      certification_links: [],
      payment_terms: form.payment_terms,
      invoicing_method: 'gst_invoice',
      hourly_rate_paise: roundTo(dMul(Number(form.rate), 100), 0),
      is_available: true,
      notes: '',
    });
    toast.success(`Marketplace profile registered (${form.engagement_type})`);
    setOpen(false);
    setForm({ ...form, engineer_id: '', engineer_name: '', skills: '' });
    setRefresh((r) => r + 1);
  };

  const chartData = all.map((p) => ({ name: p.engineer_name.slice(0, 12), hours: p.capacity_hours_per_week }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Engineer Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            S27 Tier 2 OOB · Employee + Subcontractor + Freelancer pool · {all.length} profile(s)
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Register New</Button>
      </div>

      {showCapacityOnly && (
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Capacity Heatmap (hours/week)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {!showCapacityOnly && (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="employee">Employee</TabsTrigger>
              <TabsTrigger value="subcontractor">Subcontractor</TabsTrigger>
              <TabsTrigger value="freelancer">Freelancer</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <Card className="p-0 overflow-hidden">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No engineers in this category yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="p-3 font-medium">Engineer</th>
                        <th className="p-3 font-medium">Type</th>
                        <th className="p-3 font-medium">Skills</th>
                        <th className="p-3 font-medium">Capacity (hrs/wk)</th>
                        <th className="p-3 font-medium">Rate ₹/hr</th>
                        <th className="p-3 font-medium">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-3">{p.engineer_name}<div className="text-xs text-muted-foreground font-mono">{p.engineer_id}</div></td>
                          <td className="p-3"><Badge variant="outline">{p.engagement_type}</Badge></td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {p.skill_tags.map((s) => <Badge key={`${p.id}-${s}`} variant="secondary" className="text-xs">{s}</Badge>)}
                            </div>
                          </td>
                          <td className="p-3 font-mono">{p.capacity_hours_per_week}</td>
                          <td className="p-3 font-mono">{(p.hourly_rate_paise / 100).toFixed(0)}</td>
                          <td className="p-3">
                            <Badge variant={p.is_available ? 'default' : 'outline'}>
                              {p.is_available ? 'Available' : 'Busy'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {all.length > 0 && (
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Capacity Heatmap (hours/week)</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Register Marketplace Profile</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Engineer ID</Label><Input value={form.engineer_id} onChange={(e) => setForm({ ...form, engineer_id: e.target.value })} /></div>
              <div><Label>Name</Label><Input value={form.engineer_name} onChange={(e) => setForm({ ...form, engineer_name: e.target.value })} /></div>
            </div>
            <div>
              <Label>Engagement Type</Label>
              <Select value={form.engagement_type} onValueChange={(v) => setForm({ ...form, engagement_type: v as EngagementType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Skill tags (comma-separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="hvac, electrical, ups" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Capacity (hrs/week)</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
              <div><Label>Hourly Rate ₹</Label><Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></div>
            </div>
            <div><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleRegister}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
