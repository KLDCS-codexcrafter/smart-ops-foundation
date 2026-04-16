/**
 * Comply360Config.tsx — Sprint 22A Complete Redesign
 * 8 config sections, extensible architecture, all TDL fields mapped.
 * GroupConfig (global toggles) on the left, entity-specific sections on the right.
 * [JWT] Replace with GET/POST/PATCH /api/compliance/comply360
 */
import { useState, useEffect, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Shield, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityList } from '@/hooks/useEntityList';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';

// ─── Interfaces ───────────────────────────────────────────────────────

// Storage: erp_comply360_group
// [JWT] GET/PATCH /api/compliance/comply360/group
export interface GroupConfig {
  // GST
  enableAdvancedGST: boolean;
  enableAutoRCM: boolean;
  enableQRMPScheme: boolean;
  // Income Tax
  enableAutoTDSPayable: boolean;
  enableAutoTDSReceivable: boolean;
  enableDiscountAutoPosting: boolean;
  // Audit
  enableTaxAuditReport: boolean;
  // Trading features
  enableDomesticLandedCost: boolean;
  enableEximManagement: boolean;
  enableSAMModule: boolean;
  // Communication
  enableWhatsAppTrigger: boolean;
  // Section 8 — Voucher Features (F11)
  enableInventory: boolean;
  enableBillByBill: boolean;
  enableCostCentres: boolean;
  enableOrderProcessing: boolean;
  enableJobWork: boolean;
  enableBudgets: boolean;
  enableInterestCalc: boolean;
  itemInvoiceByDefault: boolean;
  defaultReceiveGodown: string;
}

export const DEFAULT_GROUP_CONFIG: GroupConfig = {
  enableAdvancedGST: false, enableAutoRCM: false, enableQRMPScheme: false,
  enableAutoTDSPayable: false, enableAutoTDSReceivable: false, enableDiscountAutoPosting: false,
  enableTaxAuditReport: false,
  enableDomesticLandedCost: false, enableEximManagement: false, enableSAMModule: false,
  enableWhatsAppTrigger: false,
  enableInventory: true, enableBillByBill: true, enableCostCentres: false,
  enableOrderProcessing: false, enableJobWork: false, enableBudgets: false,
  enableInterestCalc: false, itemInvoiceByDefault: true, defaultReceiveGodown: '',
};

// Section 9 — Settlement Configuration
// [JWT] GET/PATCH /api/compliance/comply360/settlement/:entityId
export interface SettlementConfig {
  settlementMethod: 'fifo' | 'lifo' | 'manual';
  allowManualOverride: boolean;
  advanceAutoAdjust: boolean;
  discountOnSettlement: boolean;
  discountLedger: string;
  overdueInterest: boolean;
  interestRate: number;
  interestLedger: string;
}

export const DEFAULT_SETTLEMENT: SettlementConfig = {
  settlementMethod: 'fifo', allowManualOverride: true, advanceAutoAdjust: true,
  discountOnSettlement: false, discountLedger: '', overdueInterest: false,
  interestRate: 24, interestLedger: '',
};

// Section 10 — Outstanding Configuration
// [JWT] GET/PATCH /api/compliance/comply360/outstanding/:entityId
export interface OutstandingConfig {
  creditLimitMode: 'warn' | 'block';
  overdueBlockNewOrders: boolean;
  agingBuckets: [number, number, number, number, number];
  showMSMEFlag: boolean;
}

export const DEFAULT_OUTSTANDING: OutstandingConfig = {
  creditLimitMode: 'warn', overdueBlockNewOrders: false,
  agingBuckets: [30, 60, 90, 180, 999], showMSMEFlag: true,
};

// Storage: erp_comply360_rcm_{entityId}
// [JWT] GET/PATCH /api/compliance/comply360/rcm/:entityId
export interface RCMLedgerConfig {
  rcmJournalVCH: string;           // TDL UDF 5007 WorkFlowRCMRrnlVCH
  rcmCGSTLedger: string;           // TDL UDF 5008 CMPRCMCGST
  rcmSGSTLedger: string;           // TDL UDF 5009 RCMSGST
  rcmIGSTLedger: string;           // TDL UDF 5010 RCMSIIGST
  inputCGSTLedger: string;         // TDL UDF 5011 CMPInputCGST
  inputSGSTLedger: string;         // TDL UDF 5012 CMPInputSGST
  inputIGSTLedger: string;         // TDL UDF 5013 CMPInputIGST
  inputCessLedger: string;         // from ZXZ_Create InputS Cess function
  taxPaidAgainstRCMLedger: string; // from ZXZ_CreateTaxPaidAgainstReverseCharges
  reverseChargeInputLedger: string; // TDL UDF 5014 CMPRevChrgInputType
}
export const DEFAULT_RCM: RCMLedgerConfig = {
  rcmJournalVCH: '', rcmCGSTLedger: '', rcmSGSTLedger: '', rcmIGSTLedger: '',
  inputCGSTLedger: '', inputSGSTLedger: '', inputIGSTLedger: '',
  inputCessLedger: '', taxPaidAgainstRCMLedger: '', reverseChargeInputLedger: '',
};

// Storage: erp_comply360_tdsp_{entityId}
// [JWT] GET/PATCH /api/compliance/comply360/tds-payable/:entityId
export interface TDSPayableConfig {
  tdsPayableJournalVCH: string;  // TDL UDF 5016 CMPFlowAutoTDS
  tdsPayableLedger: string;      // TDL UDF 5022 WorkTDSPaybled
}

// Storage: erp_comply360_tdsr_{entityId}
// [JWT] GET/PATCH /api/compliance/comply360/tds-receivable/:entityId
export interface TDSReceivableConfig {
  tdsReceivableJournalVCH: string; // TDL UDF 5019 WorkAutoJrnlPosting
  tdsReceivableLedger: string;     // TDL UDF 5020 WorkAutoTSDRecledg
  discountJournalVCH: string;      // TDL UDF 3209 WorkAutoJrnlDiscPosting
  discountLedger: string;          // TDL UDF 3221 WorkAutoDisc
}

// Storage: erp_comply360_lc_{entityId}
// [JWT] GET/PATCH /api/compliance/comply360/landed-cost/:entityId
export interface LandedCostConfig {
  defaultAllocationMethod: 'by_value' | 'by_weight' | 'by_quantity' | 'equal';
  autoTrackingNumber: boolean;
  freightLedger: string;
  insuranceLedger: string;
  portCHAChargesLedger: string;
}
export const DEFAULT_LC: LandedCostConfig = {
  defaultAllocationMethod: 'by_value', autoTrackingNumber: true,
  freightLedger: '', insuranceLedger: '', portCHAChargesLedger: '',
};

// Storage: erp_comply360_exim_{entityId}
// [JWT] GET/PATCH /api/compliance/comply360/exim/:entityId
export interface ImportDutyRow {
  particular: string;  // UDF 4016 — dropdown from ImportDutyType collection
  ledger: string;      // UDF 4017 — which ledger to debit
}
export interface EximConfig {
  enableImportManagement: boolean;   // UDF 4013 CMPActivateEximManagement
  defaultCostingAllocation: 'by_value' | 'by_weight' | 'by_quantity' | 'equal';
  enableExportManagement: boolean;   // UDF 4002 CMPEmpowerExportManagement
  importDutyHierarchy: ImportDutyRow[];  // UDF 4016–4017
  cgstLedger: string;       // UDF 4019 CMPCGSTLedger
  sgstLedger: string;       // UDF 4020 CMPSGSTLedger
  igstLedger: string;       // UDF 4021 CMPIGSTLedger
  roundOffLedger: string;   // UDF 4022 CMPRoundoff
  forexGainLedger: string;  // UDF 4023 CMPForexGain
  forexLossLedger: string;  // UDF 4024 CMPForexLoss
  bankChargesLedger: string;// UDF 4036 CMPBankCharegs
  vchImportPurchaseOrder: string;    // UDF 4025
  vchAddlExpensePurchaseOrder: string; // UDF 4026
  vchCommercialInvoice: string;      // UDF 4027 CMPCommercialInvoice
  vchAddlExpensePurchase: string;    // UDF 4028 CMPAddlExpensePurchase
  vchImportGRN: string;              // UDF 4029 CMPImportGRN
  vchCustomPayment: string;          // UDF 4030 CMPCustomPayment
  vchTTPayment: string;              // UDF 4034 CMPTTPayment
  vchAddlExpensePayment: string;     // UDF 4031 CMPAddlExpensePayment
  vchTDSJournal: string;             // UDF 4032 CMPTDSJournal
  vchForexJournal: string;           // UDF 4033 CMPForexJournal
}

const DEFAULT_EXIM: EximConfig = {
  enableImportManagement: false, defaultCostingAllocation: 'by_value',
  enableExportManagement: false, importDutyHierarchy: [],
  cgstLedger: '', sgstLedger: '', igstLedger: '', roundOffLedger: '',
  forexGainLedger: '', forexLossLedger: '', bankChargesLedger: '',
  vchImportPurchaseOrder: '', vchAddlExpensePurchaseOrder: '',
  vchCommercialInvoice: '', vchAddlExpensePurchase: '',
  vchImportGRN: '', vchCustomPayment: '', vchTTPayment: '',
  vchAddlExpensePayment: '', vchTDSJournal: '', vchForexJournal: '',
};

// Storage: erp_comply360_sam_{entityId}
// [JWT] GET/PATCH /api/compliance/comply360/sam/:entityId
export interface SAMConfig {
  // General — UDF 50140–50166
  enableHierarchyMaster: boolean;   // UDF 50141 IsAllowHierancyMaster
  commissionCalcMethod: 'item_amount' | 'item_qty' | 'both';
  commissionRateMethod: 'all_items' | 'item_by_item' | 'stock_group';
  enableCommissionOnService: boolean; // UDF 50166 CMPCommissionOnService
  enableReceiver: boolean;            // UDF 50163 CMPsetalterReceiver
  enableCompanySalesPerson: boolean;  // UDF 50164 CMCompanySalesPerson
  // Voucher scope toggles
  enableInSalesOrder: boolean;        // UDF 50144
  enableInDeliveryNote: boolean;      // UDF 50145
  enableInPurchase: boolean;          // UDF 50146
  enableInPurchaseOrder: boolean;     // UDF 50147
  enableInReceiptNote: boolean;       // UDF 50148
  // Security
  hideCommissionInTransaction: boolean; // UDF 50149
  slsmMandatoryOutward: boolean;
  slsmMandatoryInward: boolean;
  receiverMandatory: boolean;           // UDF 50151
  // Printing
  printAgentNameOnInvoice: boolean;  // UDF 50150
  agentPrintTitle: string;           // UDF 50151 CMPPrintSalesManName
  // TDS on commission
  tdsOnCommissionSection: '194H' | '194J' | 'not_applicable';
  commissionLedgerSales: string;
  commissionLedgerPurchase: string;
}

const DEFAULT_SAM: SAMConfig = {
  enableHierarchyMaster: false,
  commissionCalcMethod: 'item_amount', commissionRateMethod: 'all_items',
  enableCommissionOnService: false, enableReceiver: false, enableCompanySalesPerson: false,
  enableInSalesOrder: false, enableInDeliveryNote: false, enableInPurchase: false,
  enableInPurchaseOrder: false, enableInReceiptNote: false,
  hideCommissionInTransaction: false, slsmMandatoryOutward: false,
  slsmMandatoryInward: false, receiverMandatory: false,
  printAgentNameOnInvoice: false, agentPrintTitle: '',
  tdsOnCommissionSection: 'not_applicable',
  commissionLedgerSales: '', commissionLedgerPurchase: '',
};

// Storage: erp_comply360_wa_{entityId}
// [JWT] GET/PATCH /api/compliance/comply360/whatsapp/:entityId
export interface WhatsAppConfig {
  waApiKey: string;
  waUserName: string;
  waCompanyNumber: string;
}

const DEFAULT_WA: WhatsAppConfig = {
  waApiKey: '', waUserName: '', waCompanyNumber: '',
};

const DEFAULT_TDSP: TDSPayableConfig = {
  tdsPayableJournalVCH: '', tdsPayableLedger: '',
};

const DEFAULT_TDSR: TDSReceivableConfig = {
  tdsReceivableJournalVCH: '', tdsReceivableLedger: '',
  discountJournalVCH: '', discountLedger: '',
};

// ─── Storage Key Helpers ──────────────────────────────────────────────

export const COMPLY360_GROUP_KEY = 'erp_comply360_group';
export const comply360RCMKey = (e: string) => `erp_comply360_rcm_${e}`;
export const comply360TDSPKey = (e: string) => `erp_comply360_tdsp_${e}`;
export const comply360TDSRKey = (e: string) => `erp_comply360_tdsr_${e}`;
export const comply360LCKey = (e: string) => `erp_comply360_lc_${e}`;
export const comply360EximKey = (e: string) => `erp_comply360_exim_${e}`;
export const comply360SAMKey = (e: string) => `erp_comply360_sam_${e}`;
export const comply360WAKey = (e: string) => `erp_comply360_wa_${e}`;
export const comply360FeaturesKey = (e: string) => `erp_comply360_features_${e}`;
export const comply360SettlementKey = (e: string) => `erp_comply360_settlement_${e}`;
export const comply360OutstandingKey = (e: string) => `erp_comply360_outstanding_${e}`;

// ─── Section Navigation ──────────────────────────────────────────────

const SECTIONS = [
  { id: 'rcm', label: 'RCM ledgers', toggle: 'enableAutoRCM' as keyof GroupConfig },
  { id: 'tdsp', label: 'TDS payable', toggle: 'enableAutoTDSPayable' as keyof GroupConfig },
  { id: 'tdsr', label: 'TDS receivable', toggle: 'enableAutoTDSReceivable' as keyof GroupConfig },
  { id: 'lc', label: 'Landed cost', toggle: 'enableDomesticLandedCost' as keyof GroupConfig },
  { id: 'exim', label: 'Exim', toggle: 'enableEximManagement' as keyof GroupConfig },
  { id: 'sam', label: 'SAM / broker', toggle: 'enableSAMModule' as keyof GroupConfig },
  { id: 'wa', label: 'WhatsApp', toggle: 'enableWhatsAppTrigger' as keyof GroupConfig },
  { id: 'features', label: 'Features (F11)', toggle: 'enableInventory' as keyof GroupConfig },
  { id: 'settlement', label: 'Settlement', toggle: 'enableBillByBill' as keyof GroupConfig },
  { id: 'outstanding', label: 'Outstanding', toggle: 'enableBillByBill' as keyof GroupConfig },
];

const IMPORT_DUTY_TYPES = [
  'BCD (Basic Customs Duty)',
  'SWS (Social Welfare Surcharge)',
  'AIDC (Agriculture Infrastructure Development Cess)',
  'IGST on Import',
  'Compensation Cess',
  'Anti-Dumping Duty',
  'Safeguard Duty',
];

// ─── Helpers ──────────────────────────────────────────────────────────

function loadOrDefault<T>(key: string, def: T): T {
  try {
    // [JWT] GET /api/compliance/comply360/config/:key
    const raw = localStorage.getItem(key);
    return raw ? { ...def, ...JSON.parse(raw) } : def;
  } catch { return def; }
}

// ─── Panel Component ──────────────────────────────────────────────────

export function Comply360ConfigPanel() {
  const { entities, selectedEntityId, setSelectedEntityId } = useEntityList();

  // Group config (global)
  const [groupConfig, setGroupConfig] = useState<GroupConfig>(() =>
    // [JWT] GET /api/compliance/comply360/group
    loadOrDefault(COMPLY360_GROUP_KEY, DEFAULT_GROUP_CONFIG)
  );

  // Entity-specific configs
  const [rcmConfig, setRcmConfig] = useState<RCMLedgerConfig>(DEFAULT_RCM);
  const [tdspConfig, setTdspConfig] = useState<TDSPayableConfig>(DEFAULT_TDSP);
  const [tdsrConfig, setTdsrConfig] = useState<TDSReceivableConfig>(DEFAULT_TDSR);
  const [lcConfig, setLcConfig] = useState<LandedCostConfig>(DEFAULT_LC);
  const [eximConfig, setEximConfig] = useState<EximConfig>(DEFAULT_EXIM);
  const [samConfig, setSamConfig] = useState<SAMConfig>(DEFAULT_SAM);
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>(DEFAULT_WA);
  const [settlementConfig, setSettlementConfig] = useState<SettlementConfig>(DEFAULT_SETTLEMENT);
  const [outstandingConfig, setOutstandingConfig] = useState<OutstandingConfig>(DEFAULT_OUTSTANDING);

  const [activeSection, setActiveSection] = useState('rcm');

  // Entity change effect — reload all 7 entity-specific configs
  useEffect(() => {
    if (!selectedEntityId) return;
    const entityId = selectedEntityId;
    // [JWT] GET /api/compliance/comply360/:entityId/all
    setRcmConfig(loadOrDefault(comply360RCMKey(entityId), DEFAULT_RCM));
    setTdspConfig(loadOrDefault(comply360TDSPKey(entityId), DEFAULT_TDSP));
    setTdsrConfig(loadOrDefault(comply360TDSRKey(entityId), DEFAULT_TDSR));
    setLcConfig(loadOrDefault(comply360LCKey(entityId), DEFAULT_LC));
    setEximConfig(loadOrDefault(comply360EximKey(entityId), DEFAULT_EXIM));
    setSamConfig(loadOrDefault(comply360SAMKey(entityId), DEFAULT_SAM));
    setWaConfig(loadOrDefault(comply360WAKey(entityId), DEFAULT_WA));
    setSettlementConfig(loadOrDefault(comply360SettlementKey(entityId), DEFAULT_SETTLEMENT));
    setOutstandingConfig(loadOrDefault(comply360OutstandingKey(entityId), DEFAULT_OUTSTANDING));
  }, [selectedEntityId]);

  // Auto-disable dependent toggles
  useEffect(() => {
    if (!groupConfig.enableAdvancedGST && groupConfig.enableAutoRCM) {
      setGroupConfig(prev => ({ ...prev, enableAutoRCM: false }));
    }
  }, [groupConfig.enableAdvancedGST]);

  // ── Save handlers ──

  const handleSaveGroup = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/group
    localStorage.setItem(COMPLY360_GROUP_KEY, JSON.stringify(groupConfig));
    toast.success('Group configuration saved');
  }, [groupConfig]);

  const handleSaveRCM = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/rcm/:entityId
    localStorage.setItem(comply360RCMKey(selectedEntityId), JSON.stringify(rcmConfig));
    toast.success('RCM configuration saved');
  }, [rcmConfig, selectedEntityId]);

  const handleSaveTDSP = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/tds-payable/:entityId
    localStorage.setItem(comply360TDSPKey(selectedEntityId), JSON.stringify(tdspConfig));
    toast.success('TDS Payable configuration saved');
  }, [tdspConfig, selectedEntityId]);

  const handleSaveTDSR = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/tds-receivable/:entityId
    localStorage.setItem(comply360TDSRKey(selectedEntityId), JSON.stringify(tdsrConfig));
    toast.success('TDS Receivable configuration saved');
  }, [tdsrConfig, selectedEntityId]);

  const handleSaveLC = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/landed-cost/:entityId
    localStorage.setItem(comply360LCKey(selectedEntityId), JSON.stringify(lcConfig));
    toast.success('Landed Cost configuration saved');
  }, [lcConfig, selectedEntityId]);

  const handleSaveExim = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/exim/:entityId
    localStorage.setItem(comply360EximKey(selectedEntityId), JSON.stringify(eximConfig));
    toast.success('Exim configuration saved');
  }, [eximConfig, selectedEntityId]);

  const handleSaveSAM = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/sam/:entityId
    localStorage.setItem(comply360SAMKey(selectedEntityId), JSON.stringify(samConfig));
    toast.success('SAM configuration saved');
  }, [samConfig, selectedEntityId]);

  const handleSaveWA = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/whatsapp/:entityId
    localStorage.setItem(comply360WAKey(selectedEntityId), JSON.stringify(waConfig));
    toast.success('WhatsApp configuration saved');
  }, [waConfig, selectedEntityId]);

  const handleSaveFeatures = useCallback(() => {
    handleSaveGroup();
  }, [handleSaveGroup]);

  const handleSaveSettlement = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/settlement/:entityId
    localStorage.setItem(comply360SettlementKey(selectedEntityId), JSON.stringify(settlementConfig));
    toast.success('Settlement configuration saved');
  }, [settlementConfig, selectedEntityId]);

  const handleSaveOutstanding = useCallback(() => {
    // [JWT] PATCH /api/compliance/comply360/outstanding/:entityId
    localStorage.setItem(comply360OutstandingKey(selectedEntityId), JSON.stringify(outstandingConfig));
    toast.success('Outstanding configuration saved');
  }, [outstandingConfig, selectedEntityId]);

  const handleCtrlS = useCallback(() => {
    switch (activeSection) {
      case 'rcm':   handleSaveRCM(); break;
      case 'tdsp':  handleSaveTDSP(); break;
      case 'tdsr':  handleSaveTDSR(); break;
      case 'lc':    handleSaveLC(); break;
      case 'exim':  handleSaveExim(); break;
      case 'sam':   handleSaveSAM(); break;
      case 'wa':    handleSaveWA(); break;
      case 'features': handleSaveFeatures(); break;
      case 'settlement': handleSaveSettlement(); break;
      case 'outstanding': handleSaveOutstanding(); break;
      default:      handleSaveGroup(); break;
    }
  }, [activeSection, handleSaveGroup, handleSaveRCM, handleSaveTDSP, handleSaveTDSR, handleSaveLC, handleSaveExim, handleSaveSAM, handleSaveWA, handleSaveFeatures, handleSaveSettlement, handleSaveOutstanding]);

  useCtrlS(handleCtrlS);

  // ── Toggle helper ──
  const updateGroup = (key: keyof GroupConfig, value: boolean) => {
    if (key === 'enableAutoRCM' && !groupConfig.enableAdvancedGST) {
      toast.error('Enable Advanced GST Reports first.');
      return;
    }
    setGroupConfig(prev => ({ ...prev, [key]: value }));
  };

  // ── Voucher scope items for SAM ──
  const voucherScopes = [
    { key: 'enableInSalesOrder' as keyof SAMConfig, label: 'Sales Order', udf: '50144' },
    { key: 'enableInDeliveryNote' as keyof SAMConfig, label: 'Delivery Note', udf: '50145' },
    { key: 'enableInPurchase' as keyof SAMConfig, label: 'Purchase Invoice', udf: '50146' },
    { key: 'enableInPurchaseOrder' as keyof SAMConfig, label: 'Purchase Order', udf: '50147', dependsOn: 'enableInPurchase' as keyof SAMConfig },
    { key: 'enableInReceiptNote' as keyof SAMConfig, label: 'Receipt Note', udf: '50148', dependsOn: 'enableInPurchase' as keyof SAMConfig },
  ];

  // ── Section active check ──
  const isSectionEnabled = (sectionId: string) => {
    const sec = SECTIONS.find(s => s.id === sectionId);
    if (!sec) return false;
    return groupConfig[sec.toggle] === true;
  };

  // ── Render active section form ──
  const renderSectionForm = () => {
    const enabled = isSectionEnabled(activeSection);

    if (!enabled) {
      const sec = SECTIONS.find(s => s.id === activeSection);
      return (
        <div className="p-12 text-center rounded-lg bg-muted/30 border border-border/50">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Enable <span className="font-semibold">{sec?.label}</span> in Group Configuration to configure this section.
          </p>
        </div>
      );
    }

    switch (activeSection) {
      case 'rcm': return renderRCMSection();
      case 'tdsp': return renderTDSPSection();
      case 'tdsr': return renderTDSRSection();
      case 'lc': return renderLCSection();
      case 'exim': return renderEximSection();
      case 'sam': return renderSAMSection();
      case 'wa': return renderWASection();
      case 'features': return renderFeaturesSection();
      case 'settlement': return renderSettlementSection();
      case 'outstanding': return renderOutstandingSection();
      default: return null;
    }
  };

  // ── RCM Section ──
  const renderRCMSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">RCM Ledger Mapping</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label className="text-xs">RCM Journal VCH</Label>
          <Input value={rcmConfig.rcmJournalVCH} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, rcmJournalVCH: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5007" /></div>
        <div><Label className="text-xs">RCM CGST Ledger</Label>
          <Input value={rcmConfig.rcmCGSTLedger} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, rcmCGSTLedger: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5008" /></div>
        <div><Label className="text-xs">RCM SGST Ledger</Label>
          <Input value={rcmConfig.rcmSGSTLedger} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, rcmSGSTLedger: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5009" /></div>
        <div><Label className="text-xs">RCM IGST Ledger</Label>
          <Input value={rcmConfig.rcmIGSTLedger} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, rcmIGSTLedger: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5010" /></div>
        <div><Label className="text-xs">Input CGST Ledger</Label>
          <Input value={rcmConfig.inputCGSTLedger} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, inputCGSTLedger: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5011" /></div>
        <div><Label className="text-xs">Input SGST Ledger</Label>
          <Input value={rcmConfig.inputSGSTLedger} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, inputSGSTLedger: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5012" /></div>
        <div><Label className="text-xs">Input IGST Ledger</Label>
          <Input value={rcmConfig.inputIGSTLedger} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, inputIGSTLedger: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5013" /></div>
        <div><Label className="text-xs">Input Cess Ledger</Label>
          <Input value={rcmConfig.inputCessLedger} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, inputCessLedger: e.target.value }))} className="h-8 text-sm" placeholder="Cess input" /></div>
        <div><Label className="text-xs">Tax Paid Against RCM Ledger</Label>
          <Input value={rcmConfig.taxPaidAgainstRCMLedger} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, taxPaidAgainstRCMLedger: e.target.value }))} className="h-8 text-sm" placeholder="RCM tax paid" /></div>
        <div><Label className="text-xs">Reverse Charge Input Ledger</Label>
          <Input value={rcmConfig.reverseChargeInputLedger} onKeyDown={onEnterNext} onChange={e => setRcmConfig(p => ({ ...p, reverseChargeInputLedger: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5014" /></div>
      </div>
      <Button data-primary onClick={handleSaveRCM} className="w-full"><Save className="h-4 w-4 mr-1" /> Save RCM Config</Button>
    </div>
  );

  // ── TDS Payable Section ──
  const renderTDSPSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">TDS Payable Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label className="text-xs">TDS Payable Journal VCH</Label>
          <Input value={tdspConfig.tdsPayableJournalVCH} onKeyDown={onEnterNext} onChange={e => setTdspConfig(p => ({ ...p, tdsPayableJournalVCH: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5016" /></div>
        <div><Label className="text-xs">TDS Payable Ledger</Label>
          <Input value={tdspConfig.tdsPayableLedger} onKeyDown={onEnterNext} onChange={e => setTdspConfig(p => ({ ...p, tdsPayableLedger: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5022" /></div>
      </div>
      <Button data-primary onClick={handleSaveTDSP} className="w-full"><Save className="h-4 w-4 mr-1" /> Save TDS Payable Config</Button>
    </div>
  );

  // ── TDS Receivable Section ──
  const renderTDSRSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">TDS Receivable Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label className="text-xs">TDS Receivable Journal VCH</Label>
          <Input value={tdsrConfig.tdsReceivableJournalVCH} onKeyDown={onEnterNext} onChange={e => setTdsrConfig(p => ({ ...p, tdsReceivableJournalVCH: e.target.value }))} className="h-8 text-sm" placeholder="UDF 5019" /></div>
        <div><Label className="text-xs">TDS Receivable Ledger (Dr for 26AS JV)</Label>
          <Input value={tdsrConfig.tdsReceivableLedger} onKeyDown={onEnterNext} onChange={e => setTdsrConfig(p => ({ ...p, tdsReceivableLedger: e.target.value }))} className="h-8 text-sm" placeholder="Default: TDS Receivable" />
          <p className="text-[10px] text-muted-foreground mt-0.5">Current Assets ledger. Auto-JV: Dr this ledger, Cr Customer.</p></div>
        <div><Label className="text-xs">Discount Journal VCH</Label>
          <Input value={tdsrConfig.discountJournalVCH} onKeyDown={onEnterNext} onChange={e => setTdsrConfig(p => ({ ...p, discountJournalVCH: e.target.value }))} className="h-8 text-sm" placeholder="UDF 3209" /></div>
        <div><Label className="text-xs">Discount Ledger</Label>
          <Input value={tdsrConfig.discountLedger} onKeyDown={onEnterNext} onChange={e => setTdsrConfig(p => ({ ...p, discountLedger: e.target.value }))} className="h-8 text-sm" placeholder="UDF 3221" /></div>
      </div>
      <Button data-primary onClick={handleSaveTDSR} className="w-full"><Save className="h-4 w-4 mr-1" /> Save TDS Receivable Config</Button>
    </div>
  );

  // ── Landed Cost Section ──
  const renderLCSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Landed Cost Configuration</h3>
      <div className="space-y-3">
        <div><Label className="text-xs">Default Allocation Method</Label>
          <Select value={lcConfig.defaultAllocationMethod} onValueChange={v => setLcConfig(p => ({ ...p, defaultAllocationMethod: v as LandedCostConfig['defaultAllocationMethod'] }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="by_value">By Value</SelectItem>
              <SelectItem value="by_weight">By Weight</SelectItem>
              <SelectItem value="by_quantity">By Quantity</SelectItem>
              <SelectItem value="equal">Equal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Auto Tracking Number</Label>
            <p className="text-[10px] text-muted-foreground">Auto-generate tracking number on transit voucher</p></div>
          <Switch checked={lcConfig.autoTrackingNumber} onCheckedChange={v => setLcConfig(p => ({ ...p, autoTrackingNumber: v }))} />
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Freight Ledger</Label>
            <Input value={lcConfig.freightLedger} onKeyDown={onEnterNext} onChange={e => setLcConfig(p => ({ ...p, freightLedger: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Insurance Ledger</Label>
            <Input value={lcConfig.insuranceLedger} onKeyDown={onEnterNext} onChange={e => setLcConfig(p => ({ ...p, insuranceLedger: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Port / CHA Charges Ledger</Label>
            <Input value={lcConfig.portCHAChargesLedger} onKeyDown={onEnterNext} onChange={e => setLcConfig(p => ({ ...p, portCHAChargesLedger: e.target.value }))} className="h-8 text-sm" /></div>
        </div>
      </div>
      <Button data-primary onClick={handleSaveLC} className="w-full"><Save className="h-4 w-4 mr-1" /> Save Landed Cost Config</Button>
    </div>
  );

  // ── Exim Section ──
  const renderEximSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Exim Management Configuration</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable Import Management</Label>
          <Switch checked={eximConfig.enableImportManagement} onCheckedChange={v => setEximConfig(p => ({ ...p, enableImportManagement: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable Export Management</Label>
          <Switch checked={eximConfig.enableExportManagement} onCheckedChange={v => setEximConfig(p => ({ ...p, enableExportManagement: v }))} />
        </div>
        <div><Label className="text-xs">Default Costing Allocation</Label>
          <Select value={eximConfig.defaultCostingAllocation} onValueChange={v => setEximConfig(p => ({ ...p, defaultCostingAllocation: v as EximConfig['defaultCostingAllocation'] }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="by_value">By Value</SelectItem>
              <SelectItem value="by_weight">By Weight</SelectItem>
              <SelectItem value="by_quantity">By Quantity</SelectItem>
              <SelectItem value="equal">Equal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Import Duty Taxability Hierarchy</h4>
        {eximConfig.importDutyHierarchy.map((row, idx) => (
          <div key={idx} className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Duty Type</Label>
              <Select value={row.particular} onValueChange={v => {
                const updated = [...eximConfig.importDutyHierarchy];
                updated[idx] = { ...updated[idx], particular: v };
                setEximConfig(p => ({ ...p, importDutyHierarchy: updated }));
              }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {IMPORT_DUTY_TYPES.map(dt => (
                    <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Ledger</Label>
              <Input value={row.ledger} onKeyDown={onEnterNext} onChange={e => {
                const updated = [...eximConfig.importDutyHierarchy];
                updated[idx] = { ...updated[idx], ledger: e.target.value };
                setEximConfig(p => ({ ...p, importDutyHierarchy: updated }));
              }} className="h-8 text-sm" /></div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
              setEximConfig(p => ({ ...p, importDutyHierarchy: p.importDutyHierarchy.filter((_, i) => i !== idx) }));
            }}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => {
          setEximConfig(p => ({ ...p, importDutyHierarchy: [...p.importDutyHierarchy, { particular: '', ledger: '' }] }));
        }}><Plus className="h-3.5 w-3.5 mr-1" /> Add Row</Button>

        <Separator />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Other Taxable Ledgers</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label className="text-xs">CGST Ledger</Label>
            <Input value={eximConfig.cgstLedger} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, cgstLedger: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">SGST Ledger</Label>
            <Input value={eximConfig.sgstLedger} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, sgstLedger: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">IGST Ledger</Label>
            <Input value={eximConfig.igstLedger} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, igstLedger: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Round Off Ledger</Label>
            <Input value={eximConfig.roundOffLedger} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, roundOffLedger: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Forex Gain Ledger</Label>
            <Input value={eximConfig.forexGainLedger} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, forexGainLedger: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Forex Loss Ledger</Label>
            <Input value={eximConfig.forexLossLedger} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, forexLossLedger: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Bank Charges Ledger</Label>
            <Input value={eximConfig.bankChargesLedger} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, bankChargesLedger: e.target.value }))} className="h-8 text-sm" /></div>
        </div>

        <Separator />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto Voucher Types for Posting</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label className="text-xs">Import Purchase Order</Label>
            <Input value={eximConfig.vchImportPurchaseOrder} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchImportPurchaseOrder: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Addl Expense Purchase Order</Label>
            <Input value={eximConfig.vchAddlExpensePurchaseOrder} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchAddlExpensePurchaseOrder: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Commercial Invoice</Label>
            <Input value={eximConfig.vchCommercialInvoice} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchCommercialInvoice: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Addl Expense Purchase</Label>
            <Input value={eximConfig.vchAddlExpensePurchase} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchAddlExpensePurchase: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Import GRN</Label>
            <Input value={eximConfig.vchImportGRN} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchImportGRN: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Custom Payment</Label>
            <Input value={eximConfig.vchCustomPayment} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchCustomPayment: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">TT Payment</Label>
            <Input value={eximConfig.vchTTPayment} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchTTPayment: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Addl Expense Payment</Label>
            <Input value={eximConfig.vchAddlExpensePayment} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchAddlExpensePayment: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">TDS Journal</Label>
            <Input value={eximConfig.vchTDSJournal} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchTDSJournal: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Forex Journal</Label>
            <Input value={eximConfig.vchForexJournal} onKeyDown={onEnterNext} onChange={e => setEximConfig(p => ({ ...p, vchForexJournal: e.target.value }))} className="h-8 text-sm" /></div>
        </div>
      </div>
      <Button data-primary onClick={handleSaveExim} className="w-full"><Save className="h-4 w-4 mr-1" /> Save Exim Config</Button>
    </div>
  );

  // ── SAM Section ──
  const renderSAMSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">SAM / Broker Configuration</h3>
      <div className="space-y-3">
        {/* General */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable Hierarchy Master</Label>
          <Switch checked={samConfig.enableHierarchyMaster} onCheckedChange={v => setSamConfig(p => ({ ...p, enableHierarchyMaster: v }))} />
        </div>
        <div><Label className="text-xs">Commission Calculation Method</Label>
          <Select value={samConfig.commissionCalcMethod} onValueChange={v => setSamConfig(p => ({ ...p, commissionCalcMethod: v as SAMConfig['commissionCalcMethod'] }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="item_amount">Item Amount</SelectItem>
              <SelectItem value="item_qty">Item Quantity</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Commission Rate Method</Label>
          <Select value={samConfig.commissionRateMethod} onValueChange={v => setSamConfig(p => ({ ...p, commissionRateMethod: v as SAMConfig['commissionRateMethod'] }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_items">All Items</SelectItem>
              <SelectItem value="item_by_item">Item by Item</SelectItem>
              <SelectItem value="stock_group">Stock Group</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Commission on Service</Label>
          <Switch checked={samConfig.enableCommissionOnService} onCheckedChange={v => setSamConfig(p => ({ ...p, enableCommissionOnService: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable Receiver</Label>
          <Switch checked={samConfig.enableReceiver} onCheckedChange={v => setSamConfig(p => ({ ...p, enableReceiver: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Company Sales Person</Label>
          <Switch checked={samConfig.enableCompanySalesPerson} onCheckedChange={v => setSamConfig(p => ({ ...p, enableCompanySalesPerson: v }))} />
        </div>

        <Separator />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Voucher Scope</h4>
        {voucherScopes.map(vs => {
          const disabled = vs.dependsOn ? !samConfig[vs.dependsOn] : false;
          return (
            <div key={vs.key} className={`flex items-center gap-3 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
              <Checkbox
                checked={samConfig[vs.key] as boolean}
                onCheckedChange={v => setSamConfig(p => ({ ...p, [vs.key]: v }))}
              />
              <Label className="text-sm">{vs.label}</Label>
              <Badge variant="outline" className="text-[9px] ml-auto">UDF {vs.udf}</Badge>
            </div>
          );
        })}

        <Separator />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Security</h4>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Hide Commission in Transaction</Label>
          <Switch checked={samConfig.hideCommissionInTransaction} onCheckedChange={v => setSamConfig(p => ({ ...p, hideCommissionInTransaction: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">SLSM Mandatory Outward</Label>
          <Switch checked={samConfig.slsmMandatoryOutward} onCheckedChange={v => setSamConfig(p => ({ ...p, slsmMandatoryOutward: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">SLSM Mandatory Inward</Label>
          <Switch checked={samConfig.slsmMandatoryInward} onCheckedChange={v => setSamConfig(p => ({ ...p, slsmMandatoryInward: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Receiver Mandatory</Label>
          <Switch checked={samConfig.receiverMandatory} onCheckedChange={v => setSamConfig(p => ({ ...p, receiverMandatory: v }))} />
        </div>

        <Separator />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Printing</h4>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Print Agent Name on Invoice</Label>
          <Switch checked={samConfig.printAgentNameOnInvoice} onCheckedChange={v => setSamConfig(p => ({ ...p, printAgentNameOnInvoice: v }))} />
        </div>
        <div><Label className="text-xs">Agent Print Title</Label>
          <Input value={samConfig.agentPrintTitle} onKeyDown={onEnterNext} onChange={e => setSamConfig(p => ({ ...p, agentPrintTitle: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Sales Agent" /></div>

        <Separator />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TDS on Commission</h4>
        <div><Label className="text-xs">TDS Section</Label>
          <Select value={samConfig.tdsOnCommissionSection} onValueChange={v => setSamConfig(p => ({ ...p, tdsOnCommissionSection: v as SAMConfig['tdsOnCommissionSection'] }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_applicable">Not Applicable</SelectItem>
              <SelectItem value="194H">194H — Commission / Brokerage</SelectItem>
              <SelectItem value="194J">194J — Professional / Technical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label className="text-xs">Commission Ledger (Sales)</Label>
            <Input value={samConfig.commissionLedgerSales} onKeyDown={onEnterNext} onChange={e => setSamConfig(p => ({ ...p, commissionLedgerSales: e.target.value }))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Commission Ledger (Purchase)</Label>
            <Input value={samConfig.commissionLedgerPurchase} onKeyDown={onEnterNext} onChange={e => setSamConfig(p => ({ ...p, commissionLedgerPurchase: e.target.value }))} className="h-8 text-sm" /></div>
        </div>
      </div>
      <Button data-primary onClick={handleSaveSAM} className="w-full"><Save className="h-4 w-4 mr-1" /> Save SAM Config</Button>
    </div>
  );

  // ── WhatsApp Section ──
  const renderWASection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp Configuration</h3>
      <div className="grid grid-cols-1 gap-3">
        <div><Label className="text-xs">API Key</Label>
          <Input value={waConfig.waApiKey} onKeyDown={onEnterNext} onChange={e => setWaConfig(p => ({ ...p, waApiKey: e.target.value }))} className="h-8 text-sm" placeholder="WhatsApp Business API Key" /></div>
        <div><Label className="text-xs">User Name</Label>
          <Input value={waConfig.waUserName} onKeyDown={onEnterNext} onChange={e => setWaConfig(p => ({ ...p, waUserName: e.target.value }))} className="h-8 text-sm" placeholder="Display name" /></div>
        <div><Label className="text-xs">Company Number</Label>
          <Input value={waConfig.waCompanyNumber} onKeyDown={onEnterNext} onChange={e => setWaConfig(p => ({ ...p, waCompanyNumber: e.target.value }))} className="h-8 text-sm" placeholder="+91 XXXXX XXXXX" /></div>
      </div>
      <Button data-primary onClick={handleSaveWA} className="w-full"><Save className="h-4 w-4 mr-1" /> Save WhatsApp Config</Button>
    </div>
  );

  // ── Features (F11) Section ──
  const renderFeaturesSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Voucher Features (F11)</h3>
      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Enable Inventory</Label><p className="text-[10px] text-muted-foreground">Allow item-based invoices</p></div>
          <Switch checked={groupConfig.enableInventory} onCheckedChange={v => updateGroup('enableInventory', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Bill-by-Bill</Label><p className="text-[10px] text-muted-foreground">Track outstanding per invoice</p></div>
          <Switch checked={groupConfig.enableBillByBill} onCheckedChange={v => updateGroup('enableBillByBill', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Cost Centres</Label><p className="text-[10px] text-muted-foreground">Allocate to cost/profit centres</p></div>
          <Switch checked={groupConfig.enableCostCentres} onCheckedChange={v => updateGroup('enableCostCentres', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Order Processing</Label><p className="text-[10px] text-muted-foreground">Sales/Purchase order tracking</p></div>
          <Switch checked={groupConfig.enableOrderProcessing} onCheckedChange={v => updateGroup('enableOrderProcessing', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Job Work</Label><p className="text-[10px] text-muted-foreground">Job work in/out tracking</p></div>
          <Switch checked={groupConfig.enableJobWork} onCheckedChange={v => updateGroup('enableJobWork', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Budgets</Label><p className="text-[10px] text-muted-foreground">Budget and control allocation</p></div>
          <Switch checked={groupConfig.enableBudgets} onCheckedChange={v => updateGroup('enableBudgets', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Interest Calculation</Label><p className="text-[10px] text-muted-foreground">Auto interest on overdue bills</p></div>
          <Switch checked={groupConfig.enableInterestCalc} onCheckedChange={v => updateGroup('enableInterestCalc', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Item Invoice by Default</Label><p className="text-[10px] text-muted-foreground">Default to item mode in invoices</p></div>
          <Switch checked={groupConfig.itemInvoiceByDefault} onCheckedChange={v => updateGroup('itemInvoiceByDefault', v)} />
        </div>
        <div>
          <Label className="text-xs">Default Receive Godown</Label>
          <Input value={groupConfig.defaultReceiveGodown} onKeyDown={onEnterNext} onChange={e => setGroupConfig(p => ({ ...p, defaultReceiveGodown: e.target.value }))} className="h-8 text-sm" placeholder="Main Store" />
        </div>
      </div>
      <Button data-primary onClick={handleSaveFeatures} className="w-full"><Save className="h-4 w-4 mr-1" /> Save Features</Button>
    </div>
  );

  // ── Settlement Section ──
  const renderSettlementSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Settlement Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Settlement Method</Label>
          <Select value={settlementConfig.settlementMethod} onValueChange={v => setSettlementConfig(p => ({ ...p, settlementMethod: v as 'fifo' | 'lifo' | 'manual' }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fifo">FIFO (First In First Out)</SelectItem>
              <SelectItem value="lifo">LIFO (Last In First Out)</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Allow Manual Override</Label><p className="text-[10px] text-muted-foreground">Override auto-settlement</p></div>
          <Switch checked={settlementConfig.allowManualOverride} onCheckedChange={v => setSettlementConfig(p => ({ ...p, allowManualOverride: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Advance Auto-Adjust</Label><p className="text-[10px] text-muted-foreground">Auto-adjust advances against bills</p></div>
          <Switch checked={settlementConfig.advanceAutoAdjust} onCheckedChange={v => setSettlementConfig(p => ({ ...p, advanceAutoAdjust: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Discount on Settlement</Label><p className="text-[10px] text-muted-foreground">Allow prompt-payment discount</p></div>
          <Switch checked={settlementConfig.discountOnSettlement} onCheckedChange={v => setSettlementConfig(p => ({ ...p, discountOnSettlement: v }))} />
        </div>
      </div>
      {settlementConfig.discountOnSettlement && (
        <div>
          <Label className="text-xs">Discount Ledger</Label>
          <Input value={settlementConfig.discountLedger} onKeyDown={onEnterNext} onChange={e => setSettlementConfig(p => ({ ...p, discountLedger: e.target.value }))} className="h-8 text-sm" placeholder="Discount Allowed A/c" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div><Label className="text-sm">Overdue Interest</Label><p className="text-[10px] text-muted-foreground">Calculate interest on overdue bills</p></div>
        <Switch checked={settlementConfig.overdueInterest} onCheckedChange={v => setSettlementConfig(p => ({ ...p, overdueInterest: v }))} />
      </div>
      {settlementConfig.overdueInterest && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Interest Rate (%)</Label>
            <Input type="number" value={settlementConfig.interestRate} onKeyDown={onEnterNext} onChange={e => setSettlementConfig(p => ({ ...p, interestRate: Number(e.target.value) }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Interest Ledger</Label>
            <Input value={settlementConfig.interestLedger} onKeyDown={onEnterNext} onChange={e => setSettlementConfig(p => ({ ...p, interestLedger: e.target.value }))} className="h-8 text-sm" placeholder="Interest Received A/c" />
          </div>
        </div>
      )}
      <Button data-primary onClick={handleSaveSettlement} className="w-full"><Save className="h-4 w-4 mr-1" /> Save Settlement Config</Button>
    </div>
  );

  // ── Outstanding Section ──
  const renderOutstandingSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Credit Limit Mode</Label>
          <Select value={outstandingConfig.creditLimitMode} onValueChange={v => setOutstandingConfig(p => ({ ...p, creditLimitMode: v as 'warn' | 'block' }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="warn">Warn Only</SelectItem>
              <SelectItem value="block">Block Transaction</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Block New Orders on Overdue</Label><p className="text-[10px] text-muted-foreground">Prevent orders when overdue</p></div>
          <Switch checked={outstandingConfig.overdueBlockNewOrders} onCheckedChange={v => setOutstandingConfig(p => ({ ...p, overdueBlockNewOrders: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label className="text-sm">Show MSME Flag</Label><p className="text-[10px] text-muted-foreground">Flag MSME vendors in outstanding</p></div>
          <Switch checked={outstandingConfig.showMSMEFlag} onCheckedChange={v => setOutstandingConfig(p => ({ ...p, showMSMEFlag: v }))} />
        </div>
      </div>
      <div>
        <Label className="text-xs mb-2 block">Aging Buckets (days)</Label>
        <div className="grid grid-cols-5 gap-2">
          {outstandingConfig.agingBuckets.map((val, idx) => (
            <div key={idx}>
              <Label className="text-[10px] text-muted-foreground">Bucket {idx + 1}</Label>
              <Input type="number" value={val} onKeyDown={onEnterNext} onChange={e => {
                const updated = [...outstandingConfig.agingBuckets] as [number, number, number, number, number];
                updated[idx] = Number(e.target.value);
                setOutstandingConfig(p => ({ ...p, agingBuckets: updated }));
              }} className="h-8 text-sm" />
            </div>
          ))}
        </div>
      </div>
      <Button data-primary onClick={handleSaveOutstanding} className="w-full"><Save className="h-4 w-4 mr-1" /> Save Outstanding Config</Button>
    </div>
  );

  const ToggleRow = ({ label, desc, toggleKey, disabled = false }: {
    label: string; desc: string; toggleKey: keyof GroupConfig; disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between">
      <div>
        <Label className={`text-sm ${disabled ? 'text-muted-foreground' : ''}`}>{label}</Label>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={groupConfig[toggleKey] as boolean} disabled={disabled} onCheckedChange={v => updateGroup(toggleKey, v)} />
    </div>
  );

  return (
    <div className="space-y-6" data-keyboard-form>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-foreground">Comply360 Configuration</h1>
          <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Sprint 22A</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Enable compliance automations and configure per-entity ledger mappings. All changes here affect FineCore transactions.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left Column — Group Config Toggles (fixed width) */}
        <div className="w-[260px] shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Group Configuration
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Applies to all entities</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GST</h4>
              <ToggleRow label="Advanced GST Reports" desc="GSTR-1, 3B, 2B reconciliation" toggleKey="enableAdvancedGST" />
              <ToggleRow label="Auto RCM Management" desc={!groupConfig.enableAdvancedGST ? 'Requires Advanced GST' : 'Auto reverse charge entries'} toggleKey="enableAutoRCM" disabled={!groupConfig.enableAdvancedGST} />
              <ToggleRow label="QRMP Scheme" desc="Quarterly return filing" toggleKey="enableQRMPScheme" />
              <Separator />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Income Tax</h4>
              <ToggleRow label="Auto TDS Payable" desc="Auto-deduct TDS on vendor payments" toggleKey="enableAutoTDSPayable" />
              <ToggleRow label="Auto TDS Receivable" desc="Track TDS deducted by customers" toggleKey="enableAutoTDSReceivable" />
              <ToggleRow label="Discount Auto Posting" desc="Auto discount journal entries" toggleKey="enableDiscountAutoPosting" />
              <Separator />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audit</h4>
              <ToggleRow label="Tax Audit Report" desc="Form 3CD and Clause 44" toggleKey="enableTaxAuditReport" />
              <Separator />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trading Features</h4>
              <ToggleRow label="Domestic Landed Cost" desc="Freight, insurance, CHA charges" toggleKey="enableDomesticLandedCost" />
              <ToggleRow label="Exim Management" desc="Import/export with duty hierarchy" toggleKey="enableEximManagement" />
              <ToggleRow label="SAM Module" desc="Sales agent / broker commission" toggleKey="enableSAMModule" />
              <Separator />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Communication</h4>
              <ToggleRow label="WhatsApp Trigger" desc="Send vouchers via WhatsApp" toggleKey="enableWhatsAppTrigger" />
              <Separator />
              <Button data-primary onClick={handleSaveGroup} className="w-full" size="sm">
                <Save className="h-3.5 w-3.5 mr-1" /> Save Group Config
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Entity-specific sections */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Entity selector */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium shrink-0">Entity</Label>
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
              <SelectTrigger className="w-72 h-9">
                <SelectValue placeholder="Choose an entity..." />
              </SelectTrigger>
              <SelectContent>
                {entities.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section navigation pills */}
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map(sec => {
              const enabled = groupConfig[sec.toggle] === true;
              const isActive = activeSection === sec.id;
              return (
                <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : enabled
                        ? 'bg-card border-border text-foreground hover:bg-muted/50'
                        : 'bg-card border-border text-muted-foreground opacity-40 hover:opacity-60'
                  }`}>
                  {sec.label}
                </button>
              );
            })}
          </div>

          {/* Active section form */}
          <Card>
            <CardContent className="pt-6">
              {renderSectionForm()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Comply360ConfigPage() {
  const navigate = useNavigate();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className='min-h-screen bg-background'>
        <ERPHeader breadcrumbs={[
          { label: 'Operix Core', href: '/erp/dashboard' },
          { label: 'Command Center', href: '/erp/command-center' },
          { label: 'Comply360 Configuration' },
        ]} showDatePicker={false} showCompany={false} />
        <main className='p-6 space-y-6'>
          <Button variant='ghost' size='icon' onClick={() => navigate(-1)}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <Comply360ConfigPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
