/**
 * @file   src/pages/erp/ecomx/marketplaces/EcomXMarketplacesPage.tsx
 * @sprint Sprint 153 · EcomX · marketplace registry CRUD
 */
import { useCallback, useMemo, useState } from 'react';
import { Store, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listMarketplaces, createMarketplace, setMarketplaceActive,
} from '@/lib/ecomx-engine';
import type { EcMarketplaceType, EcPartyMode } from '@/types/ecomx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPES: EcMarketplaceType[] = ['amazon', 'flipkart', 'meesho', 'myntra', 'jiomart', 'indiamart', 'quick_commerce', 'other'];

export function EcomXMarketplacesPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState<{ name: string; type: EcMarketplaceType; sellerId: string; partyMode: EcPartyMode }>({
    name: '', type: 'amazon', sellerId: '', partyMode: 'end_customer',
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => entityCode ? listMarketplaces(entityCode) : [], [entityCode, tick]);

  const onCreate = useCallback(() => {
    if (!entityCode) return;
    try {
      createMarketplace(entityCode, { name: form.name, type: form.type, sellerId: form.sellerId, partyMode: form.partyMode });
      toast.success(`Marketplace · ${form.name} created`);
      setForm({ name: '', type: 'amazon', sellerId: '', partyMode: 'end_customer' });
      setTick((t) => t + 1);
    } catch (e) { toast.error((e as Error).message); }
  }, [entityCode, form]);

  const onToggle = useCallback((id: string, isActive: boolean) => {
    if (!entityCode) return;
    setMarketplaceActive(entityCode, id, !isActive);
    setTick((t) => t + 1);
  }, [entityCode]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select an entity.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-10 animate-fade-in space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2"><Store className="h-5 w-5" /> Marketplaces</h1>
        <p className="text-sm text-muted-foreground mt-1">DP-EC-5 · partyMode end_customer auto-creates the consolidated B2C ledger party.</p>
      </header>

      <section className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-medium mb-3">Add marketplace</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Amazon India" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EcMarketplaceType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Seller ID</Label>
            <Input value={form.sellerId} onChange={(e) => setForm({ ...form, sellerId: e.target.value })} placeholder="A1B2C3..." />
          </div>
          <div>
            <Label className="text-xs">Party mode</Label>
            <Select value={form.partyMode} onValueChange={(v) => setForm({ ...form, partyMode: v as EcPartyMode })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="end_customer">end_customer (consolidated)</SelectItem>
                <SelectItem value="marketplace_operator">marketplace_operator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={onCreate} disabled={!form.name.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-medium mb-3">Registry ({rows.length})</h2>
        {rows.length === 0 ? (
          <div className="text-xs text-muted-foreground p-6 text-center">No marketplaces registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-left py-2">Name</th><th className="text-left">Type</th><th className="text-left">Party mode</th><th className="text-right">TDS 194-O %</th><th className="text-right">GST TCS %</th><th className="text-center">Active</th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-b border-border/40">
                    <td className="py-2 font-medium">{m.name}</td>
                    <td>{m.type}</td>
                    <td>{m.partyMode}</td>
                    <td className="text-right font-mono">{m.tds194oPct.toFixed(2)}</td>
                    <td className="text-right font-mono">{m.gstTcsPct.toFixed(2)}</td>
                    <td className="text-center">
                      <Button size="sm" variant={m.isActive ? 'default' : 'outline'} onClick={() => onToggle(m.id, m.isActive)}>
                        {m.isActive ? 'Active' : 'Paused'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
