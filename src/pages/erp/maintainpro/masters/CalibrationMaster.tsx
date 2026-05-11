/**
 * @file        src/pages/erp/maintainpro/masters/CalibrationMaster.tsx
 * @purpose     Calibration Instruments · TDL EXACT 9 fields · NABL audit-ready · OOB-M5 auto-quarantine
 * @sprint      T-Phase-1.A.16a · Block E.2 · Q-LOCK-5 · FR-42
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listCalibrationInstruments,
  createCalibrationInstrument,
  getCalibrationStatusComputed,
} from '@/lib/maintainpro-engine';
import type { CalibrationInstrument } from '@/types/maintainpro';

interface Props {
  onNavigate: (m: string) => void;
}

const blankForm = {
  instrument_code: '',
  test_equipment: '',
  calibrated_from: '',
  range: '',
  least_count: '',
  accuracy: '',
  calibration_frequency: '',
  method: '',
  calibrated_on: '',
  due_date: '',
};

export function CalibrationMaster({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const [items, setItems] = useState<CalibrationInstrument[]>(() =>
    entityCode ? listCalibrationInstruments(entityCode) : [],
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);

  const handleCreate = (): void => {
    if (!entityCode) {
      toast.error('Select an active company first');
      return;
    }
    if (!form.instrument_code || !form.test_equipment || !form.due_date) {
      toast.error('Code, test equipment, and due date required');
      return;
    }
    const created = createCalibrationInstrument(entityCode, {
      ...form,
      linked_equipment_id: null,
      certificate_url: null,
      next_calibration_vendor_id: null,
      description: '',
    });
    setItems([...items, created]);
    setShowForm(false);
    setForm(blankForm);
    toast.success(`Instrument ${created.instrument_code} created`);
  };

  const sorted = [...items].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-cyan-600" />
          <div>
            <h2 className="text-xl font-bold">Calibration Instruments</h2>
            <p className="text-xs text-muted-foreground">
              TDL 9 fields exact · NABL / ISO 17025 audit-ready · auto-quarantine on overdue
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('welcome')}>
            Back
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> New Instrument
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Instrument Code *</Label>
              <Input
                value={form.instrument_code}
                onChange={(e) => setForm({ ...form, instrument_code: e.target.value })}
                placeholder="CAL/26-27/0001"
              />
            </div>
            <div>
              <Label>Test Equipment *</Label>
              <Input
                value={form.test_equipment}
                onChange={(e) => setForm({ ...form, test_equipment: e.target.value })}
              />
            </div>
            <div>
              <Label>Calibrated From</Label>
              <Input
                value={form.calibrated_from}
                onChange={(e) => setForm({ ...form, calibrated_from: e.target.value })}
              />
            </div>
            <div>
              <Label>Range</Label>
              <Input
                value={form.range}
                onChange={(e) => setForm({ ...form, range: e.target.value })}
                placeholder="0-200 bar"
              />
            </div>
            <div>
              <Label>Least Count</Label>
              <Input
                value={form.least_count}
                onChange={(e) => setForm({ ...form, least_count: e.target.value })}
              />
            </div>
            <div>
              <Label>Accuracy</Label>
              <Input
                value={form.accuracy}
                onChange={(e) => setForm({ ...form, accuracy: e.target.value })}
                placeholder="±0.5%"
              />
            </div>
            <div>
              <Label>Calibration Frequency</Label>
              <Input
                value={form.calibration_frequency}
                onChange={(e) => setForm({ ...form, calibration_frequency: e.target.value })}
                placeholder="12 months"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Input
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                placeholder="ISO 17025"
              />
            </div>
            <div>
              <Label>Calibrated On</Label>
              <Input
                type="date"
                value={form.calibrated_on}
                onChange={(e) => setForm({ ...form, calibrated_on: e.target.value })}
              />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
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
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No instruments registered.
          </div>
        ) : (
          <div className="divide-y">
            {sorted.map((item) => {
              const computed = getCalibrationStatusComputed(item);
              const variant =
                computed === 'quarantined'
                  ? 'destructive'
                  : computed === 'overdue'
                    ? 'outline'
                    : 'secondary';
              return (
                <div key={item.id} className="p-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{item.instrument_code}</span>
                      <span className="text-sm font-medium">{item.test_equipment}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Range {item.range || '—'} · Accuracy {item.accuracy || '—'} · Due{' '}
                      <span className="font-mono">{item.due_date}</span>
                    </div>
                  </div>
                  <Badge variant={variant} className="text-xs">
                    {computed}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
