/**
 * @file        src/pages/erp/maintainpro/masters/FireSafetyMaster.tsx
 * @purpose     Fire Safety · TDL 5 fields × 6 emergency equipment types · Indian Factory Act §38A · OOB-M6 cascade
 * @sprint      T-Phase-1.A.16a · Block E.3 · Q-LOCK-5
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listFireSafetyEquipment,
  createFireSafetyEquipment,
  getFireSafetyStatusComputed,
} from '@/lib/maintainpro-engine';
import type { FireSafetyEquipment, FireSafetyType } from '@/types/maintainpro';

interface Props {
  onNavigate: (m: string) => void;
}

const TYPES: Array<{ value: FireSafetyType; label: string }> = [
  { value: 'fire_extinguisher', label: 'Fire Extinguisher' },
  { value: 'fire_hydrant', label: 'Fire Hydrant' },
  { value: 'smoke_detector', label: 'Smoke Detector' },
  { value: 'emergency_light', label: 'Emergency Light' },
  { value: 'first_aid_box', label: 'First Aid Box' },
  { value: 'eye_wash_station', label: 'Eye Wash Station' },
];

const blank = {
  equipment_code: '',
  location: '',
  floor: '',
  capacity: '',
  installation_date: '',
  expiry_date: '',
};

export function FireSafetyMaster({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const [activeType, setActiveType] = useState<FireSafetyType>('fire_extinguisher');
  const [items, setItems] = useState<FireSafetyEquipment[]>(() =>
    entityCode ? listFireSafetyEquipment(entityCode) : [],
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);

  const handleCreate = (): void => {
    if (!entityCode) {
      toast.error('Select an active company first');
      return;
    }
    if (!form.equipment_code || !form.location || !form.expiry_date) {
      toast.error('Code, location, and expiry date required');
      return;
    }
    const created = createFireSafetyEquipment(entityCode, {
      type: activeType,
      ...form,
      refilling_vendor_id: null,
      last_inspection_date: null,
      next_inspection_date: null,
      linked_site_id: null,
      description: '',
    });
    setItems([...items, created]);
    setShowForm(false);
    setForm(blank);
    toast.success(`Fire safety unit ${created.equipment_code} created`);
  };

  const filtered = items.filter((i) => i.type === activeType);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="h-6 w-6 text-cyan-600" />
          <div>
            <h2 className="text-xl font-bold">Fire Safety & Emergency Equipment</h2>
            <p className="text-xs text-muted-foreground">
              TDL 5 fields × 6 types · Indian Factory Act §38A compliant · 90/30/day cascade alerts
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('welcome')}>
            Back
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> New Unit
          </Button>
        </div>
      </div>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as FireSafetyType)}>
        <TabsList className="flex-wrap h-auto">
          {TYPES.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TYPES.map((t) => (
          <TabsContent key={t.value} value={t.value} className="space-y-4">
            {showForm && activeType === t.value && (
              <Card className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Equipment Code *</Label>
                    <Input
                      value={form.equipment_code}
                      onChange={(e) => setForm({ ...form, equipment_code: e.target.value })}
                      placeholder="FS/26-27/0001"
                    />
                  </div>
                  <div>
                    <Label>Location *</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Floor</Label>
                    <Input
                      value={form.floor}
                      onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Capacity</Label>
                    <Input
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      placeholder="6 kg"
                    />
                  </div>
                  <div>
                    <Label>Installation Date</Label>
                    <Input
                      type="date"
                      value={form.installation_date}
                      onChange={(e) =>
                        setForm({ ...form, installation_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Expiry Date *</Label>
                    <Input
                      type="date"
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
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
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No {t.label.toLowerCase()} units registered.
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((item) => {
                    const computed = getFireSafetyStatusComputed(item);
                    const variant =
                      computed === 'expired'
                        ? 'destructive'
                        : computed === 'warning_30d'
                          ? 'outline'
                          : computed === 'warning_90d'
                            ? 'secondary'
                            : 'secondary';
                    return (
                      <div
                        key={item.id}
                        className="p-3 flex items-start justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{item.equipment_code}</span>
                            <span className="text-sm font-medium">{item.location}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Floor {item.floor || '—'} · Capacity {item.capacity || '—'} ·
                            Expires <span className="font-mono">{item.expiry_date}</span>
                          </div>
                        </div>
                        <Badge variant={variant} className="text-xs">
                          {computed.replace('_', ' ')}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
