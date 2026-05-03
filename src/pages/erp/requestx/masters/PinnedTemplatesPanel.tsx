/**
 * @file        PinnedTemplatesPanel.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block G · OOB-2 polish
 * @purpose     Master view of pinned templates · reuses pinned-templates-engine.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadPinnedTemplates, unpinTemplate } from '@/lib/pinned-templates-engine';
import type { PinnedTemplate } from '@/types/pinned-template';

export function PinnedTemplatesPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [templates, setTemplates] = useState<PinnedTemplate[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => { setTemplates(loadPinnedTemplates(entityCode)); }, [entityCode]);

  const filtered = useMemo(() => {
    if (!q.trim()) return templates;
    const needle = q.toLowerCase();
    return templates.filter(t =>
      t.template_name.toLowerCase().includes(needle) ||
      t.voucher_type_name.toLowerCase().includes(needle));
  }, [templates, q]);

  const onDelete = (id: string): void => {
    unpinTemplate(entityCode, id);
    setTemplates(loadPinnedTemplates(entityCode));
    toast.success('Template removed');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pinned Templates</h1>
          <p className="text-xs text-muted-foreground">Per-entity · per-user · reuse across forms.</p>
        </div>
        <Input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Templates ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Voucher Type</TableHead>
                <TableHead>Pinned By</TableHead>
                <TableHead className="text-right">Use Count</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                  No pinned templates.
                </TableCell></TableRow>
              )}
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{t.template_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{t.voucher_type_name}</Badge></TableCell>
                  <TableCell className="text-xs">{t.pinned_by}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{t.use_count}</TableCell>
                  <TableCell className="font-mono text-xs">{t.last_used_at.slice(0, 10)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
