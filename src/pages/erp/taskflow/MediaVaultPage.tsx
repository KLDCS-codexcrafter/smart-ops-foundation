/**
 * @file        src/pages/erp/taskflow/MediaVaultPage.tsx
 * @purpose     S142 · TF-30c · MediaVault — org-owned media index across conversations.
 * @sprint      Sprint 142 · T-TaskFlow-A641.6 · Block 4
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listMediaVault, rebuildMediaVaultIndex } from '@/lib/operix-chat-engine';
import type { MediaVaultItem } from '@/types/operix-chat';
import { RefreshCw, FileText, Mic, Image as ImageIcon } from 'lucide-react';

type Kind = 'all' | 'voice' | 'file' | 'image';

export default function MediaVaultPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [items, setItems] = useState<MediaVaultItem[]>([]);
  const [kind, setKind] = useState<Kind>('all');

  const refresh = useCallback(() => {
    setItems(listMediaVault(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(
    () => (kind === 'all' ? items : items.filter((i) => i.kind === kind)),
    [items, kind],
  );

  const totals = useMemo(() => {
    let v = 0, f = 0, im = 0, bytes = 0;
    for (const i of items) {
      if (i.kind === 'voice') v += 1;
      else if (i.kind === 'file') f += 1;
      else im += 1;
      bytes += i.sizeBytes;
    }
    return { v, f, im, bytes };
  }, [items]);

  const rebuild = (): void => {
    rebuildMediaVaultIndex(entityCode);
    refresh();
  };

  const kindIcon = (k: MediaVaultItem['kind']): JSX.Element => {
    if (k === 'voice') return <Mic className="h-4 w-4 text-primary" />;
    if (k === 'image') return <ImageIcon className="h-4 w-4 text-primary" />;
    return <FileText className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Media Vault</h1>
          <p className="text-sm text-muted-foreground">
            Voice notes, files and images across all conversations · org-owned · survives participant removal.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={rebuild}>
          <RefreshCw className="h-4 w-4 mr-2" />Rebuild index
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Voice notes" value={totals.v} />
        <KpiCard label="Files" value={totals.f} />
        <KpiCard label="Images" value={totals.im} />
        <KpiCard label="Total size" value={`${(totals.bytes / 1024).toFixed(1)} KB`} />
      </div>

      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="file">Files</TabsTrigger>
          <TabsTrigger value="image">Images</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="glass-card rounded-2xl">
        <CardHeader><CardTitle className="text-base">Media items</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No media yet. Voice notes and attachments sent in chat will appear here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Conversation</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>Uploaded at</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {kindIcon(it.kind)}
                        <Badge variant="outline" className="font-mono uppercase">{it.kind}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{it.fileName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{it.conversationId.slice(0, 12)}…</TableCell>
                    <TableCell className="text-xs">{it.uploadedByUserId}</TableCell>
                    <TableCell className="font-mono text-xs">{new Date(it.uploadedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{(it.sizeBytes / 1024).toFixed(1)} KB</TableCell>
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

function KpiCard({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <Card className="glass-card rounded-2xl">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold font-mono mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
