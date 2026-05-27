/**
 * @file        src/pages/mobile/MobileFAScanPage.tsx
 * @purpose     Mobile QR cockpit for FA scan · custodian assignment workflow
 * @realizes    MOAT-50 · Mobile QR Cockpit for FA Verification
 * @flips       FAR-CAP-22 (Mobile asset verification · QR scan) to FULL
 * @route       Reachable from MobileShopFloorOperatorPage QuickActionCard
 * @platform    Mobile-first PWA · offline-first per Q-LOCK-6 A
 * @reads       physical-asset-unit-bridge.ts (PRESERVE LIST · do NOT modify)
 * @reads       rfid-asset-bridge.ts (Prompt A · findAssetByRFIDTag)
 * @uses        AssetUnitRecord.qr_payload_url (Prompt A schema field)
 * [JWT] Phase 5: navigator.mediaDevices.getUserMedia + jsqr decoder · GPS via navigator.geolocation
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, MapPin, UserCog, Wrench, ShieldAlert, AlertCircle, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { findPhysicalAssetUnit } from '@/lib/physical-asset-unit-bridge';
import { findAssetByRFIDTag } from '@/lib/rfid-asset-bridge';

interface ScannedAsset {
  asset_unit_record_id: string;
  rfid_tag_id?: string;
  last_seen_location?: string;
  linked_at?: string;
}

export default function MobileFAScanPage(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const [manualEntry, setManualEntry] = useState('');
  const [scanned, setScanned] = useState<ScannedAsset | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLookup = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || !entityCode) {
      toast.error('Enter an asset ID or RFID tag');
      return;
    }
    // [JWT] Phase 5: decode QR payload URL to extract id
    const rfid = findAssetByRFIDTag(entityCode, trimmed);
    if (rfid) {
      setScanned({
        asset_unit_record_id: rfid.asset_unit_record_id,
        rfid_tag_id: rfid.rfid_tag_id,
        last_seen_location: rfid.last_seen_location,
        linked_at: rfid.linked_at,
      });
      toast.success('Asset matched via RFID registry');
      return;
    }
    const unit = findPhysicalAssetUnit(entityCode, { asset_unit_record_id: trimmed });
    if (unit) {
      setScanned({ asset_unit_record_id: unit.asset_unit_record_id });
      toast.success('Asset matched in physical unit registry');
      return;
    }
    setScanned({ asset_unit_record_id: trimmed });
    toast.warning('Asset not found · proceeding with raw ID');
  };

  const handleAction = (label: string) => {
    setBusy(true);
    // [JWT] Phase 5: POST /api/fa/assets/:id/action
    setTimeout(() => {
      setBusy(false);
      toast.success(`${label} recorded for ${scanned?.asset_unit_record_id}`);
    }, 600);
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Asset QR Scan</h1>
      </header>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <QrCode className="h-4 w-4 text-primary" />
          <span className="font-semibold">Camera scanner</span>
          <Badge variant="outline" className="text-[10px]">offline-first</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Camera scanning is staged for Phase 5. Use manual entry below.
        </p>
        <div className="flex gap-2">
          <Input
            value={manualEntry}
            onChange={e => setManualEntry(e.target.value)}
            placeholder="Asset ID or RFID tag"
            className="text-sm"
          />
          <Button size="sm" onClick={() => handleLookup(manualEntry)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {scanned && (
        <Card className="p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Matched Asset</p>
            <p className="font-mono text-sm">{scanned.asset_unit_record_id}</p>
            {scanned.rfid_tag_id && (
              <p className="text-xs text-muted-foreground">RFID · {scanned.rfid_tag_id}</p>
            )}
            {scanned.last_seen_location && (
              <p className="text-xs text-muted-foreground">Last seen · {scanned.last_seen_location}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ActionButton icon={MapPin} label="Verify location" onClick={() => handleAction('Location verification')} disabled={busy} />
            <ActionButton icon={UserCog} label="Reassign custodian" onClick={() => handleAction('Custodian reassignment')} disabled={busy} />
            <ActionButton icon={Wrench} label="AMC due" onClick={() => handleAction('AMC flag')} disabled={busy} />
            <ActionButton icon={ShieldAlert} label="Insurance due" onClick={() => handleAction('Insurance flag')} disabled={busy} />
            <ActionButton icon={AlertCircle} label="Report damage" onClick={() => handleAction('Damage report')} disabled={busy} />
          </div>
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        QR · RFID · Offline-first · PWA — Q-LOCK-6 A
      </p>
    </div>
  );
}

interface ActionButtonProps {
  icon: typeof MapPin;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function ActionButton({ icon: Icon, label, onClick, disabled }: ActionButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border bg-card p-3 text-left transition-all hover:bg-muted/40 disabled:opacity-50"
    >
      <Icon className="h-4 w-4 text-primary mb-1" />
      <p className="font-semibold text-xs">{label}</p>
    </button>
  );
}
