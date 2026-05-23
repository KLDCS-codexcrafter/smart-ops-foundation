/**
 * @file        AssetUnificationPanel.tsx
 * @purpose     Verification panel for 3-shape physical asset unification · 27th SIBLING consumer
 * @sprint      T-Phase-2.HK-6 · Theme 2 v2 · Q-LOCK-4 v2 B-2
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { detectOrphans, listUnifiedAssets } from '@/lib/physical-asset-unit-bridge';
import { Link2, AlertTriangle } from 'lucide-react';

interface Props { entityCode: string }

export function AssetUnificationPanel({ entityCode }: Props) {
  const unified = useMemo(() => listUnifiedAssets(entityCode), [entityCode]);
  const orphans = useMemo(() => detectOrphans(entityCode), [entityCode]);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Asset Unification · 3-Shape View
        </h2>
        <p className="text-sm text-muted-foreground">
          FA Accounting ↔ Asset Tag (QR) ↔ Pay Hub HR Equipment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Unified Units</CardTitle></CardHeader>
          <CardContent className="font-mono text-2xl">{unified.length}</CardContent>
        </Card>
        <Card className={orphans.fa_orphans.length > 0 ? 'border-warning' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">FA Orphans</CardTitle></CardHeader>
          <CardContent className="font-mono text-2xl text-warning">{orphans.fa_orphans.length}</CardContent>
        </Card>
        <Card className={orphans.tag_orphans.length > 0 ? 'border-warning' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Tag Orphans</CardTitle></CardHeader>
          <CardContent className="font-mono text-2xl text-warning">{orphans.tag_orphans.length}</CardContent>
        </Card>
        <Card className={orphans.dangling_links.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Dangling Links</CardTitle></CardHeader>
          <CardContent className="font-mono text-2xl text-destructive">{orphans.dangling_links.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Unified Asset Registry</CardTitle></CardHeader>
        <CardContent>
          {unified.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              No unified asset units yet. Link records via the 3-shape bridge.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>FA Status</TableHead>
                  <TableHead>Tag #</TableHead>
                  <TableHead>HR Asset Code</TableHead>
                  <TableHead>Custodian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unified.map(v => (
                  <TableRow key={v.unit.id}>
                    <TableCell className="font-mono text-xs">{v.fa_record?.asset_id ?? '—'}</TableCell>
                    <TableCell>{v.fa_record?.item_name ?? '—'}</TableCell>
                    <TableCell>
                      {v.fa_record ? <Badge variant="outline">{v.fa_record.status}</Badge> : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{v.asset_tag?.asset_tag_number ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{v.hr_asset?.assetCode ?? '—'}</TableCell>
                    <TableCell>{v.fa_record?.custodian_name ?? v.hr_asset?.currentAssigneeName ?? '—'}</TableCell>
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

export default AssetUnificationPanel;
