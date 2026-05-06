/**
 * @file     MobileJobWorkOutPage.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block H · D-563 · Q17=a
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function MobileJobWorkOutPage(): JSX.Element {
  const navigate = useNavigate();
  const [vendorName, setVendorName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [sentQty, setSentQty] = useState('');

  const handleSave = (): void => {
    if (!vendorName || !itemCode || Number(sentQty) <= 0) { toast.error('Fill all fields'); return; }
    // [JWT] POST /api/production/job-work-out (mobile capture stub)
    toast.success(`JWO drafted for ${vendorName}`);
    navigate('/operix-go');
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <h1 className="text-xl font-bold">Job Work Out (Mobile)</h1>
      <Card className="p-4 space-y-3">
        <div><Label>Vendor Name</Label><Input value={vendorName} onChange={e => setVendorName(e.target.value)} /></div>
        <div><Label>Vendor GSTIN</Label><Input value={vendorGstin} onChange={e => setVendorGstin(e.target.value)} className="font-mono uppercase" /></div>
        <div><Label>Item Code</Label><Input value={itemCode} onChange={e => setItemCode(e.target.value)} className="font-mono" /></div>
        <div><Label>Sent Qty</Label><Input type="number" inputMode="decimal" value={sentQty} onChange={e => setSentQty(e.target.value)} className="font-mono" /></div>
        <Button className="w-full" size="lg" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save Draft</Button>
        <p className="text-xs text-muted-foreground">Full JWO entry with line-level sub-contract is on the desk console.</p>
      </Card>
    </div>
  );
}
