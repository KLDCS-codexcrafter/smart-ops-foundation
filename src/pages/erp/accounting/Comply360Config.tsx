/**
 * Comply360Config.tsx — Zone 3 Session 2
 * Top: Group Configuration (feature flags, applies to all entities)
 * Bottom: Entity Ledger Mapping (per entity, with dropdown)
 * Dependency chain: Auto RCM disabled until Advanced GST is on.
 * [JWT] Replace with GET/POST/PATCH /api/compliance/comply360-config
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Shield, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_ENTITIES } from '@/data/mock-entities';

interface GroupConfig {
  enableAdvancedGST: boolean;
  enableAutoRCM: boolean;
  enableAutoTDSPayable: boolean;
  enableAutoTDSReceivable: boolean;
  enableTaxAuditReport: boolean;
}

interface EntityLedgerMapping {
  rcmCGSTLedger: string;
  rcmSGSTLedger: string;
  rcmIGSTLedger: string;
  inputCGSTLedger: string;
  inputSGSTLedger: string;
  inputIGSTLedger: string;
  reverseChargeInputLedger: string;
  tdsPayableJournalVCH: string;
  tdsPayableLedger: string;
  tdsReceivableJournalVCH: string;
  tdsReceivableLedger: string;
  discountJournalVCH: string;
  discountLedger: string;
}

const DEFAULT_LEDGER: EntityLedgerMapping = {
  rcmCGSTLedger: '', rcmSGSTLedger: '', rcmIGSTLedger: '',
  inputCGSTLedger: '', inputSGSTLedger: '', inputIGSTLedger: '',
  reverseChargeInputLedger: '',
  tdsPayableJournalVCH: '', tdsPayableLedger: '',
  tdsReceivableJournalVCH: '', tdsReceivableLedger: '',
  discountJournalVCH: '', discountLedger: '',
};

const loadVoucherTypes = (): { id: string; name: string; base_voucher_type: string; is_active: boolean }[] => {
  try {
    // [JWT] GET /api/accounting/voucher-types
    return JSON.parse(localStorage.getItem('erp_voucher_types') || '[]');
  } catch { return []; }
};


export function Comply360ConfigPanel() {
  const [groupConfig, setGroupConfig] = useState<GroupConfig>({
    enableAdvancedGST: false,
    enableAutoRCM: false,
    enableAutoTDSPayable: false,
    enableAutoTDSReceivable: false,
    enableTaxAuditReport: false,
  });

  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [ledgerMap, setLedgerMap] = useState<Record<string, EntityLedgerMapping>>({});

  const currentLedger = selectedEntityId ? (ledgerMap[selectedEntityId] ?? { ...DEFAULT_LEDGER }) : null;

  useEffect(() => {
    if (!groupConfig.enableAdvancedGST && groupConfig.enableAutoRCM) {
      setGroupConfig(prev => ({ ...prev, enableAutoRCM: false }));
    }
  }, [groupConfig.enableAdvancedGST]);

  const updateGroupFlag = (key: keyof GroupConfig, value: boolean) => {
    if (key === 'enableAutoRCM' && !groupConfig.enableAdvancedGST) {
      toast.error('Enable Advanced GST Reports first.');
      return;
    }
    // [JWT] Replace with PATCH /api/compliance/comply360-config/group
    setGroupConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateLedger = (field: keyof EntityLedgerMapping, value: string) => {
    if (!selectedEntityId) return;
    setLedgerMap(prev => ({
      ...prev,
      [selectedEntityId]: { ...(prev[selectedEntityId] ?? { ...DEFAULT_LEDGER }), [field]: value },
    }));
  };

  const handleSaveLedger = () => {
    if (!selectedEntityId) return;
    // [JWT] Replace with POST/PATCH /api/compliance/comply360-config/:entityId/ledger
    const entityName = MOCK_ENTITIES.find(e => e.id === selectedEntityId)?.name ?? '';
    toast.success(`Ledger mappings saved for ${entityName}`);
  };

  const journalVoucherTypes = useMemo(() =>
    loadVoucherTypes().filter(vt => vt.base_voucher_type === 'Journal' && vt.is_active),
    []
  );

  const vchFields: (keyof EntityLedgerMapping)[] = ['tdsPayableJournalVCH', 'tdsReceivableJournalVCH', 'discountJournalVCH'];

  const LedgerField = ({ label, field, placeholder }: { label: string; field: keyof EntityLedgerMapping; placeholder: string }) => {
    if (vchFields.includes(field)) {
      return (
        <div>
          <Label className="text-xs">{label}</Label>
          <Select value={currentLedger?.[field] ?? ''} onValueChange={v => updateLedger(field, v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select journal voucher type" />
            </SelectTrigger>
            <SelectContent>
              {journalVoucherTypes.map(vt => (
                <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <div>
        <Label className="text-xs">{label}</Label>
        <Input
          value={currentLedger?.[field] ?? ''}
          onChange={e => updateLedger(field, e.target.value)}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comply360 Configuration</h1>
        <p className="text-sm text-muted-foreground">Enable compliance automations and map ledgers for auto-posting</p>
      </div>

      {/* Group Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Group Configuration
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">Applies to all entities</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">GST</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Enable Advanced GST Reports</Label>
              <p className="text-[10px] text-muted-foreground">GSTR-1, GSTR-3B, GSTR-2B reconciliation</p>
            </div>
            <Switch checked={groupConfig.enableAdvancedGST} onCheckedChange={v => updateGroupFlag('enableAdvancedGST', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className={`text-sm ${!groupConfig.enableAdvancedGST ? 'text-muted-foreground' : ''}`}>Enable Auto RCM Management</Label>
              <p className="text-[10px] text-muted-foreground">
                {!groupConfig.enableAdvancedGST ? 'Requires Advanced GST Reports to be enabled first' : 'Auto-create reverse charge entries on eligible purchases'}
              </p>
            </div>
            <Switch checked={groupConfig.enableAutoRCM} disabled={!groupConfig.enableAdvancedGST} onCheckedChange={v => updateGroupFlag('enableAutoRCM', v)} />
          </div>
          <Separator />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Income Tax</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Enable Auto TDS Payable</Label>
              <p className="text-[10px] text-muted-foreground">Auto-deduct TDS on vendor payments</p>
            </div>
            <Switch checked={groupConfig.enableAutoTDSPayable} onCheckedChange={v => updateGroupFlag('enableAutoTDSPayable', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Enable Auto TDS Receivable</Label>
              <p className="text-[10px] text-muted-foreground">Track TDS deducted by customers</p>
            </div>
            <Switch checked={groupConfig.enableAutoTDSReceivable} onCheckedChange={v => updateGroupFlag('enableAutoTDSReceivable', v)} />
          </div>
          <Separator />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Audit</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Enable Tax Audit Report</Label>
              <p className="text-[10px] text-muted-foreground">Generate Form 3CD and supporting schedules</p>
            </div>
            <Switch checked={groupConfig.enableTaxAuditReport} onCheckedChange={v => updateGroupFlag('enableTaxAuditReport', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Entity Ledger Mapping */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Entity Ledger Mapping
            </CardTitle>
            <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Per entity</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium shrink-0">Select Entity</Label>
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
              <SelectTrigger className="w-72 h-9">
                <SelectValue placeholder="Choose an entity..." />
              </SelectTrigger>
              <SelectContent>
                {MOCK_ENTITIES.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedEntityId && (
            <div className="p-8 text-center rounded-lg bg-muted/50 border border-border/50">
              <p className="text-sm text-muted-foreground">Select an entity above to configure its ledger mappings</p>
            </div>
          )}

          {selectedEntityId && currentLedger && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">RCM Ledgers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <LedgerField label="RCM CGST Ledger" field="rcmCGSTLedger" placeholder="e.g. RCM CGST Input" />
                  <LedgerField label="RCM SGST Ledger" field="rcmSGSTLedger" placeholder="e.g. RCM SGST Input" />
                  <LedgerField label="RCM IGST Ledger" field="rcmIGSTLedger" placeholder="e.g. RCM IGST Input" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <LedgerField label="Input CGST Ledger" field="inputCGSTLedger" placeholder="e.g. Input CGST" />
                  <LedgerField label="Input SGST Ledger" field="inputSGSTLedger" placeholder="e.g. Input SGST" />
                  <LedgerField label="Input IGST Ledger" field="inputIGSTLedger" placeholder="e.g. Input IGST" />
                </div>
                <LedgerField label="Reverse Charge Input Ledger" field="reverseChargeInputLedger" placeholder="e.g. RC Input Type" />
              </div>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">TDS Payable</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <LedgerField label="TDS Payable Journal VCH" field="tdsPayableJournalVCH" placeholder="e.g. TDS Payment Journal" />
                  <LedgerField label="TDS Payable Ledger" field="tdsPayableLedger" placeholder="e.g. TDS Payable A/c" />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">TDS Receivable</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <LedgerField label="TDS Receivable Journal VCH" field="tdsReceivableJournalVCH" placeholder="e.g. TDS Receipt Journal" />
                  <LedgerField label="TDS Receivable Ledger" field="tdsReceivableLedger" placeholder="e.g. TDS Receivable A/c" />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Discount</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <LedgerField label="Discount Journal VCH" field="discountJournalVCH" placeholder="e.g. Discount Journal" />
                  <LedgerField label="Discount Ledger" field="discountLedger" placeholder="e.g. Discount Allowed A/c" />
                </div>
              </div>
              <Separator />
              <Button className="w-full" onClick={handleSaveLedger}>
                <Save className="h-4 w-4 mr-1" /> Save Ledger Mappings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Comply360ConfigPage() {
  const navigate = useNavigate();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'Comply360 Configuration' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <Comply360ConfigPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}