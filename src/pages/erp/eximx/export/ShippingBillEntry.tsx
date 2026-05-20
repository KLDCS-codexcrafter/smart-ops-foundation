/**
 * @file        src/pages/erp/eximx/export/ShippingBillEntry.tsx
 * @purpose     New SB entry · cross-master picker
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowLeft, Shield } from 'lucide-react';
import type { ShippingBillType } from '@/types/shipping-bill';

const SB_TYPES: ShippingBillType[] = ['free', 'drawback', 'dfia_advance_authorization'];

export function ShippingBillEntry(): JSX.Element {
  const navigate = useNavigate();
  const [sbType, setSbType] = useState<ShippingBillType>('free');
  const [exportPOId, setExportPOId] = useState('expo-sinha-001');
  const [polPort, setPOL] = useState('INMUN');
  const [isSelfSealing, setIsSelfSealing] = useState(false);
  const [authNo, setAuthNo] = useState('');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/erp/eximx/export/shipping-bills')}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <Button><Save className="w-4 h-4 mr-2" />Save &amp; Submit to ICEGATE</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>New Shipping Bill</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>SB Type</Label>
              <Select value={sbType} onValueChange={(v) => setSbType(v as ShippingBillType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SB_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Source Export PO</Label><Input value={exportPOId} onChange={(e) => setExportPOId(e.target.value)} /></div>
            <div><Label>Port of Loading</Label><Input value={polPort} onChange={(e) => setPOL(e.target.value)} /></div>
            <div><Label>Filing Date</Label><Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          </div>

          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div><Label className="text-base"><Shield className="w-4 h-4 inline mr-2" />Self-Sealing Facility (v7 Gap #10)</Label>
                  <p className="text-xs text-muted-foreground mt-1">AEO-approved exporters can self-seal containers · CBIC permits skipping CFS examination</p>
                </div>
                <Switch checked={isSelfSealing} onCheckedChange={setIsSelfSealing} />
              </div>
              {isSelfSealing && (
                <div><Label>Self-Sealing Authorization No</Label>
                  <Input value={authNo} onChange={(e) => setAuthNo(e.target.value)} placeholder="AEO-SS-AUTH-YYYY-IN-NNNN" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-4 text-sm">
              <strong>On save:</strong> Will create LEO (4-state · pending) · simulate ICEGATE 200ms · assign RMS lane · trigger CoO legalization workflow based on destination country rule. <Badge variant="outline" className="ml-2">8-way integration</Badge>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
