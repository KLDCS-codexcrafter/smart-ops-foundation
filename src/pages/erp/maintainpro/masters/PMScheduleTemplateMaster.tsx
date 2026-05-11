/**
 * @file        src/pages/erp/maintainpro/masters/PMScheduleTemplateMaster.tsx
 * @purpose     PM Schedule Template · 4-axis trigger (calendar + meter + usage + season) · OOB-M10 Phase 1 calendar
 * @sprint      T-Phase-1.A.16a · Block E.4
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listPMScheduleTemplates,
  createPMScheduleTemplate,
} from '@/lib/maintainpro-engine';
import type {
  PMScheduleTemplate,
  CalibrationFrequencyUnit,
} from '@/types/maintainpro';

interface Props {
  onNavigate: (m: string) => void;
}

export function PMScheduleTemplateMaster({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const [items, setItems] = useState<PMScheduleTemplate[]>(() =>
    entityCode ? listPMScheduleTemplates(entityCode) : [],
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    template_code: '',
    template_name: '',
    description: '',
    calendar_value: 90,
    calendar_unit: 'days' as CalibrationFrequencyUnit,
  });

  const handleCreate = (): void => {
    if (!entityCode) {
      toast.error('Select an active company first');
      return;
    }
    if (!form.template_code || !form.template_name) {
      toast.error('Code and name required');
      return;
    }
    const created = createPMScheduleTemplate(entityCode, {
      template_code: form.template_code,
      template_name: form.template_name,
      description: form.description,
      applies_to_categories: ['mechanical'],
      axes: [
        {
          axis: 'calendar',
          calendar_interval_value: form.calendar_value,
          calendar_interval_unit: form.calendar_unit,
        },
      ],
      activities: [],
    });
    setItems([...items, created]);
    setShowForm(false);
    toast.success(`Template ${created.template_code} created`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-cyan-600" />
          <div>
            <h2 className="text-xl font-bold">PM Schedule Template Master</h2>
            <p className="text-xs text-muted-foreground">
              4-axis trigger model (calendar · meter · usage · season) · Phase 1 calendar live ·
              meter/usage/season backend Phase 2
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('welcome')}>
            Back
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Template Code *</Label>
              <Input
                value={form.template_code}
                onChange={(e) => setForm({ ...form, template_code: e.target.value })}
                placeholder="PMT/26-27/0001"
              />
            </div>
            <div>
              <Label>Template Name *</Label>
              <Input
                value={form.template_name}
                onChange={(e) => setForm({ ...form, template_name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Calendar Interval</Label>
              <Input
                type="number"
                value={form.calendar_value}
                onChange={(e) =>
                  setForm({ ...form, calendar_value: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Interval Unit</Label>
              <Select
                value={form.calendar_unit}
                onValueChange={(v) =>
                  setForm({ ...form, calendar_unit: v as CalibrationFrequencyUnit })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                  <SelectItem value="years">Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate}>
              Save
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No PM templates registered.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="p-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{item.template_code}</span>
                    <span className="text-sm font-medium">{item.template_name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.description || '—'}
                  </div>
                </div>
                <div className="flex gap-1">
                  {item.axes.map((axis) => (
                    <Badge
                      key={`${item.id}-${axis.axis}`}
                      variant="secondary"
                      className="text-xs"
                    >
                      {axis.axis}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
