/**
 * @file        src/pages/erp/servicedesk/customer-hub/CustomerServiceTierPage.tsx
 * @purpose     C.1e · 4-tier management UI · OOB-10
 * @sprint      T-Phase-1.C.1e · Block E.3
 * @iso         Usability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  assignCustomerServiceTier,
  listCustomerTiers,
} from '@/lib/servicedesk-engine';
import { TIER_BENEFITS, type ServiceTierLevel } from '@/types/customer-service-tier';

const ENTITY = 'OPRX';
const TIERS: ServiceTierLevel[] = ['bronze', 'silver', 'gold', 'platinum'];

export function CustomerServiceTierPage(): JSX.Element {
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [newCustId, setNewCustId] = useState('');
  const [newTier, setNewTier] = useState<ServiceTierLevel>('bronze');
  const tiers = listCustomerTiers({ entity_id: ENTITY });

  const handleAssign = (): void => {
    if (!newCustId.trim()) {
      toast.error('Customer ID required');
      return;
    }
    assignCustomerServiceTier({
      entity_id: ENTITY,
      customer_id: newCustId.trim(),
      tier: newTier,
      assigned_at: new Date().toISOString(),
      assigned_by: 'current_user',
      sla_override_id: null,
      cascade_override_id: null,
      reminder_frequency_override: null,
      notes: '',
    });
    toast.success(`Tier ${newTier} assigned to ${newCustId}`);
    setOpen(false);
    setNewCustId('');
    setRefresh((r) => r + 1);
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in" key={refresh}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customer Service Tiers</h1>
          <p className="text-sm text-muted-foreground mt-1">{tiers.length} assignments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Assign Tier</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Customer Tier</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <Input placeholder="Customer ID" value={newCustId} onChange={(e) => setNewCustId(e.target.value)} />
              <div className="grid grid-cols-4 gap-2">
                {TIERS.map((t) => (
                  <Button key={t} variant={newTier === t ? 'default' : 'outline'} size="sm" onClick={() => setNewTier(t)}>
                    {TIER_BENEFITS[t].label}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter><Button onClick={handleAssign}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border"><tr className="text-left">
            <th className="p-3">Tier</th><th className="p-3">SLA Multiplier</th>
            <th className="p-3">Cascade Advance</th><th className="p-3">Priority Routing</th>
          </tr></thead>
          <tbody>{TIERS.map((t) => {
            const b = TIER_BENEFITS[t];
            return (
              <tr key={t} className="border-b border-border/50">
                <td className="p-3"><Badge variant="default">{b.label}</Badge></td>
                <td className="p-3 font-mono text-xs">×{b.sla_multiplier}</td>
                <td className="p-3 font-mono text-xs">{b.cascade_advance_days}d</td>
                <td className="p-3 text-xs">{b.priority_routing ? 'Yes' : 'No'}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>

      <Card className="glass-card overflow-x-auto">
        <h2 className="p-3 text-sm font-medium border-b border-border">Active Assignments</h2>
        {tiers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No tier assignments yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border"><tr className="text-left">
              <th className="p-3">Customer</th><th className="p-3">Tier</th><th className="p-3">Assigned</th><th className="p-3">By</th>
            </tr></thead>
            <tbody>{tiers.map((t) => (
              <tr key={t.id} className="border-b border-border/50">
                <td className="p-3 font-mono text-xs">{t.customer_id}</td>
                <td className="p-3"><Badge variant="default">{t.tier}</Badge></td>
                <td className="p-3 text-xs font-mono">{t.assigned_at.slice(0, 10)}</td>
                <td className="p-3 text-xs">{t.assigned_by}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
