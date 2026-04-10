import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import type { SerialNumber, SerialFormData } from '@/types/serial-number';

const formSchema = z.object({
  serial_number: z.string().min(1, 'Required'),
  stock_item_name: z.string().min(1, 'Required'),
  status: z.enum(['available', 'sold', 'in_repair', 'scrapped', 'returned']),
  warranty_start_date: z.string().optional().nullable(),
  warranty_end_date: z.string().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  imei_1: z.string().optional().nullable(),
  imei_2: z.string().optional().nullable(),
  custom_field_1_label: z.string().optional().nullable(),
  custom_field_1_value: z.string().optional().nullable(),
  custom_field_2_label: z.string().optional().nullable(),
  custom_field_2_value: z.string().optional().nullable(),
  current_custodian: z.string().optional().nullable(),
  grn_reference: z.string().optional().nullable(),
  sales_reference: z.string().optional().nullable(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SerialFormData) => void;
  editSerial?: SerialNumber | null;
}

const SerialFormDialog: React.FC<Props> = ({ open, onOpenChange, onSubmit, editSerial }) => {
  const [showExtended, setShowExtended] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serial_number: '', stock_item_name: '', status: 'available',
      warranty_start_date: null, warranty_end_date: null, purchase_date: null, notes: null,
      imei_1: null, imei_2: null,
      custom_field_1_label: null, custom_field_1_value: null,
      custom_field_2_label: null, custom_field_2_value: null,
      current_custodian: null, grn_reference: null, sales_reference: null,
    },
  });

  React.useEffect(() => {
    if (editSerial) {
      form.reset({
        serial_number: editSerial.serial_number,
        stock_item_name: editSerial.stock_item_name,
        status: editSerial.status,
        warranty_start_date: editSerial.warranty_start_date ?? null,
        warranty_end_date: editSerial.warranty_end_date ?? null,
        purchase_date: editSerial.purchase_date ?? null,
        notes: editSerial.notes ?? null,
        imei_1: editSerial.imei_1 ?? null,
        imei_2: editSerial.imei_2 ?? null,
        custom_field_1_label: editSerial.custom_field_1_label ?? null,
        custom_field_1_value: editSerial.custom_field_1_value ?? null,
        custom_field_2_label: editSerial.custom_field_2_label ?? null,
        custom_field_2_value: editSerial.custom_field_2_value ?? null,
        current_custodian: editSerial.current_custodian ?? null,
        grn_reference: editSerial.grn_reference ?? null,
        sales_reference: editSerial.sales_reference ?? null,
      });
      if (editSerial.imei_1 || editSerial.custom_field_1_value) setShowExtended(true);
    } else {
      form.reset({
        serial_number: '', stock_item_name: '', status: 'available',
        warranty_start_date: null, warranty_end_date: null, purchase_date: null, notes: null,
        imei_1: null, imei_2: null,
        custom_field_1_label: null, custom_field_1_value: null,
        custom_field_2_label: null, custom_field_2_value: null,
        current_custodian: null, grn_reference: null, sales_reference: null,
      });
      setShowExtended(false);
    }
  }, [editSerial, open, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      ...values,
      stock_item_id: editSerial?.stock_item_id ?? crypto.randomUUID(),
    } as SerialFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editSerial ? 'Edit Serial Number' : 'New Serial Number'}</DialogTitle>
          <DialogDescription>
            {editSerial ? 'Update serial details' : 'Register a new serialised unit'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="serial_number" render={({ field }) => (
                <FormItem><FormLabel>Serial Number</FormLabel><FormControl>
                  <Input placeholder="SN-2026-00001" {...field} />
                </FormControl></FormItem>
              )} />
              <FormField control={form.control} name="stock_item_name" render={({ field }) => (
                <FormItem><FormLabel>Stock Item</FormLabel><FormControl>
                  <Input placeholder="Item name" {...field} />
                </FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="in_repair">In Repair</SelectItem>
                      <SelectItem value="scrapped">Scrapped</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="purchase_date" render={({ field }) => (
                <FormItem><FormLabel>Purchase Date</FormLabel><FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="warranty_start_date" render={({ field }) => (
                <FormItem><FormLabel>Warranty Start</FormLabel><FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl></FormItem>
              )} />
              <FormField control={form.control} name="warranty_end_date" render={({ field }) => (
                <FormItem><FormLabel>Warranty End</FormLabel><FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl>
                <Input placeholder="Optional notes" {...field} value={field.value ?? ''} />
              </FormControl></FormItem>
            )} />

            <Separator />

            <Collapsible open={showExtended} onOpenChange={setShowExtended}>
              <CollapsibleTrigger asChild>
                <button type="button"
                  className="flex items-center gap-2 w-full text-left py-2.5 border-b group/trigger">
                  <span className="text-sm font-semibold flex-1">Extended Identity Fields</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200
                    group-data-[state=open]/trigger:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="imei_1" render={({ field }) => (
                    <FormItem><FormLabel>IMEI 1 / Primary Serial</FormLabel><FormControl>
                      <Input placeholder='15-digit IMEI' {...field} value={field.value ?? ''} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="imei_2" render={({ field }) => (
                    <FormItem><FormLabel>IMEI 2 / Secondary</FormLabel><FormControl>
                      <Input placeholder='For dual-SIM devices' {...field} value={field.value ?? ''} />
                    </FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="custom_field_1_label" render={({ field }) => (
                    <FormItem><FormLabel>Custom Field 1 — Label</FormLabel><FormControl>
                      <Input placeholder='e.g. Engine No, Chassis No' {...field} value={field.value ?? ''} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="custom_field_1_value" render={({ field }) => (
                    <FormItem><FormLabel>Custom Field 1 — Value</FormLabel><FormControl>
                      <Input placeholder='Value for this unit' {...field} value={field.value ?? ''} />
                    </FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="custom_field_2_label" render={({ field }) => (
                    <FormItem><FormLabel>Custom Field 2 — Label</FormLabel><FormControl>
                      <Input placeholder='e.g. Body No, Battery No' {...field} value={field.value ?? ''} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="custom_field_2_value" render={({ field }) => (
                    <FormItem><FormLabel>Custom Field 2 — Value</FormLabel><FormControl>
                      <Input placeholder='Value' {...field} value={field.value ?? ''} />
                    </FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="current_custodian" render={({ field }) => (
                  <FormItem><FormLabel>Current Custodian</FormLabel><FormControl>
                    <Input placeholder='Person responsible' {...field} value={field.value ?? ''} />
                  </FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="grn_reference" render={({ field }) => (
                    <FormItem><FormLabel>Purchase Receipt / GRN No</FormLabel><FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="sales_reference" render={({ field }) => (
                    <FormItem><FormLabel>Sales Invoice / Delivery Note</FormLabel><FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl></FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{editSerial ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SerialFormDialog;
