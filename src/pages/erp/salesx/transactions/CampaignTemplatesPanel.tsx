/**
 * CampaignTemplatesPanel.tsx — Multi-channel templates · Canvas Wave 6 (T-Phase-1.1.1j)
 * [JWT] /api/salesx/campaign-templates
 */
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Layers, Plus, Save, Trash2, X, Copy, MessageCircle,
  Mail, Smartphone, PhoneCall,
} from 'lucide-react';
import { useCampaignTemplates } from '@/hooks/useCampaignTemplates';
import { useCtrlS } from '@/lib/keyboard';
import type {
  CampaignTemplate, TemplateChannelStep, ChannelKind,
} from '@/types/campaign-template';
import { CHANNEL_LABELS, CHANNEL_COLORS } from '@/types/campaign-template';
import type { CampaignType } from '@/types/campaign';
import { CAMPAIGN_TYPE_LABELS } from '@/types/campaign';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

interface FormState {
  id?: string;
  template_code: string;
  template_name: string;
  campaign_type: CampaignType;
  description: string;
  channel_steps: TemplateChannelStep[];
  is_active: boolean;
  is_built_in: boolean;
}

function blankForm(): FormState {
  return {
    template_code: '', template_name: '',
    campaign_type: 'CALL', description: '',
    channel_steps: [], is_active: true, is_built_in: false,
  };
}

const CHANNEL_ICONS: Record<ChannelKind, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: Smartphone,
  call: PhoneCall,
};

export function CampaignTemplatesPanelComponent({ entityCode }: Props) {
  const { templates, saveTemplate, deleteTemplate } = useCampaignTemplates(entityCode);
  const [form, setForm] = useState<FormState>(blankForm());
  const [filter, setFilter] = useState<'all' | CampaignType>('all');

  const filtered = useMemo(() =>
    filter === 'all' ? templates : templates.filter(t => t.campaign_type === filter),
  [templates, filter]);

  const stats = useMemo(() => {
    const builtIn = templates.filter(t => t.is_built_in).length;
    const custom = templates.length - builtIn;
    const mostUsed = [...templates].sort((a, b) => b.use_count - a.use_count)[0];
    return {
      total: templates.length,
      builtIn, custom,
      mostUsedName: mostUsed?.template_name ?? '—',
      mostUsedCount: mostUsed?.use_count ?? 0,
    };
  }, [templates]);

  const isFormActive = !!(form.template_code.trim() || form.id);

  const handleEdit = useCallback((t: CampaignTemplate) => {
    setForm({
      id: t.id,
      template_code: t.template_code,
      template_name: t.template_name,
      campaign_type: t.campaign_type,
      description: t.description ?? '',
      channel_steps: t.channel_steps,
      is_active: t.is_active,
      is_built_in: t.is_built_in,
    });
  }, []);

  const handleDuplicate = useCallback((t: CampaignTemplate) => {
    setForm({
      template_code: `${t.template_code}-COPY`,
      template_name: `${t.template_name} (copy)`,
      campaign_type: t.campaign_type,
      description: t.description ?? '',
      channel_steps: t.channel_steps.map(s => ({ ...s, id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })),
      is_active: true,
      is_built_in: false,
    });
    toast.info('Duplicated — edit and save as new template');
  }, []);

  const handleSave = useCallback(() => {
    if (!form.template_code.trim()) { toast.error('Template code required'); return; }
    if (!form.template_name.trim()) { toast.error('Template name required'); return; }
    // Unique code check (excluding self)
    const dup = templates.find(t => t.template_code === form.template_code && t.id !== form.id);
    if (dup) { toast.error('Template code must be unique'); return; }
    saveTemplate({
      id: form.id,
      entity_id: entityCode,
      template_code: form.template_code.trim(),
      template_name: form.template_name.trim(),
      campaign_type: form.campaign_type,
      description: form.description.trim() || null,
      channel_steps: form.channel_steps,
      is_active: form.is_active,
      is_built_in: form.is_built_in,
    });
    toast.success(form.id ? 'Template updated' : 'Template created');
    setForm(blankForm());
  }, [form, templates, saveTemplate, entityCode]);

  useCtrlS(isFormActive ? handleSave : () => { /* noop */ });

  const handleDelete = useCallback((t: CampaignTemplate) => {
    if (t.is_built_in) {
      toast.error('Built-in templates cannot be deleted');
      return;
    }
    deleteTemplate(t.id);
    toast.success('Template deleted');
    if (form.id === t.id) setForm(blankForm());
  }, [deleteTemplate, form.id]);

  const addStep = () => {
    const step: TemplateChannelStep = {
      id: `cs-${Date.now()}`,
      channel: 'whatsapp',
      day_offset: 0,
      hour_of_day: 10,
      subject: null,
      body: '',
      is_active: true,
    };
    setForm(f => ({ ...f, channel_steps: [...f.channel_steps, step] }));
  };

  const updateStep = (id: string, patch: Partial<TemplateChannelStep>) => {
    setForm(f => ({
      ...f,
      channel_steps: f.channel_steps.map(s => s.id === id ? { ...s, ...patch } : s),
    }));
  };

  const removeStep = (id: string) => {
    setForm(f => ({ ...f, channel_steps: f.channel_steps.filter(s => s.id !== id) }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Campaign Templates</h2>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Templates</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{stats.total}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Built-in</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{stats.builtIn}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Custom</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{stats.custom}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Most Used</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-semibold truncate">{stats.mostUsedName}</p>
            <p className="text-xs text-muted-foreground font-mono">{stats.mostUsedCount} uses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Templates list */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Templates</CardTitle>
              <Select value={filter} onValueChange={v => setFilter(v as 'all' | CampaignType)}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {(Object.keys(CAMPAIGN_TYPE_LABELS) as CampaignType[]).map(c => (
                    <SelectItem key={c} value={c}>{CAMPAIGN_TYPE_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No templates</p>
            ) : filtered.map(t => (
              <div key={t.id} className={cn(
                'border rounded-md p-3 space-y-1.5',
                form.id === t.id && 'border-orange-500 bg-orange-500/5',
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.template_name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{t.template_code}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.is_built_in && <Badge variant="outline" className="text-[9px]">Built-in</Badge>}
                    {!t.is_active && <Badge variant="outline" className="text-[9px]">Inactive</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px]">{CAMPAIGN_TYPE_LABELS[t.campaign_type]}</Badge>
                  <span>{t.channel_steps.length} step(s)</span>
                  <span>· {t.use_count} uses</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {t.channel_steps.map(s => {
                    const Icon = CHANNEL_ICONS[s.channel];
                    return (
                      <span key={s.id} className={cn(
                        'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border rounded',
                        CHANNEL_COLORS[s.channel],
                      )}>
                        <Icon className="h-3 w-3" />
                        {CHANNEL_LABELS[s.channel]} D{s.day_offset >= 0 ? '+' : ''}{s.day_offset}
                      </span>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleEdit(t)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleDuplicate(t)}>
                    <Copy className="h-3 w-3 mr-1" /> Duplicate
                  </Button>
                  {!t.is_built_in && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive"
                      onClick={() => handleDelete(t)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right: Editor */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">{form.id ? 'Edit Template' : 'New Template'}</CardTitle>
            {form.id && (
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setForm(blankForm())}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {form.is_built_in && form.id && (
              <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded p-2">
                Built-in template — read-only. Use <strong>Duplicate</strong> to create an editable copy.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Code *</Label>
                <Input value={form.template_code} disabled={form.is_built_in && !!form.id}
                  onChange={e => setForm(f => ({ ...f, template_code: e.target.value }))} className="h-8 text-xs font-mono" />
              </div>
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.template_name} disabled={form.is_built_in && !!form.id}
                  onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Campaign Type</Label>
              <Select value={form.campaign_type} disabled={form.is_built_in && !!form.id}
                onValueChange={v => setForm(f => ({ ...f, campaign_type: v as CampaignType }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CAMPAIGN_TYPE_LABELS) as CampaignType[]).map(c => (
                    <SelectItem key={c} value={c}>{CAMPAIGN_TYPE_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea rows={2} value={form.description} disabled={form.is_built_in && !!form.id}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} disabled={form.is_built_in && !!form.id}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-xs">Active</Label>
            </div>

            {/* Channel steps */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Channel Steps ({form.channel_steps.length})</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  disabled={form.is_built_in && !!form.id}
                  onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" /> Add Step
                </Button>
              </div>
              {form.channel_steps.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No steps yet</p>
              )}
              {form.channel_steps.map(s => (
                <div key={s.id} className="border rounded-md p-2 space-y-2 bg-muted/20">
                  <div className="grid grid-cols-4 gap-1">
                    <Select value={s.channel} disabled={form.is_built_in && !!form.id}
                      onValueChange={v => updateStep(s.id, { channel: v as ChannelKind })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CHANNEL_LABELS) as ChannelKind[]).map(c => (
                          <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" min={-7} max={30} value={s.day_offset} disabled={form.is_built_in && !!form.id}
                      onChange={e => updateStep(s.id, { day_offset: parseInt(e.target.value) || 0 })}
                      className="h-7 text-xs" placeholder="Day" />
                    <Input type="number" min={0} max={23} value={s.hour_of_day} disabled={form.is_built_in && !!form.id}
                      onChange={e => updateStep(s.id, { hour_of_day: parseInt(e.target.value) || 0 })}
                      className="h-7 text-xs" placeholder="Hour" />
                    <Button size="sm" variant="ghost" className="h-7 text-destructive"
                      disabled={form.is_built_in && !!form.id}
                      onClick={() => removeStep(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {s.channel === 'email' && (
                    <Input value={s.subject ?? ''} disabled={form.is_built_in && !!form.id}
                      onChange={e => updateStep(s.id, { subject: e.target.value })}
                      placeholder="Email subject" className="h-7 text-xs" />
                  )}
                  <Textarea rows={2} value={s.body} disabled={form.is_built_in && !!form.id}
                    onChange={e => updateStep(s.id, { body: e.target.value })}
                    placeholder="Message body — use {contact}, {product}, {entity}, {salesman}"
                    className="text-xs" />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" onClick={handleSave} disabled={form.is_built_in && !!form.id}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setForm(blankForm())}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CampaignTemplatesPanelComponent;
