/**
 * @file        src/pages/erp/maintainpro/transactions/CalibrationCertificate.tsx
 * @sprint      T-Phase-1.A.16b · Block E.3
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createCalibrationCertificate, listCalibrationCertificates } from '@/lib/maintainpro-engine';
import type { CalibrationCertificate as CC } from '@/types/maintainpro';

interface Props { onNavigate: (m: string) => void }
const E = 'DEMO';

export function CalibrationCertificate(_props: Props): JSX.Element {
  const [instrumentId, setInstrumentId] = useState('cal_inst_001');
  const [cost, setCost] = useState(2500);
  const [list, setList] = useState<CC[]>(listCalibrationCertificates(E));

  const submit = (): void => {
    createCalibrationCertificate(E, {
      certificate_no: `CERT/26-27/${String(list.length + 1).padStart(4, '0')}`,
      instrument_id: instrumentId,
      calibrated_on: new Date().toISOString().slice(0, 10),
      next_due_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      calibrated_by_vendor_id: null,
      calibrated_by_user_id: 'demo_user',
      pre_calibration_drift: '±0.5%',
      post_calibration_accuracy: '±0.1%',
      certificate_url: null,
      is_pass: true,
      cost,
      fincore_voucher_id: null,
      project_id: null,
    });
    setList(listCalibrationCertificates(E));
    toast.success('Certificate issued');
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Calibration Certificate</h1>
      <Card><CardContent className="p-4 space-y-3">
        <div className="space-y-1"><Label>Instrument ID</Label><Input value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} /></div>
        <div className="space-y-1"><Label>Cost (₹)</Label><Input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} /></div>
        <Button onClick={submit}>Issue Certificate</Button>
        <div className="text-xs font-mono">{list.length} certificates issued</div>
      </CardContent></Card>
    </div>
  );
}

export default CalibrationCertificate;
