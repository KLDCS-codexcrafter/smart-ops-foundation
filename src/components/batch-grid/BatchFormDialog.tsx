import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { Batch, BatchFormData } from '@/types/batch';

const formSchema = z.object({
  batch_number: z.string().min(1, 'Required'),
  stock_item_name: z.string().min(1, 'Required'),
  manufacturing_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0),
  unit: z.string().min(1, 'Required'),
  status: z.enum(['active', 'expired', 'consumed', 'quarantine']),
  notes: z.string().optional().nullable(),
  lot_number: z.string().optional().nullable(),
  supplier_batch_number: z.string().optional().nullable(),
  qc_hold: z.boolean().default(false),
  godown_name: z.string().optional().nullable(),
});

interface BatchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BatchFormData) => void;
  editBatch?: Batch | null;
}

const BatchFormDialog: React.FC<BatchFormDialogProps> = ({ open, onOpenChange, onSubmit, editBatch }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batch_number: '',
      stock_item_name: '',
      manufacturing_date: null,
      expiry_date: null,
      quantity: 0,
      unit: 'Pcs',
      status: 'active',
      notes: null,
      lot_number: null,
      supplier_batch_number: null,
      qc_hold: false,
      godown_name: null,
    },
  });

  React.useEffect(() => {
    if (editBatch) {
      form.reset({
        batch_number: editBatch.batch_number,
        stock_item_name: editBatch.stock_item_name,
        manufacturing_date: editBatch.manufacturing_date ?? null,
        expiry_date: editBatch.expiry_date ?? null,
        quantity: editBatch.quantity,
        unit: editBatch.unit,
        status: editBatch.status,
        notes: editBatch.notes ?? null,
        lot_number: editBatch.lot_number ?? null,
        supplier_batch_number: editBatch.supplier_batch_number ?? null,
        qc_hold: editBatch.qc_hold ?? false,
        godown_name: editBatch.godown_name ?? null,
      });
    } else {
      form.reset({
        batch_number: '',
        stock_item_name: '',
        manufacturing_date: null,
        expiry_date: null,
        quantity: 0,
        unit: 'Pcs',
        status: 'active',
        notes: null,
        lot_number: null,
        supplier_batch_number: null,
        qc_hold: false,
        godown_name: null,
      });
    }
  }, [editBatch, open, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      ...values,
      stock_item_id: editBatch?.stock_item_id ?? crypto.randomUUID(),
    } as BatchFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editBatch ? 'Edit Batch' : 'New Batch'}</DialogTitle>
          <DialogDescription>
            {editBatch ? 'Update batch details' : 'Create a new inventory batch'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="batch_number" render={({ field }) => (
                <FormItem><FormLabel>Batch Number</FormLabel><FormControl>
                  <Input placeholder="BATCH-2604-0001" {...field} />
                </FormControl></FormItem>
              )} />
              <FormField control={form.control} name="stock_item_name" render={({ field }) => (
                <FormItem><FormLabel>Stock Item</FormLabel><FormControl>
                  <Input placeholder="Item name" {...field} />
                </FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="manufacturing_date" render={({ field }) => (
                <FormItem><FormLabel>Mfg Date</FormLabel><FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl></FormItem>
              )} />
              <FormField control={form.control} name="expiry_date" render={({ field }) => (
                <FormItem><FormLabel>Expiry Date</FormLabel><FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Quantity</FormLabel><FormControl>
                  <Input type="number" {...field} />
                </FormControl></FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem><FormLabel>Unit</FormLabel><FormControl>
                  <Input placeholder="Pcs / Kg / Ltrs" {...field} />
                </FormControl></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="consumed">Consumed</SelectItem>
                      <SelectItem value="quarantine">Quarantine</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl>
                <Input placeholder="Optional notes" {...field} value={field.value ?? ''} />
              </FormControl></FormItem>
            )} />

            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Traceability</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lot_number" render={({ field }) => (
                  <FormItem><FormLabel>Lot Number</FormLabel><FormControl>
                    <Input placeholder='Production lot reference' {...field} value={field.value ?? ''} />
                  </FormControl></FormItem>
                )} />
                <FormField control={form.control} name="supplier_batch_number" render={({ field }) => (
                  <FormItem><FormLabel>Supplier Batch No</FormLabel><FormControl>
                    <Input placeholder="Vendor's own batch ID" {...field} value={field.value ?? ''} />
                  </FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="godown_name" render={({ field }) => (
                <FormItem><FormLabel>Physical Location</FormLabel><FormControl>
                  <Input placeholder='Godown / Store name' {...field} value={field.value ?? ''} />
                </FormControl></FormItem>
              )} />
              <FormField control={form.control} name="qc_hold" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>QC Hold</FormLabel>
                    <p className="text-xs text-muted-foreground">Block batch issue until QC releases</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <Separator />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{editBatch ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BatchFormDialog;
