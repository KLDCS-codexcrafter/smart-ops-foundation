/**
 * PartnerDeals.tsx — Deal registration with channel-conflict warn + stage transitions.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  getPartnerDeals,
  registerDeal,
  setDealStage,
} from '@/lib/partner-portal-engine';
import type { PartnerDeal, PartnerDealStage } from '@/types/partner-portal';

const STAGES: PartnerDealStage[] = ['registered', 'approved', 'won', 'lost', 'expired'];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function fmtINR(paise: number | null): string {
  if (paise === null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function PartnerDeals() {
  const [deals, setDeals] = useState<PartnerDeal[]>(() => getPartnerDeals());
  const [prospect, setProspect] = useState('');
  const [value, setValue] = useState('');

  function submit() {
    if (!prospect.trim()) {
      toast.error('Prospect name is required');
      return;
    }
    const value_paise = value.trim() ? Math.round(Number(value) * 100) : null;
    const { deal, warning } = registerDeal({ prospect_name: prospect, value_paise });
    if (warning) {
      toast.warning(warning);
      return;
    }
    if (deal) {
      setDeals(getPartnerDeals());
      setProspect('');
      setValue('');
      toast.success(`Deal ${deal.id} registered · protected for 90 days`);
    }
  }

  function moveStage(id: string, stage: PartnerDealStage) {
    setDeals(setDealStage(id, stage));
    toast.success(`Stage updated → ${stage}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Deal Registration</h1>
        <p className="text-sm text-muted-foreground">
          Register prospects to lock 90-day channel protection.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Register a new prospect</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="prospect">Prospect name</Label>
              <Input
                id="prospect"
                value={prospect}
                onChange={(e) => setProspect(e.target.value)}
                placeholder="e.g. Pune Auto Components"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="value">Estimated value (₹)</Label>
              <Input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 450000"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button onClick={submit} className="bg-orange-600 hover:bg-orange-700">
                Register deal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Registered deals</CardTitle></CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No deals registered yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-3">Deal</th>
                    <th className="text-left py-2 px-3">Prospect</th>
                    <th className="text-right py-2 px-3">Value</th>
                    <th className="text-left py-2 px-3">Registered</th>
                    <th className="text-left py-2 px-3">Protected until</th>
                    <th className="text-left py-2 px-3">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 px-3 font-mono text-xs">{d.id}</td>
                      <td className="py-2 px-3 font-medium">{d.prospect_name}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmtINR(d.value_paise)}</td>
                      <td className="py-2 px-3 font-mono text-xs">{fmtDate(d.registered_at)}</td>
                      <td className="py-2 px-3 font-mono text-xs">{fmtDate(d.protected_until)}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{d.stage}</Badge>
                          <Select value={d.stage} onValueChange={(s) => moveStage(d.id, s as PartnerDealStage)}>
                            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAGES.map((s) => (
                                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
