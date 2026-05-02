/**
 * @file     VoucherClassPicker.tsx — Voucher type dropdown for transaction forms
 * @sprint   T-Phase-2.7-b · OOB-2 · Q1-b progressive disclosure
 * @purpose  When entity has > 1 active voucher type for the form's family,
 *           show a dropdown so operator can pick. When only 1 voucher type,
 *           component returns null (90% of users never see it).
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import {
  getVoucherTypesForFamily,
  type NonFineCoreVoucherFamily,
  type NonFineCoreVoucherType,
} from '@/lib/non-finecore-voucher-type-registry';

interface Props {
  entityCode: string;
  family: NonFineCoreVoucherFamily;
  voucherTypeId: string | null;
  voucherTypeName: string | null;
  onChange: (id: string | null, name: string | null, vt: NonFineCoreVoucherType | null) => void;
  className?: string;
  /** Force-show even when only 1 type · used by Voucher Class Master preview. */
  forceShow?: boolean;
}

export function VoucherClassPicker({
  entityCode, family, voucherTypeId, onChange, className, forceShow,
}: Props) {
  const types = useMemo(
    () => getVoucherTypesForFamily(entityCode, family),
    [entityCode, family],
  );

  // Q1-b · Progressive disclosure: hidden when only 1 active type
  if (!forceShow && types.length <= 1) return null;

  const current = types.find(t => t.id === voucherTypeId) ?? types.find(t => t.is_default) ?? null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Voucher Class</span>
          {current && (
            <Badge variant="outline" className="font-mono text-xs">{current.prefix}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <Label className="text-xs">Type</Label>
          <Select
            value={voucherTypeId ?? current?.id ?? ''}
            onValueChange={v => {
              const vt = types.find(t => t.id === v) ?? null;
              onChange(vt?.id ?? null, vt?.display_name ?? null, vt);
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {types.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <span>{t.display_name}</span>
                    {t.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {current?.default_terms && (
          <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
            <strong>Default terms:</strong> {current.default_terms}
          </div>
        )}
        {current?.default_payment_terms && (
          <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
            <strong>Payment terms:</strong> {current.default_payment_terms}
          </div>
        )}
        {current?.approval_threshold_value && current.approval_threshold_value > 0 && (
          <div className="text-xs text-warning p-2 bg-warning/10 rounded flex items-start gap-1">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Above ₹{(current.approval_threshold_value / 100000).toFixed(1)}L · approval required from {current.approval_role}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
