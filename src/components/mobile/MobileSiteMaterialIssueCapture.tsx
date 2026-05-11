/**
 * @file        src/components/mobile/MobileSiteMaterialIssueCapture.tsx
 * @purpose     Mobile Material Issue · 5-step · offline-queue institutional resilience (Q-LOCK-6a)
 * @sprint      T-Phase-1.A.15b SiteX Closeout (mobile) · Q-LOCK-2a + Q-LOCK-6a · Block E
 * @reuses      offline-queue-engine ZERO-TOUCH · SiteMaterialIssue from @/types/sitex · listSites
 * @[JWT]       POST /api/sitex/material-issues
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { listSites } from '@/lib/sitex-engine';
import { enqueueWrite, getQueueSize } from '@/lib/offline-queue-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { sitexMaterialIssuesKey, type SiteMaterialIssue, type SiteMaster } from '@/types/sitex';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

export default function MobileSiteMaterialIssueCapture(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [sites, setSites] = useState<SiteMaster[]>([]);
  const [siteId, setSiteId] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [issuedTo, setIssuedTo] = useState('');
  const [purpose, setPurpose] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    setSites(listSites(ENTITY).filter((s) => s.status === 'active' || s.status === 'mobilizing'));
    const on = (): void => setIsOnline(true);
    const off = (): void => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    setQueueSize(getQueueSize());
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const site = sites.find((s) => s.id === siteId) ?? null;

  const canProceed = (s: number): boolean => {
    if (s === 1) return true;
    if (s === 2) return !!siteId;
    if (s === 3) return itemName.length > 1 && quantity > 0 && issuedTo.length > 1;
    if (s === 4) return true;
    return false;
  };

  const submit = (): void => {
    if (!site) return;
    const issue: SiteMaterialIssue = {
      id: `MI-${Date.now()}`,
      site_id: site.id,
      entity_id: site.entity_id,
      item_id: `item-${itemName.toLowerCase().replace(/\s+/g, '-')}`,
      item_name: itemName,
      quantity,
      issued_to: issuedTo,
      purpose,
      photo_url: photoUrl,
      issued_by: 'site_engineer',
      issued_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    if (!isOnline) {
      enqueueWrite(ENTITY, 'order_place', { kind: 'sitex_material_issue', payload: issue });
      setQueueSize(getQueueSize());
      toast.success('Queued · will sync when online');
    } else {
      // [JWT] POST /api/sitex/material-issues
      const key = sitexMaterialIssuesKey(ENTITY);
      const all = JSON.parse(localStorage.getItem(key) ?? '[]') as SiteMaterialIssue[];
      all.push(issue);
      localStorage.setItem(key, JSON.stringify(all));
      toast.success(`Issue ${issue.id} captured`);
    }
    navigate('/operix-go/site-engineer');
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="flex items-center gap-2 text-xs">
          {isOnline ? <Wifi className="h-3 w-3 text-success" /> : <WifiOff className="h-3 w-3 text-warning" />}
          {queueSize > 0 && <span className="text-warning">{queueSize} queued</span>}
          <span className="text-muted-foreground">Step {step} / 5</span>
        </div>
      </header>
      <h1 className="text-lg font-bold">Material Issue</h1>

      {step === 1 && <Card className="p-4 text-sm">Field material issue · works offline · 3-retry auto-sync when connectivity restored.</Card>}
      {step === 2 && (
        <Card className="p-4 space-y-3">
          <Label>Site</Label>
          <Select value={siteId} onValueChange={setSiteId} sites={sites} />
        </Card>
      )}
      {step === 3 && (
        <Card className="p-4 space-y-3">
          <Label>Item</Label>
          <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <Label>Quantity</Label>
          <Input type="number" value={quantity || ''} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} />
          <Label>Issued to</Label>
          <Input value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} placeholder="Worker / sub-contractor" />
          <Label>Purpose</Label>
          <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          <Button variant="outline" className="w-full" onClick={() => setPhotoUrl(`mock://mi-${Date.now()}.jpg`)}>
            <Camera className="h-4 w-4 mr-2" />{photoUrl ? 'Photo captured' : 'Capture photo'}
          </Button>
        </Card>
      )}
      {step === 4 && site && (
        <Card className="p-4 space-y-2 text-sm">
          <div><strong>Site:</strong> {site.site_name}</div>
          <div><strong>Item:</strong> {itemName} × {quantity}</div>
          <div><strong>To:</strong> {issuedTo}</div>
          <div className="text-xs text-muted-foreground">{purpose}</div>
        </Card>
      )}
      {step === 5 && (
        <Card className="p-4 text-center space-y-3">
          {!isOnline && <div className="text-xs text-warning">Offline · will queue</div>}
          <Button onClick={submit} className="w-full">Submit Issue</Button>
        </Card>
      )}

      <div className="flex gap-2">
        {step > 1 && <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)} className="flex-1">Back</Button>}
        {step < 5 && <Button onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)} disabled={!canProceed(step)} className="flex-1">Next<ArrowRight className="h-4 w-4 ml-1" /></Button>}
      </div>
    </div>
  );
}

function Select({ value, onValueChange, sites }: { value: string; onValueChange: (v: string) => void; sites: SiteMaster[] }): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="w-full border rounded-md p-2 bg-background text-sm"
    >
      <option value="">Select site</option>
      {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name}</option>)}
    </select>
  );
}
