/**
 * @file        src/pages/erp/maintainpro/masters/EquipmentMaster.tsx
 * @purpose     Equipment Master CRUD · 35 fields · cross-card hookpoints · genealogy tree
 * @sprint      T-Phase-1.A.16a · Block D · Q-LOCK-4 + Q-LOCK-7
 * @whom        Audit Owner
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Wrench, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listEquipment,
  createEquipment,
  getEquipmentDescendants,
  isEquipmentInWarranty,
} from '@/lib/maintainpro-engine';
import type { Equipment } from '@/types/maintainpro';

interface Props {
  onNavigate: (m: string) => void;
}

export function EquipmentMaster({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const [items, setItems] = useState<Equipment[]>(() =>
    entityCode ? listEquipment(entityCode) : [],
  );
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    equipment_code: '',
    equipment_name: '',
    make: '',
    model: '',
    location: '',
  });

  const handleCreate = (): void => {
    if (!entityCode) {
      toast.error('Select an active company first');
      return;
    }
    if (!form.equipment_code || !form.equipment_name) {
      toast.error('Equipment code and name required');
      return;
    }
    const created = createEquipment(entityCode, {
      equipment_code: form.equipment_code,
      equipment_name: form.equipment_name,
      equipment_class: 'machine',
      category: 'mechanical',
      make: form.make,
      model: form.model,
      year_of_mfg: new Date().getFullYear(),
      serial_no: '',
      location: form.location,
      floor: '',
      range_or_capacity: '',
      current_location: form.location,
      linked_site_id: null,
      linked_project_id: null,
      linked_drawing_id: null,
      linked_bom_id: null,
      custodian_user_id: null,
      parent_equipment_id: null,
      purchase_cost: 0,
      installation_date: new Date().toISOString().slice(0, 10),
      warranty_start: '',
      warranty_end: '',
      amc_vendor_id: null,
      amc_contract_start: null,
      amc_contract_end: null,
      amc_contract_value: null,
      operational_status: 'running',
      meter_reading: null,
      meter_unit: null,
      meter_last_updated: null,
      pm_schedule_template_id: null,
      last_breakdown_date: null,
      last_pm_date: null,
      next_pm_due_date: null,
      breakdown_count_12m: 0,
      uptime_pct_12m: 100,
      total_breakdown_minutes_12m: 0,
      calibration_instrument_id: null,
      kw_rating: null,
      description: '',
    });
    setItems([...items, created]);
    setShowForm(false);
    setForm({ equipment_code: '', equipment_name: '', make: '', model: '', location: '' });
    toast.success(`Equipment ${created.equipment_code} created`);
  };

  const toggleExpand = (id: string): void => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-cyan-600" />
          <div>
            <h2 className="text-xl font-bold">Equipment Master</h2>
            <p className="text-xs text-muted-foreground">
              35-field asset register · ProjX deep wiring · genealogy tree (OOB-M11)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('welcome')}>
            Back
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> New Equipment
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Equipment Code *</Label>
              <Input
                value={form.equipment_code}
                onChange={(e) => setForm({ ...form, equipment_code: e.target.value })}
                placeholder="EQ/26-27/0001"
              />
            </div>
            <div>
              <Label>Equipment Name *</Label>
              <Input
                value={form.equipment_name}
                onChange={(e) => setForm({ ...form, equipment_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Make</Label>
              <Input
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
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
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No equipment registered. Click "New Equipment" to add the first asset.
          </div>
        ) : (
          <div className="divide-y">
            {items
              .filter((e) => !e.parent_equipment_id)
              .map((item) => {
                const descendants = entityCode
                  ? getEquipmentDescendants(entityCode, item.id)
                  : [];
                const hasChildren = descendants.length > 0;
                return (
                  <div key={item.id} className="p-3">
                    <div className="flex items-center gap-3">
                      {hasChildren ? (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="p-0.5 hover:bg-accent rounded"
                        >
                          {expanded[item.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <span className="w-5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{item.equipment_code}</span>
                          <span className="text-sm font-medium">{item.equipment_name}</span>
                          {isEquipmentInWarranty(item) && (
                            <Badge variant="outline" className="text-xs">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              In Warranty
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.make} · {item.model} · {item.location || '—'} ·{' '}
                          <span className="font-mono">{item.operational_status}</span>
                        </div>
                      </div>
                    </div>
                    {expanded[item.id] && hasChildren && (
                      <div className="ml-8 mt-2 space-y-1">
                        {descendants.map((d) => (
                          <div
                            key={d.id}
                            className="text-xs text-muted-foreground border-l pl-3 py-1"
                          >
                            <span className="font-mono">{d.equipment_code}</span> · {d.equipment_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </div>
  );
}
