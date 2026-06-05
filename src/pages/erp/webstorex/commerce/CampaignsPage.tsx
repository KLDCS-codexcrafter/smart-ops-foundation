/**
 * @file        src/pages/erp/webstorex/commerce/CampaignsPage.tsx
 * @sprint      Sprint 150 · T-WebStoreX-A11.2 · DP-WS-11
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listCampaigns, createCampaign, deleteCampaign, getActiveCampaign,
} from '@/lib/webstorex-commerce-engine';
import type { WsCampaign } from '@/types/webstorex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

export function CampaignsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [open, setOpen] = useState(false);

  const all = useMemo<WsCampaign[]>(
    () => entityCode ? listCampaigns(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );
  const active = entityCode ? getActiveCampaign(entityCode) : null;

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Campaigns</h1>
          <p className="text-xs text-muted-foreground">{all.length} campaign{all.length === 1 ? '' : 's'} · {active ? `Active now: ${active.name}` : 'None active'}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New campaign</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {all.length === 0 ? (
          <Card className="glass-card md:col-span-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">No campaigns yet.</CardContent></Card>
        ) : all.map((c) => {
          const now = new Date().toISOString();
          const isActive = c.isActive && now >= c.startsAt && now <= c.endsAt;
          return (
            <Card key={c.id} className="glass-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{c.startsAt.slice(0, 10)} → {c.endsAt.slice(0, 10)}</p>
                  </div>
                  <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Live' : 'Off'}</Badge>
                </div>
                {c.bannerDataUrl && <img src={c.bannerDataUrl} alt={c.name} className="w-full rounded-lg max-h-40 object-cover" />}
                <p className="text-xs text-muted-foreground">{c.collectionItemIds.length} item(s) · {c.offerPrices.length} offer price(s)</p>
                <Button size="sm" variant="ghost" onClick={() => { deleteCampaign(entityCode, c.id); reload(); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Remove
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <NewCampaignDialog open={open} onOpenChange={setOpen} entityCode={entityCode} onDone={reload} />
    </div>
  );
}

function NewCampaignDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; entityCode: string; onDone: () => void }): JSX.Element {
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));

  const submit = (): void => {
    try {
      createCampaign(props.entityCode, {
        name: name.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        bannerDataUrl: null, collectionItemIds: [], offerPrices: [], isActive: true,
      });
      toast.success('Campaign created');
      setName(''); props.onOpenChange(false); props.onDone();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New campaign</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Starts</Label><Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
            <div><Label>Ends</Label><Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Add banner + collection + offer prices inline after creation in a future iteration.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
