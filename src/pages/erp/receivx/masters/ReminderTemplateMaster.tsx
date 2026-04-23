/**
 * ReminderTemplateMaster.tsx — Cadence template editor
 */
import { useState, useMemo, useCallback } from 'react';
import { Plus, Save, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  receivxTemplatesKey, type ReminderTemplate, type CadenceMessage, type CadenceStep,
} from '@/types/receivx';

interface Props { entityCode: string }

const DEFAULT_STEPS: CadenceStep[] = ['D-3', 'D+0', 'D+7', 'D+15', 'D+30'];
const DEFAULT_BODIES: Record<CadenceStep, string> = {
  'D-3':  'Dear {{party_name}}, gentle reminder — invoice {{invoice_no}} for {{amount}} is due on {{due_date}}.',
  'D+0':  'Dear {{party_name}}, invoice {{invoice_no}} for {{amount}} is due today. Kindly arrange payment.',
  'D+7':  'Dear {{party_name}}, invoice {{invoice_no}} ({{amount}}) is now {{days_overdue}} days overdue. Please process at earliest.',
  'D+15': 'Dear {{party_name}}, urgent — invoice {{invoice_no}} ({{amount}}) is {{days_overdue}} days overdue.',
  'D+30': 'Dear {{party_name}}, invoice {{invoice_no}} ({{amount}}) is {{days_overdue}} days overdue. Kindly clear immediately.',
  'D+45': 'Final notice — invoice {{invoice_no}} ({{amount}}) {{days_overdue}} days overdue.',
  'D+60': 'Account on hold — invoice {{invoice_no}} ({{amount}}) {{days_overdue}} days overdue.',
};

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/receivx/templates
    return JSON.parse(localStorage.getItem(k) || '[]');
  } catch { return []; }
}

export function ReminderTemplateMasterPanel({ entityCode }: Props) {
  const [templates, setTemplates] = useState<ReminderTemplate[]>(() => {
    const list = ls<ReminderTemplate>(receivxTemplatesKey(entityCode));
    if (list.length === 0) {
      const now = new Date().toISOString();
      const seeded: ReminderTemplate = {
        id: `tpl-${Date.now()}`, entity_id: entityCode,
        template_code: 'STANDARD-30', template_name: 'Standard 30-day cadence',
        description: 'Default professional B2B cadence',
        messages: DEFAULT_STEPS.map(s => ({
          step: s, channel: 'whatsapp', subject: null,
          body: DEFAULT_BODIES[s], send_time: '10:00', is_active: true,
        })),
        escalation_after_days: 30, is_default: true, is_active: true,
        created_at: now, updated_at: now,
      };
      try {
        // [JWT] POST /api/receivx/templates
        localStorage.setItem(receivxTemplatesKey(entityCode), JSON.stringify([seeded]));
      } catch { /* noop */ }
      return [seeded];
    }
    return list;
  });
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null);

  const selected = useMemo(() => templates.find(t => t.id === selectedId) ?? null, [templates, selectedId]);

  const persist = useCallback((next: ReminderTemplate[]) => {
    setTemplates(next);
    try {
      // [JWT] POST /api/receivx/templates
      localStorage.setItem(receivxTemplatesKey(entityCode), JSON.stringify(next));
    } catch { toast.error('Save failed'); }
  }, [entityCode]);

  const handleSave = useCallback(() => {
    if (!selected) return;
    persist(templates.map(t => t.id === selected.id ? { ...selected, updated_at: new Date().toISOString() } : t));
    toast.success('Template saved');
  }, [selected, templates, persist]);

  useCtrlS(selected ? handleSave : () => {});

  const updateMsg = (idx: number, patch: Partial<CadenceMessage>) => {
    if (!selected) return;
    const next = { ...selected, messages: selected.messages.map((m, i) => i === idx ? { ...m, ...patch } : m) };
    setTemplates(templates.map(t => t.id === next.id ? next : t));
  };

  const addTemplate = () => {
    const now = new Date().toISOString();
    const t: ReminderTemplate = {
      id: `tpl-${Date.now()}`, entity_id: entityCode,
      template_code: `TPL-${templates.length + 1}`, template_name: 'New Template',
      description: '', messages: [], escalation_after_days: null,
      is_default: false, is_active: true, created_at: now, updated_at: now,
    };
    persist([...templates, t]);
    setSelectedId(t.id);
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Reminder Templates</h1>
          <p className="text-xs text-muted-foreground">Cadence-based collection messaging</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addTemplate}><Plus className="h-3.5 w-3.5 mr-1" />New</Button>
          <Button data-primary size="sm" onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">
            <Save className="h-3.5 w-3.5 mr-1" />Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-4 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Templates ({templates.length})</p>
          <div className="space-y-1">
            {templates.map(t => (
              <button key={t.id} onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-2 rounded text-xs ${selectedId === t.id ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'hover:bg-muted'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.template_name}</span>
                  {t.is_default && <Badge variant="outline" className="text-[9px]">Default</Badge>}
                </div>
                <p className="text-muted-foreground text-[10px] mt-0.5">{t.template_code}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="col-span-8 p-4">
          {!selected ? (
            <p className="text-xs text-muted-foreground text-center py-8">Select a template</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Code</Label>
                  <Input className="text-xs mt-1" value={selected.template_code} onKeyDown={onEnterNext}
                    onChange={e => setTemplates(templates.map(t => t.id === selected.id ? { ...selected, template_code: e.target.value } : t))} />
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input className="text-xs mt-1" value={selected.template_name} onKeyDown={onEnterNext}
                    onChange={e => setTemplates(templates.map(t => t.id === selected.id ? { ...selected, template_name: e.target.value } : t))} />
                </div>
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1"><Bell className="h-3 w-3 text-amber-500" />Cadence Messages</Label>
                <div className="space-y-3 mt-2">
                  {selected.messages.map((m, idx) => (
                    <div key={`${selected.id}-${m.step}`} className="border rounded p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{m.step}</Badge>
                        <Badge variant="outline" className="text-[10px]">{m.channel}</Badge>
                        <Input className="text-xs h-7 w-20" value={m.send_time} onKeyDown={onEnterNext}
                          onChange={e => updateMsg(idx, { send_time: e.target.value })} />
                      </div>
                      <Textarea className="text-xs min-h-[60px]" value={m.body}
                        onChange={e => updateMsg(idx, { body: e.target.value })} />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Placeholders: {'{{party_name}} {{invoice_no}} {{amount}} {{due_date}} {{days_overdue}}'}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ReminderTemplateMaster() {
  return <ReminderTemplateMasterPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
