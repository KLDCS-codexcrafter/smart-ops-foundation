import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SerialNumber } from '@/types/serial-number';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serial: SerialNumber | null;
}

const SerialViewDialog: React.FC<Props> = ({ open, onOpenChange, serial }) => {
  if (!serial) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-keyboard-form>
        <DialogHeader>
          <DialogTitle className="font-mono">{serial.serial_number}</DialogTitle>
          <DialogDescription>{serial.item_name ?? 'Serial Unit'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="secondary" className="w-fit">{serial.status.replace('_', ' ')}</Badge>
            <span className="text-muted-foreground">Condition</span>
            <span>{serial.condition}</span>
            <span className="text-muted-foreground">Purchase Date</span>
            <span>{serial.purchase_date ?? '—'}</span>
            <span className="text-muted-foreground">Warranty End</span>
            <span>{serial.warranty_end_date ?? '—'}</span>
            {serial.notes && (
              <>
                <span className="text-muted-foreground">Notes</span>
                <span>{serial.notes}</span>
              </>
            )}
          </div>
        </div>

        {(serial.imei_1 || serial.imei_2 || serial.custom_field_1_value ||
          serial.custom_field_2_value || serial.current_custodian ||
          serial.grn_reference || serial.sales_reference) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Extended Identity</h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {serial.imei_1 && (
                  <>
                    <span className="text-muted-foreground">IMEI 1</span>
                    <span className="font-mono">{serial.imei_1}</span>
                  </>
                )}
                {serial.imei_2 && (
                  <>
                    <span className="text-muted-foreground">IMEI 2</span>
                    <span className="font-mono">{serial.imei_2}</span>
                  </>
                )}
                {serial.custom_field_1_value && (
                  <>
                    <span className="text-muted-foreground">
                      {serial.custom_field_1_label || 'Custom Field 1'}
                    </span>
                    <span>{serial.custom_field_1_value}</span>
                  </>
                )}
                {serial.custom_field_2_value && (
                  <>
                    <span className="text-muted-foreground">
                      {serial.custom_field_2_label || 'Custom Field 2'}
                    </span>
                    <span>{serial.custom_field_2_value}</span>
                  </>
                )}
                {serial.current_custodian && (
                  <>
                    <span className="text-muted-foreground">Custodian</span>
                    <span>{serial.current_custodian}</span>
                  </>
                )}
                {serial.grn_reference && (
                  <>
                    <span className="text-muted-foreground">GRN Ref</span>
                    <span className="font-mono">{serial.grn_reference}</span>
                  </>
                )}
                {serial.sales_reference && (
                  <>
                    <span className="text-muted-foreground">Sales Ref</span>
                    <span className="font-mono">{serial.sales_reference}</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SerialViewDialog;
