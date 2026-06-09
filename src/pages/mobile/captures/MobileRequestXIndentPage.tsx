/**
 * @file        src/pages/mobile/captures/MobileRequestXIndentPage.tsx
 * @purpose     AM.2 · mobile-gap persona · raise material indent on the go
 *              CONSUMES request-engine.createMaterialIndent + submitIndent
 * @sprint      AM.2 · T-AM2-Mobile-Captures · Pass 2
 * @canon       NO reimplement · delegation only
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createMaterialIndent, submitIndent } from '@/lib/request-engine';
import { VoiceNote } from '@/components/mobile/VoiceNote';

const E = 'DEMO';
const USER = 'mobile_user';

export default function MobileRequestXIndentPage(): JSX.Element {
  const navigate = useNavigate();
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(10000);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(): void {
    if (!itemName.trim()) return;
    setSubmitting(true);
    try {
      const input = {
        entity_id: E,
        voucher_type_id: 'MI',
        date: new Date().toISOString(),
        branch_id: 'main',
        division_id: 'default',
        originating_department_id: 'mobile',
        originating_department_name: 'Mobile',
        cost_center_id: 'default',
        category: 'raw_material',
        sub_type: 'mobile',
        priority: 'normal',
        requested_by_user_id: USER,
        requested_by_name: 'Mobile user',
        hod_user_id: 'hod',
        project_id: null,
        preferred_vendor_id: null,
        payment_terms: null,
        parent_indent_id: null,
        cascade_reason: null,
        justification,
        lines: [
          {
            id: `ln_${Date.now()}`,
            line_no: 1,
            item_id: `mob_${Date.now()}`,
            item_name: itemName,
            description: itemName,
            uom: 'NOS',
            qty,
            current_stock_qty: 0,
            estimated_rate: rate,
            estimated_value: qty * rate,
            required_date: new Date().toISOString(),
            schedule_qty: null,
            schedule_date: null,
            remarks: '',
            target_godown_id: '',
            target_godown_name: '',
            is_stocked: false,
            stock_check_status: 'pending',
            store_action: null,
            store_actor_id: null,
            store_action_at: null,
            parent_indent_line_id: null,
            cascade_reason: null,
          },
        ],
      };
      const indent = createMaterialIndent(
        input as unknown as Parameters<typeof createMaterialIndent>[0],
        E,
      );
      submitIndent(indent.id, 'material', E, USER);
      toast.success(`Indent ${indent.voucher_no} submitted`);
      navigate('/operix-go');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-bold">RequestX · Mobile Indent</h1>
      </header>

      <Card className="p-3 text-xs text-muted-foreground">
        Consumes <code className="font-mono">request-engine.createMaterialIndent</code> ·{' '}
        <code className="font-mono">submitIndent</code> · no logic re-implemented.
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <Label>Item description</Label>
          <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Qty</Label>
            <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
          <div>
            <Label>Rate (paise)</Label>
            <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <Label>Justification</Label>
          <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} />
        </div>
      </Card>

      <VoiceNote label="Voice justification (optional)" />

      <Button className="w-full" disabled={!itemName.trim() || submitting} onClick={handleSubmit}>
        <Send className="h-4 w-4 mr-1" /> Submit indent
      </Button>
    </div>
  );
}
