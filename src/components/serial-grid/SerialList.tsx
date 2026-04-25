import { useState } from 'react';
import { Search, Trash2, Hash, Edit2, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSerialNumbers } from '@/hooks/useSerialNumbers';
import SerialFormDialog from './SerialFormDialog';
import SerialViewDialog from './SerialViewDialog';
import type { SerialNumber } from '@/types/serial-number';

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-700',
  sold: 'bg-blue-500/10 text-blue-700',
  reserved: 'bg-amber-500/10 text-amber-700',
  in_repair: 'bg-orange-500/10 text-orange-700',
  returned: 'bg-purple-500/10 text-purple-700',
  scrapped: 'bg-red-500/10 text-red-700',
};

export function SerialList() {
  const { serials, deleteSerial, createSerial, updateSerial } = useSerialNumbers();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editSerial, setEditSerial] = useState<SerialNumber | null>(null);
  const [viewSerial, setViewSerial] = useState<SerialNumber | null>(null);

  const filtered = serials.filter(s =>
    s.serial_number.toLowerCase().includes(search.toLowerCase()) ||
    (s.item_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.imei_1 ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div data-keyboard-form>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" /> All Serial Numbers
              </CardTitle>
              <Button size="sm" className="gap-1.5"
                onClick={() => { setEditSerial(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4" /> Add Serial
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-9 w-56" placeholder="Search serials..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Hash className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No results found' : 'No serial numbers yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Serial No</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Item</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">IMEI / Custom ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Condition</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Warranty Until</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id} className="group">
                    <TableCell className="font-mono text-xs font-medium">{s.serial_number}</TableCell>
                    <TableCell className="text-sm">{s.item_name || '—'}</TableCell>
                    <TableCell>
                      {s.imei_1 || s.custom_field_1_value ? (
                        <Badge variant="secondary" className="font-mono text-xs max-w-[130px] truncate">
                          {s.imei_1 || s.custom_field_1_value}
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[s.status] ?? ''}`}>
                        {s.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.condition}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.warranty_end_date || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setViewSerial(s); setViewOpen(true); }}>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditSerial(s); setFormOpen(true); }}>
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => deleteSerial(s.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SerialFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editSerial={editSerial}
        onSubmit={data => {
          if (editSerial) {
            updateSerial(editSerial.id, data);
          } else {
            createSerial(data);
          }
          setFormOpen(false);
          setEditSerial(null);
        }}
      />

      <SerialViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        serial={viewSerial}
      />
    </div>
  );
}
