/**
 * @file        src/pages/erp/accounting/capital-assets/IoTRFIDAssetPanel.tsx
 * @purpose     UI panel for IoT/RFID asset tracking · wraps iot-asset-bridge
 *              + rfid-asset-bridge SIBLINGs into a single FinCore-accessible surface
 * @reachable   Via FinCorePage switch case 'fc-fa-iot-rfid'
 * @reads-from  iot-asset-bridge.listIoTStreamingAssets ·
 *              rfid-asset-bridge.listRFIDTaggedAssets
 */
import { Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listIoTStreamingAssets } from '@/lib/iot-asset-bridge';
import { listRFIDTaggedAssets } from '@/lib/rfid-asset-bridge';

export function IoTRFIDAssetPanel({ entityCode }: { entityCode: string }): JSX.Element {
  const iot = listIoTStreamingAssets(entityCode);
  const rfid = listRFIDTaggedAssets(entityCode);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">IoT/RFID Asset Tracking</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">IoT-streaming assets</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono">{iot.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">RFID-tagged assets</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono">{rfid.length}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">IoT Stream</CardTitle></CardHeader>
          <CardContent className="text-xs font-mono space-y-1 max-h-80 overflow-auto">
            {iot.length === 0 ? (
              <p className="text-muted-foreground">No active streams.</p>
            ) : iot.map(s => (
              <div key={s.asset_unit_record_id} className="border-b border-border/30 pb-1">
                <div>{s.asset_unit_record_id}</div>
                <div className="text-muted-foreground">
                  signals today: {s.signal_count_today} · {s.is_streaming ? 'streaming' : 'idle'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">RFID Registry</CardTitle></CardHeader>
          <CardContent className="text-xs font-mono space-y-1 max-h-80 overflow-auto">
            {rfid.length === 0 ? (
              <p className="text-muted-foreground">No tagged assets.</p>
            ) : rfid.map(r => (
              <div key={r.rfid_tag_id} className="border-b border-border/30 pb-1">
                <div>{r.rfid_tag_id} → {r.asset_unit_record_id}</div>
                <div className="text-muted-foreground">
                  linked: {r.linked_at.slice(0, 10)}
                  {r.last_seen_location ? ` · @ ${r.last_seen_location}` : ''}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Badge variant="outline" className="text-[10px]">
        Phase 5 InsightX integration: stub bridges live · real WebSocket lands at capstone
      </Badge>
    </div>
  );
}
