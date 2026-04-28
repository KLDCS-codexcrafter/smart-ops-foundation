/**
 * CRMPipeline.tsx — Kanban deal board
 * [JWT] GET/POST/PATCH /api/salesx/opportunities
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Plus, Save, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { useOpportunities } from '@/hooks/useOpportunities';
import { comply360SAMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { Opportunity, DealStage, StageConfig } from '@/types/opportunity';
import { STANDARD_STAGES, SOLUTIONS_STAGES } from '@/types/opportunity';
import { samPersonsKey } from '@/types/sam-person';
import type { SAMPerson } from '@/types/sam-person';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

function loadCfg(entityCode: string): SAMConfig | null {
  try {
    // [JWT] GET /api/compliance/comply360/sam/:entityCode
    return JSON.parse(localStorage.getItem(comply360SAMKey(entityCode)) || 'null');
  } catch { return null; }
}
function loadPersons(entityCode: string): SAMPerson[] {
  try {
    // [JWT] GET /api/salesx/sam/persons?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(samPersonsKey(entityCode)) || '[]');
  } catch { return []; }
}
function loadCustomers(): Array<{ id: string; partyName: string }> {
  try {
    // [JWT] GET /api/masters/customers
    return JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]');
  } catch { return []; }
}

const STAGE_BG: Record<StageConfig['color'], string> = {
  blue: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
  teal: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  orange: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  purple: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
  green: 'bg-green-500/15 text-green-700 border-green-500/30',
  red: 'bg-destructive/15 text-destructive border-destructive/30',
};

const todayISO = () => new Date().toISOString().split('T')[0];

const blank = (pipelineType: 'standard' | 'solutions'): Omit<Opportunity, 'id' | 'opportunity_no' | 'entity_id' | 'created_at' | 'updated_at'> => ({
  opportunity_date: todayISO(),
  deal_name: '',
  customer_id: null, customer_name: null,
  enquiry_id: null,
  stage: pipelineType === 'standard' ? 'discovery' : 'requirement_analysis',
  pipeline_type: pipelineType,
  deal_value: 0, probability: 10,
  expected_close_date: null,
  sales_owner_id: null, sales_owner_name: null,
  next_action: null, next_action_date: null,
  won_at: null, lost_at: null, lost_reason: null,
  notes: null, is_active: true,
});

export function CRMPipelinePanel({ entityCode }: Props) {
  const cfg = useMemo(() => loadCfg(entityCode), [entityCode]);
  const persons = useMemo(() => loadPersons(entityCode), [entityCode]);
  const customers = useMemo(() => loadCustomers(), []);
  const { opportunities, createOpportunity, updateOpportunity } = useOpportunities(entityCode);

  const pipelineType = cfg?.pipelineType ?? 'standard';
  const stages = pipelineType === 'solutions' ? SOLUTIONS_STAGES : STANDARD_STAGES;

  const [detailOpen, setDetailOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blank(pipelineType));
  const [salesmanFilter, setSalesmanFilter] = useState<string>('all');
  const [draggedOppId, setDraggedOppId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const update = useCallback((p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p })), []);

  const moveStage = useCallback((oppId: string, newStageId: string) => {
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp) return;
    if (opp.stage === newStageId) return;
    const patch: Partial<Opportunity> = { stage: newStageId as DealStage };
    if (newStageId === 'won') {
      patch.won_at = todayISO();
      patch.probability = 100;
    } else if (newStageId === 'lost') {
      patch.lost_at = todayISO();
      patch.probability = 0;
    } else {
      patch.won_at = null;
      patch.lost_at = null;
    }
    updateOpportunity(oppId, patch);
    toast.success(`Moved to ${stages.find(s => s.id === newStageId)?.label ?? newStageId}`);
  }, [opportunities, updateOpportunity, stages]);

  const filtered = useMemo(() => {
    if (salesmanFilter === 'all') return opportunities;
    return opportunities.filter(o => o.sales_owner_id === salesmanFilter);
  }, [opportunities, salesmanFilter]);

  const handleNew = () => {
    setEditingId(null);
    setForm(blank(pipelineType));
    setDetailOpen(true);
  };
  const handleEdit = (o: Opportunity) => {
    setEditingId(o.id);
    const { id, opportunity_no, entity_id, created_at, updated_at, ...rest } = o;
    setForm(rest);
    setDetailOpen(true);
  };

  const handleDetailSave = useCallback(() => {
    if (!form.deal_name) { toast.error('Deal name required'); return; }
    if (editingId) updateOpportunity(editingId, form);
    else createOpportunity(form);
    setDetailOpen(false);
  }, [form, editingId, updateOpportunity, createOpportunity]);

  useCtrlS(detailOpen ? handleDetailSave : () => {});

  const markWon = () => {
    update({ stage: 'won', won_at: todayISO(), probability: 100 });
  };
  const markLost = () => {
    const reason = window.prompt('Lost reason?');
    if (!reason) return;
    update({ stage: 'lost', lost_at: todayISO(), probability: 0, lost_reason: reason });
  };

  const totalWeighted = filtered.reduce((s, o) => s + (o.deal_value * o.probability) / 100, 0);
  const salesmen = persons.filter(p => p.person_type === 'salesman' || p.treat_as_salesman);

  if (!cfg?.enableCRM) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">CRM is disabled</p>
          <p className="text-sm text-muted-foreground">Enable CRM in Comply360 SAM settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">CRM Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {pipelineType === 'solutions' ? 'Solutions pipeline' : 'Standard pipeline'} · Total weighted ₹{totalWeighted.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Tip: drag any card between columns to change stage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={salesmanFilter} onValueChange={setSalesmanFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All salesmen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All salesmen</SelectItem>
              {salesmen.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleNew} data-primary className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />New Opportunity
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className={cn('flex-1 overflow-x-auto', detailOpen && 'opacity-90')}>
          <div className="flex gap-3 pb-2" style={{ minWidth: stages.length * 240 }}>
            {stages.map(stage => {
              const items = filtered.filter(o => o.stage === stage.id);
              const weighted = items.reduce((s, o) => s + (o.deal_value * o.probability) / 100, 0);
              return (
                <div
                  key={stage.id}
                  className={cn(
                    'flex-1 min-w-[220px] space-y-2 transition-colors rounded-md',
                    dragOverStageId === stage.id && 'bg-orange-500/10 ring-2 ring-orange-500/40',
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStageId(stage.id); }}
                  onDragLeave={() => setDragOverStageId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedOppId) moveStage(draggedOppId, stage.id);
                    setDraggedOppId(null);
                    setDragOverStageId(null);
                  }}
                >
                  <div className={cn('rounded-md border px-3 py-2', STAGE_BG[stage.color])}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{stage.label}</p>
                      <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                    </div>
                    <p className="text-[10px] mt-0.5 font-mono">₹{weighted.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="space-y-2">
                    {items.map(o => {
                      const probColor = o.probability < 25 ? 'bg-muted' :
                        o.probability < 50 ? 'bg-yellow-500/15 text-yellow-700' :
                        o.probability < 75 ? 'bg-blue-500/15 text-blue-700' :
                        'bg-green-500/15 text-green-700';
                      return (
                        <div
                          key={o.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedOppId(o.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggedOppId(null);
                            setDragOverStageId(null);
                          }}
                          className={cn(
                            'cursor-grab active:cursor-grabbing',
                            draggedOppId === o.id && 'opacity-40',
                          )}
                        >
                          <Card
                            className="cursor-pointer hover:border-orange-500/40"
                            onClick={() => handleEdit(o)}
                          >
                            <CardContent className="p-3 space-y-1">
                              <p className="font-semibold text-sm">{o.deal_name}</p>
                              <p className="text-xs text-muted-foreground">{o.customer_name ?? '—'}</p>
                              <p className="text-xs text-orange-600 font-mono">₹{o.deal_value.toLocaleString('en-IN')}</p>
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className={cn('text-[10px]', probColor)}>
                                  {o.probability}%
                                </Badge>
                                {o.expected_close_date && (
                                  <span className="text-[10px] text-muted-foreground">{o.expected_close_date}</span>
                                )}
                              </div>
                              {o.sales_owner_name && (
                                <p className="text-[10px] text-muted-foreground">{o.sales_owner_name}</p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {detailOpen && (
          <div className="w-[40%] min-w-[320px]" data-keyboard-form>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{editingId ? 'Edit Opportunity' : 'New Opportunity'}</p>
                  <Button size="sm" variant="ghost" onClick={() => setDetailOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <label className="text-xs font-medium">Deal Name</label>
                  <Input value={form.deal_name} onChange={e => update({ deal_name: e.target.value })} onKeyDown={onEnterNext} />
                </div>

                <div>
                  <label className="text-xs font-medium">Customer</label>
                  <Select
                    value={form.customer_id ?? ''}
                    onValueChange={v => {
                      const c = customers.find(x => x.id === v);
                      update({ customer_id: v, customer_name: c?.partyName ?? null });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.partyName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Deal Value (₹)</label>
                    <Input
                      type="number"
                      value={form.deal_value}
                      onChange={e => update({ deal_value: parseFloat(e.target.value) || 0 })}
                      onKeyDown={onEnterNext}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Probability %</label>
                    <Input
                      type="number"
                      value={form.probability}
                      onChange={e => update({ probability: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                      onKeyDown={onEnterNext}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium">Stage</label>
                  <Select value={form.stage} onValueChange={v => update({ stage: v as DealStage })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium">Expected Close Date</label>
                  <SmartDateInput
                    value={form.expected_close_date ?? ''}
                    onChange={v => update({ expected_close_date: v || null })}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium">Sales Owner</label>
                  <Select
                    value={form.sales_owner_id ?? ''}
                    onValueChange={v => {
                      const p = salesmen.find(x => x.id === v);
                      update({ sales_owner_id: v, sales_owner_name: p?.display_name ?? null });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {salesmen.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Next Action</label>
                    <Input
                      value={form.next_action ?? ''}
                      onChange={e => update({ next_action: e.target.value })}
                      onKeyDown={onEnterNext}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Next Action Date</label>
                    <SmartDateInput
                      value={form.next_action_date ?? ''}
                      onChange={v => update({ next_action_date: v || null })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium">Notes</label>
                  <Textarea value={form.notes ?? ''} onChange={e => update({ notes: e.target.value })} rows={3} />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={markWon}>Mark Won</Button>
                  <Button size="sm" variant="outline" onClick={markLost}>Mark Lost</Button>
                  <Button
                    size="sm" data-primary
                    className="ml-auto bg-orange-500 hover:bg-orange-600"
                    onClick={handleDetailSave}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default CRMPipelinePanel;
