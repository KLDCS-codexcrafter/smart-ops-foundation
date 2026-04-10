import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Eye } from 'lucide-react';
import type { SerialNumber } from '@/types/serial-number';

const statusColors: Record<string, string> = {
  available: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  sold: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  in_repair: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  scrapped: 'bg-red-500/15 text-red-700 dark:text-red-400',
  returned: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
};

interface Props {
  serials: SerialNumber[];
  onEdit: (s: SerialNumber) => void;
  onDelete: (id: string) => void;
  onView: (s: SerialNumber) => void;
}

const SerialList: React.FC<Props> = ({ serials, onEdit, onDelete, onView }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Serial #</TableHead>
          <TableHead>Stock Item</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Purchase Date</TableHead>
          <TableHead>Warranty End</TableHead>
          <TableHead>IMEI / Custom ID</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {serials.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              No serial numbers found. Register your first unit.
            </TableCell>
          </TableRow>
        ) : (
          serials.map(serial => (
            <TableRow key={serial.id}>
              <TableCell className="font-mono text-xs">{serial.serial_number}</TableCell>
              <TableCell className="font-medium">{serial.stock_item_name}</TableCell>
              <TableCell>
                <Badge className={statusColors[serial.status] ?? ''} variant="secondary">
                  {serial.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{serial.purchase_date ?? '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{serial.warranty_end_date ?? '—'}</TableCell>
              <TableCell>
                {serial.imei_1 || serial.custom_field_1_value ? (
                  <Badge variant="secondary" className="font-mono text-xs max-w-[130px] truncate">
                    {serial.imei_1 || serial.custom_field_1_value}
                  </Badge>
                ) : <span className="text-muted-foreground text-xs">—</span>}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(serial)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(serial)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(serial.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default SerialList;
