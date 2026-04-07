/**
 * Comply360Config.tsx — Zone 3 Session 2
 * Feature flags + ledger mapping — mirrors Tally Alt+F8 configuration.
 * Two-column layout: Features (left) → Configuration (right).
 * Dependency chain: Auto RCM disabled until Advanced GST is on.
 * [JWT] Replace with GET/POST/PATCH /api/compliance/comply360-config/:entityId
 */
import { useState, useMemo, useEffect } from 'react';
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
import { ArrowLeft, Save, Shield, FileText, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export interface Comply360Config {
  id: string;
  entityName: string;
  enableAdvancedGST: boolean;
  enableAutoRCM: boolean;
  rcmCGSTLedger: string;
  rcmSGSTLedger: string;
  rcmIGSTLedger: string;
  inputCGSTLedger: string;
  inputSGSTLedger: string;
  inputIGSTLedger: string;
  rcmInputTypeLedger: string;
  enableAutoTDSPayable: boolean;
  enableAutoTDSReceivable: boolean;
  tdsPayableJournalVoucherType: string;
  tdsPayableLedger: string;
  tdsReceivableJournalVoucherType: string;
  tdsReceivableLedger: string;
  discountJournalVoucherType: string;
  discountLedger: string;
  enableTaxAuditReport: boolean;
}

const DEFAULT_CONFIG: Comply360Config = {
  id: '', entityName: '',
  enableAdvancedGST: false, enableAutoRCM: false,
  rcmCGSTLedger: '', rcmSGSTLedger: '', rcmIGSTLedger: '',
  inputCGSTLedger: '', inputSGSTLedger: '', inputIGSTLedger: '',
  rcmInputTypeLedger: '',
  enableAutoTDSPayable: false, enableAutoTDSReceivable: false,
  tdsPayableJournalVoucherType: '', tdsPayableLedger: '',
  tdsReceivableJournalVoucherType: '', tdsReceivableLedger: '',
  discountJournalVoucherType: '', discountLedger: '',
  enableTaxAuditReport: false,
};

// Mock entities — in real app these come from GSTEntityConfig
const MOCK_ENTITIES = [
  { id: 'e1', name: '4DSmartOps Pvt Ltd' },
  { id: 'e2', name: 'SmartOps Digital LLP' },
  { id: 'e3', name: '4D Exports SEZ Unit' },
];

export default function Comply360ConfigPage() {
  const navigate = useNavigate();
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [configMap, setConfigMap] = useState<Record<string, Comply360Config>>({});
  const [savedMap, setSavedMap] = useState<Record<string, Comply360Config>>({});

  const config = selectedEntityId ? (configMap[selectedEntityId] ?? { ...DEFAULT_CONFIG, id: selectedEntityId, entityName: MOCK_ENTITIES.find(e => e.id === selectedEntityId)?.name ?? '' }) : null;
  const saved = selectedEntityId ? savedMap[selectedEntityId] : null;

  const hasUnsaved = useMemo(() => {
    if (!config || !saved) return !!config && !!selectedEntityId;
    return JSON.stringify(config) !== JSON.stringify(saved);
  }, [config, saved]);

  const updateConfig = (patch: Partial<Comply360Config>) => {
    if (!selectedEntityId) return;
    setConfigMap(prev => ({
      ...prev,
      [selectedEntityId]: { ...(prev[selectedEntityId] ?? { ...DEFAULT_CONFIG, id: selectedEntityId, entityName: MOCK_ENTITIES.find(e => e.id === selectedEntityId)?.name ?? '' }), ...patch },
    }));
  };

  // Dependency: disable Auto RCM when Advanced GST is off
  useEffect(() => {
    if (config && !config.enableAdvancedGST && config.enableAutoRCM) {
      updateConfig({ enableAutoRCM: false });
    }
  }, [config?.enableAdvancedGST]);

  const handleSaveFeatures = () => {
    if (!config || !selectedEntityId) return;
    // [JWT] Replace with POST/PATCH /api/compliance/comply360-config/:entityId
    setSavedMap(prev => ({ ...prev, [selectedEntityId]: { ...config } }));
    toast.success(`Comply360 configuration saved for ${config.entityName}`);
  };

  const handleSaveConfig = () => {
    if (!config || !selectedEntityId) return;
    // [JWT] Replace with POST/PATCH /api/compliance/comply360-config/:entityId
    setSavedMap(prev => ({ ...prev, [selectedEntityId]: { ...config } }));
    toast.success(`Comply360 configuration saved for ${config.entityName}`);
  };

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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Comply360 Configuration</h1>
                {hasUnsaved && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">Unsaved changes</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Enable compliance automations and map ledgers for auto-posting</p>
            </div>
          </div>

          {/* Entity selector */}
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
            {hasUnsaved && (
              <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">Unsaved changes</Badge>
            )}
          </div>

          {!selectedEntityId && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground text-sm">Select an entity above to configure Comply360 features and ledger mappings.</p>
              <p className="text-xs text-muted-foreground mt-2">Add entities in GST Config first if none are available.</p>
            </Card>
          )}

          {config && selectedEntityId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ── Left Column — Feature Flags ──────────── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* GST Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">GST</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Enable Advanced GST Reports</Label>
                        <p className="text-[10px] text-muted-foreground">GSTR-1, GSTR-3B, GSTR-2B reconciliation</p>
                      </div>
                      <Switch
                        checked={config.enableAdvancedGST}
                        onCheckedChange={v => updateConfig({ enableAdvancedGST: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className={`text-sm ${!config.enableAdvancedGST ? 'text-muted-foreground' : ''}`}>Enable Auto RCM Management</Label>
                        <p className="text-[10px] text-muted-foreground">
                          {!config.enableAdvancedGST ? 'Requires Advanced GST Reports to be enabled first' : 'Auto-create reverse charge entries on eligible purchases'}
                        </p>
                      </div>
                      <Switch
                        checked={config.enableAutoRCM}
                        disabled={!config.enableAdvancedGST}
                        onCheckedChange={v => {
                          if (!config.enableAdvancedGST) {
                            toast.error('Enable Advanced GST Reports first.');
                            return;
                          }
                          updateConfig({ enableAutoRCM: v });
                        }}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Income Tax Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Income Tax</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Enable Auto TDS Payable</Label>
                        <p className="text-[10px] text-muted-foreground">Auto-deduct TDS on vendor payments</p>
                      </div>
                      <Switch
                        checked={config.enableAutoTDSPayable}
                        onCheckedChange={v => updateConfig({ enableAutoTDSPayable: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Enable Auto TDS Receivable</Label>
                        <p className="text-[10px] text-muted-foreground">Track TDS deducted by customers</p>
                      </div>
                      <Switch
                        checked={config.enableAutoTDSReceivable}
                        onCheckedChange={v => updateConfig({ enableAutoTDSReceivable: v })}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Audit Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Audit</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Enable Tax Audit Report</Label>
                        <p className="text-[10px] text-muted-foreground">Generate Form 3CD and supporting schedules</p>
                      </div>
                      <Switch
                        checked={config.enableTaxAuditReport}
                        onCheckedChange={v => updateConfig({ enableTaxAuditReport: v })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <Button className="w-full" onClick={handleSaveFeatures}>
                    <Save className="h-4 w-4 mr-1" /> Save Configuration
                  </Button>
                </CardContent>
              </Card>

              {/* ── Right Column — Configuration Panels ──── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* RCM Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">RCM Configuration</h3>
                    {config.enableAutoRCM ? (
                      <div className="grid grid-cols-1 gap-3">
                        <div><Label className="text-xs">RCM Journal Voucher Type</Label><Input value={config.rcmInputTypeLedger} onChange={e => updateConfig({ rcmInputTypeLedger: e.target.value })} placeholder="e.g. RCM Journal" className="h-8 text-sm" /></div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><Label className="text-xs">RCM CGST Ledger</Label><Input value={config.rcmCGSTLedger} onChange={e => updateConfig({ rcmCGSTLedger: e.target.value })} className="h-8 text-sm" /></div>
                          <div><Label className="text-xs">RCM SGST Ledger</Label><Input value={config.rcmSGSTLedger} onChange={e => updateConfig({ rcmSGSTLedger: e.target.value })} className="h-8 text-sm" /></div>
                          <div><Label className="text-xs">RCM IGST Ledger</Label><Input value={config.rcmIGSTLedger} onChange={e => updateConfig({ rcmIGSTLedger: e.target.value })} className="h-8 text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><Label className="text-xs">Input CGST Ledger</Label><Input value={config.inputCGSTLedger} onChange={e => updateConfig({ inputCGSTLedger: e.target.value })} className="h-8 text-sm" /></div>
                          <div><Label className="text-xs">Input SGST Ledger</Label><Input value={config.inputSGSTLedger} onChange={e => updateConfig({ inputSGSTLedger: e.target.value })} className="h-8 text-sm" /></div>
                          <div><Label className="text-xs">Input IGST Ledger</Label><Input value={config.inputIGSTLedger} onChange={e => updateConfig({ inputIGSTLedger: e.target.value })} className="h-8 text-sm" /></div>
                        </div>
                        <div><Label className="text-xs">Reverse Charge Input Type Ledger</Label><Input value={config.rcmInputTypeLedger} onChange={e => updateConfig({ rcmInputTypeLedger: e.target.value })} className="h-8 text-sm" /></div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-xs text-muted-foreground">Enable Auto RCM Management on the left to configure ledger mappings.</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Auto TDS Payable Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Auto TDS Payable</h3>
                    {config.enableAutoTDSPayable ? (
                      <div className="grid grid-cols-1 gap-3">
                        <div><Label className="text-xs">TDS Payable Journal Voucher Type</Label><Input value={config.tdsPayableJournalVoucherType} onChange={e => updateConfig({ tdsPayableJournalVoucherType: e.target.value })} placeholder="e.g. TDS Payment" className="h-8 text-sm" /></div>
                        <div><Label className="text-xs">TDS Payable Ledger</Label><Input value={config.tdsPayableLedger} onChange={e => updateConfig({ tdsPayableLedger: e.target.value })} className="h-8 text-sm" /></div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-xs text-muted-foreground">Enable Auto TDS Payable on the left to configure journal and ledger mappings.</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Auto TDS Receivable Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Auto TDS Receivable</h3>
                    {config.enableAutoTDSReceivable ? (
                      <div className="grid grid-cols-1 gap-3">
                        <div><Label className="text-xs">TDS Receivable Journal Voucher Type</Label><Input value={config.tdsReceivableJournalVoucherType} onChange={e => updateConfig({ tdsReceivableJournalVoucherType: e.target.value })} placeholder="e.g. TDS Receipt" className="h-8 text-sm" /></div>
                        <div><Label className="text-xs">TDS Receivable Ledger</Label><Input value={config.tdsReceivableLedger} onChange={e => updateConfig({ tdsReceivableLedger: e.target.value })} className="h-8 text-sm" /></div>
                        <div><Label className="text-xs">Discount Journal Voucher Type</Label><Input value={config.discountJournalVoucherType} onChange={e => updateConfig({ discountJournalVoucherType: e.target.value })} className="h-8 text-sm" /></div>
                        <div><Label className="text-xs">Discount Ledger</Label><Input value={config.discountLedger} onChange={e => updateConfig({ discountLedger: e.target.value })} className="h-8 text-sm" /></div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-xs text-muted-foreground">Enable Auto TDS Receivable on the left to configure journal and ledger mappings.</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <Button className="w-full" onClick={handleSaveConfig}>
                    <Save className="h-4 w-4 mr-1" /> Save Configuration
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
