/**
 * LeadDistributionHub.tsx — Canvas Wave 5 (T-Phase-1.1.1i)
 * Supervisor panel: Distribution Settings · Capacity Manager · Logs
 * [JWT] /api/salesx/lead-distribution
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Save, Trash2, X, Network, Users, Activity, AlertTriangle,
} from 'lucide-react';
import { useLeadDistribution } from '@/hooks/useLeadDistribution';
import { useSAMPersons } from '@/hooks/useSAMPersons';
import { useCtrlS } from '@/lib/keyboard';
import type {
  TelecallerCapacity, DistributionStrategy,
} from '@/types/lead-distribution';
import { DISTRIBUTION_STRATEGY_LABELS } from '@/types/lead-distribution';
import { cn } from '@/lib/utils';

type TabKey = 'settings' | 'capacity' | 'logs';

interface Props { entityCode: string }

interface CapForm {
  editingId: string | null;
  telecaller_id: string;
  daily_capacity: number;
  weekly_capacity: number;
  active: boolean;
  product_skills: string;
}

const blankCap = (): CapForm => ({
  editingId: null,
  telecaller_id: '',
  daily_capacity: 30,
  weekly_capacity: 150,
  active: true,
  product_skills: '',
});

function utilColor(pct: number): string {
  if (pct > 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-green-500';
}

export function LeadDistributionHubPanel({ entityCode }: Props) {
  const {
    config, capacities, logs, stats,
    updateConfig, setStrategy,
    saveCapacity, deleteCapacity,
    pickNextTelecaller, autoRedistribute,
  } = useLeadDistribution(entityCode);
  const { persons } = useSAMPersons(entityCode);

  const [activeTab, setActiveTab] = useState<TabKey>('settings');
  const [form, setForm] = useState<CapForm>(blankCap);
  const [logFilter, setLogFilter] = useState<string>('all');

  const isFormActive = !!(form.telecaller_id || form.editingId);

  const telecallerOptions = useMemo(
    () => persons.filter(p => p.id.startsWith('tc-') || p.person_code?.startsWith('TC')),
    [persons],
  );

  const availableTelecallers = useMemo(() => {
    const used = new Set(capacities.filter(c => c.id !== form.editingId).map(c => c.telecaller_id));
    return telecallerOptions.filter(p => !used.has(p.id));
  }, [telecallerOptions, capacities, form.editingId]);

  const handleSave = useCallback(() => {
    if (!form.telecaller_id) { toast.error('Select a telecaller'); return; }
    const tc = telecallerOptions.find(p => p.id === form.telecaller_id);
    if (!tc) { toast.error('Telecaller not found'); return; }
    const skills = form.product_skills.split(',').map(s => s.trim()).filter(Boolean);
    saveCapacity({
      id: form.editingId ?? undefined,
      entity_id: entityCode,
      telecaller_id: form.telecaller_id,
      telecaller_name: tc.display_name,
      daily_capacity: form.daily_capacity,
      weekly_capacity: form.weekly_capacity,
      active: form.active,
      product_skills: skills,
      current_daily_load: form.editingId
        ? capacities.find(c => c.id === form.editingId)?.current_daily_load ?? 0
        : 0,
      current_weekly_load: form.editingId
        ? capacities.find(c => c.id === form.editingId)?.current_weekly_load ?? 0
        : 0,
      utilisation_pct: form.editingId
        ? capacities.find(c => c.id === form.editingId)?.utilisation_pct ?? 0
        : 0,
    });
    toast.success(form.editingId ? 'Capacity updated' : 'Capacity saved');
    setForm(blankCap());
  }, [form, telecallerOptions, capacities, entityCode, saveCapacity]);
  useCtrlS(isFormActive ? handleSave : () => {});

  const handleEdit = (c: TelecallerCapacity) => {
    setForm({
      editingId: c.id,
      telecaller_id: c.telecaller_id,
      daily_capacity: c.daily_capacity,
      weekly_capacity: c.weekly_capacity,
      active: c.active,
      product_skills: c.product_skills.join(', '),
    });
    setActiveTab('capacity');
  };

  const handleTestDistribution = () => {
    const pick = pickNextTelecaller('wall putty primer');
    if (pick) {
      toast.success(`→ ${pick.telecallerName}: ${pick.reason}`);
    }
  };

  const filteredLogs = useMemo(
    () => logFilter === 'all'
      ? [...logs].sort((a, b) => b.distributed_at.localeCompare(a.distributed_at)).slice(0, 50)
      : logs.filter(l => l.strategy === logFilter)
            .sort((a, b) => b.distributed_at.localeCompare(a.distributed_at)).slice(0, 50),
    [logs, logFilter],
  );

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Network className="h-3.5 w-3.5" /> Strategy
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-sm font-semibold">{DISTRIBUTION_STRATEGY_LABELS[config.strategy]}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{stats.activeAgents} / {stats.totalAgents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" /> Avg Utilisation
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{stats.avgUtilisation}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Over-Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-mono font-bold', stats.overCapAgents > 0 && 'text-red-700')}>
              {stats.overCapAgents}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="capacity">Capacity ({capacities.length})</TabsTrigger>
          <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
        </TabsList>

        {/* SETTINGS TAB */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Distribution Strategy</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <RadioGroup value={config.strategy}
                  onValueChange={v => setStrategy(v as DistributionStrategy)}>
                  {(Object.keys(DISTRIBUTION_STRATEGY_LABELS) as DistributionStrategy[]).map(k => (
                    <div key={k} className="flex items-center gap-2">
                      <RadioGroupItem value={k} id={`strat-${k}`} />
                      <Label htmlFor={`strat-${k}`} className="text-sm cursor-pointer">
                        {DISTRIBUTION_STRATEGY_LABELS[k]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {config.strategy === 'weighted' && (
                  <div className="space-y-2 mt-3 border-t pt-3">
                    <Label className="text-xs">Weights (1-10)</Label>
                    {capacities.map(c => (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="text-xs flex-1">{c.telecaller_name}</span>
                        <Input type="number" min={1} max={10} className="w-20 font-mono"
                          value={config.weights[c.telecaller_id] ?? 1}
                          onChange={e => updateConfig({
                            weights: { ...config.weights, [c.telecaller_id]: Number(e.target.value) },
                          })} />
                      </div>
                    ))}
                  </div>
                )}

                {config.strategy === 'skill_based' && (
                  <div className="space-y-2 mt-3 border-t pt-3">
                    <Label className="text-xs">Skills per Telecaller (CSV)</Label>
                    {capacities.map(c => (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="text-xs w-32">{c.telecaller_name}</span>
                        <Input className="flex-1 text-xs"
                          value={(config.skills[c.telecaller_id] ?? c.product_skills).join(', ')}
                          onChange={e => updateConfig({
                            skills: { ...config.skills,
                              [c.telecaller_id]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) },
                          })}
                          placeholder="wall putty, primer" />
                      </div>
                    ))}
                  </div>
                )}

                {config.strategy === 'manual' && (
                  <div className="text-xs text-blue-700 bg-blue-500/10 border border-blue-500/30 rounded p-2 mt-3">
                    Manual mode — supervisor assigns each lead via Lead Inbox.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Auto-Redistribute</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Enable Auto-Redistribute</Label>
                  <Switch checked={config.auto_redistribute_enabled}
                    onCheckedChange={v => updateConfig({ auto_redistribute_enabled: v })} />
                </div>
                <div>
                  <Label className="text-xs">Trigger When Utilisation ≥ (50-200%)</Label>
                  <Input type="number" min={50} max={200} className="font-mono"
                    value={config.redistribute_when_overcap_pct}
                    onChange={e => updateConfig({ redistribute_when_overcap_pct: Number(e.target.value) })} />
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={handleTestDistribution}>
                    Test Distribution
                  </Button>
                  <Button size="sm" onClick={() => autoRedistribute()}>
                    Auto-redistribute Now
                  </Button>
                </div>
                {config.last_distributed_at && (
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Last distributed: {new Date(config.last_distributed_at).toLocaleString('en-IN')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CAPACITY TAB */}
        <TabsContent value="capacity">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Telecaller Capacities</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telecaller</TableHead>
                      <TableHead className="text-right">Daily Cap</TableHead>
                      <TableHead className="text-right">Load</TableHead>
                      <TableHead>Util %</TableHead>
                      <TableHead className="text-right">Weekly</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capacities.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-6">
                        No capacities defined
                      </TableCell></TableRow>
                    )}
                    {capacities.map(c => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => handleEdit(c)}>
                        <TableCell className="font-medium">{c.telecaller_name}</TableCell>
                        <TableCell className="text-right font-mono">{c.daily_capacity}</TableCell>
                        <TableCell className="text-right font-mono">{c.current_daily_load}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div className={cn('h-full', utilColor(c.utilisation_pct))}
                                style={{ width: `${Math.min(100, c.utilisation_pct)}%` }} />
                            </div>
                            <span className="text-xs font-mono">{c.utilisation_pct.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{c.current_weekly_load}/{c.weekly_capacity}</TableCell>
                        <TableCell>
                          <Badge variant={c.active ? 'default' : 'outline'} className="text-[10px]">
                            {c.active ? 'Active' : 'Off'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px]">{c.product_skills.join(', ') || '—'}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => deleteCapacity(c.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">{form.editingId ? 'Edit Capacity' : 'New Capacity'}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Telecaller *</Label>
                  <Select value={form.telecaller_id}
                    onValueChange={v => setForm(f => ({ ...f, telecaller_id: v }))}
                    disabled={!!form.editingId}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {(form.editingId ? telecallerOptions : availableTelecallers).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Daily Capacity</Label>
                    <Input type="number" min={1} value={form.daily_capacity}
                      onChange={e => setForm(f => ({ ...f, daily_capacity: Number(e.target.value) }))}
                      className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Weekly Capacity</Label>
                    <Input type="number" min={1} value={form.weekly_capacity}
                      onChange={e => setForm(f => ({ ...f, weekly_capacity: Number(e.target.value) }))}
                      className="font-mono" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active}
                    onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                  <Label className="text-xs">Active in distribution</Label>
                </div>
                <div>
                  <Label className="text-xs">Product Skills (CSV)</Label>
                  <Input value={form.product_skills}
                    onChange={e => setForm(f => ({ ...f, product_skills: e.target.value }))}
                    placeholder="wall putty, primer, texture" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" className="flex-1">
                    <Save className="h-3 w-3 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setForm(blankCap())}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Distribution Audit Log</span>
                <Select value={logFilter} onValueChange={setLogFilter}>
                  <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Strategies</SelectItem>
                    {(Object.keys(DISTRIBUTION_STRATEGY_LABELS) as DistributionStrategy[]).map(k => (
                      <SelectItem key={k} value={k}>{DISTRIBUTION_STRATEGY_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Lead No</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                      No distribution events yet. Trigger one from Lead Inbox or use 'Test Distribution' in Settings.
                    </TableCell></TableRow>
                  )}
                  {filteredLogs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-[10px] font-mono">{new Date(l.distributed_at).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="font-mono text-xs">{l.lead_no}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{l.strategy}</Badge></TableCell>
                      <TableCell>{l.assigned_telecaller_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LeadDistributionHubPanel;
