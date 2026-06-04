/**
 * @file        src/pages/erp/docvault/registers/NumberingConfigPage.tsx
 * @purpose     S143 · DocVault Control Pt 1 · per-category numbering config CRUD + preview
 * @sprint      Sprint 143 · T-TaskFlow-A641.7 · Block 4
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Hash } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listNumberingConfigs, upsertNumberingConfig, previewNextDocumentCode,
} from '@/lib/docvault-control-engine';
import type { DocumentCategory, DocumentTypeNumberingConfig } from '@/types/docvault';

const CATEGORIES: DocumentCategory[] = [
  'policy', 'procedure', 'work_instruction', 'contract', 'agreement',
  'certificate', 'license', 'statutory', 'legal', 'financial',
  'technical', 'quality', 'hr', 'correspondence', 'general',
];

export default function NumberingConfigPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [rows, setRows] = useState<DocumentTypeNumberingConfig[]>([]);
  const [category, setCategory] = useState<DocumentCategory>('policy');
  const [prefix, setPrefix] = useState('POL');
  const [seq, setSeq] = useState(1);
  const [active, setActive] = useState(true);

  const refresh = useCallback(() => { setRows(listNumberingConfigs(entityCode)); }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const onSave = (): void => {
    try {
      upsertNumberingConfig(entityCode, {
        category, numbering_prefix: prefix.toUpperCase(), next_sequence: seq, is_active: active,
      });
      toast.success('Numbering config saved');
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const preview = previewNextDocumentCode(entityCode, category);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Numbering</h1>
        <p className="text-sm text-muted-foreground">
          Per-category document code prefix and sequence. Codes are assigned in DocumentControlPanel.
        </p>
      </div>

      <Card className="glass-card rounded-2xl">
        <CardHeader><CardTitle className="text-base">New / Update numbering config</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prefix (2-8 A-Z 0-9)</Label>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} className="rounded-lg font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Next sequence</Label>
              <Input type="number" min={1} value={seq} onChange={(e) => setSeq(parseInt(e.target.value || '1', 10))} className="rounded-lg font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Active</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch checked={active} onCheckedChange={setActive} id="active" />
                <Label htmlFor="active" className="text-sm">One active per category</Label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onSave}><Hash className="h-4 w-4 mr-2" />Save config</Button>
            <span className="text-sm text-muted-foreground">
              Preview next code: <span className="font-mono">{preview ?? '—'}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardHeader><CardTitle className="text-base">Configured categories</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No numbering configs yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead><TableHead>Prefix</TableHead>
                <TableHead>Next sequence</TableHead><TableHead>Active</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.category}</TableCell>
                    <TableCell className="font-mono">{r.numbering_prefix}</TableCell>
                    <TableCell className="font-mono">{r.next_sequence}</TableCell>
                    <TableCell>
                      {r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
