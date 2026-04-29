import { useState, useEffect } from 'react';
import { Shell } from '@/shell';
import { commandCenterShellConfig } from '@/apps/erp/configs/command-center-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { GuidedTourOverlay } from '@/components/layout/GuidedTourOverlay';
import { journalKey } from '@/lib/finecore-engine';
import type { BreadcrumbEntry } from '@/components/layout/ERPHeader';
import { FoundationModule } from '../modules/FoundationModule';
import { SecurityModule } from '../modules/SecurityModule';
import { OverviewModule } from '../modules/OverviewModule';
import { FineCoreMastersModule } from '../modules/FineCoreMastersModule';
import { TaxRateMasterPanel } from '@/pages/erp/accounting/TaxRateMaster';
import { TDSSectionMasterPanel } from '@/pages/erp/accounting/TDSSectionMaster';
import { TCSSectionMasterPanel } from '@/pages/erp/accounting/TCSSectionMaster';
import { HSNSACMasterPanel } from '@/pages/erp/accounting/HSNSACMaster';
import { ProfessionalTaxMasterPanel } from '@/pages/erp/accounting/ProfessionalTaxMaster';
import { EPFESILWFMasterPanel } from '@/pages/erp/accounting/EPFESILWFMaster';
import { StatutoryRegistrationsPanel } from '@/pages/erp/accounting/StatutoryRegistrations';
import { GSTEntityConfigPanel } from '@/pages/erp/accounting/GSTEntityConfig';
import { ComplianceSettingsAutomationPanel } from '@/pages/erp/accounting/ComplianceSettingsAutomation';
import { FinFramePanel } from '@/pages/erp/accounting/FinFrame';
import { LedgerMasterPanel } from '@/pages/erp/accounting/LedgerMaster';
import { VoucherTypesMasterPanel } from '@/pages/erp/accounting/VoucherTypesMaster';
import { CurrencyMasterPanel } from '@/pages/erp/accounting/CurrencyMaster';
import { IncomeTaxMasterPanel } from '@/pages/erp/accounting/IncomeTaxMaster';
import { TransactionTemplatesPanel } from '@/pages/erp/accounting/TransactionTemplates';
// T-H1.5-C-S3 — FY Calendar Master (CC-015)
import { FiscalYearMasterPanel } from '@/pages/erp/accounting/FiscalYearMaster';
// T-H1.5-C-S1 — Supporting masters wired to CC (CC-017/018/019/020)
import { ModeOfPaymentMasterPanel } from '@/pages/erp/masters/supporting/ModeOfPaymentMaster';
import { TermsOfPaymentMasterPanel } from '@/pages/erp/masters/supporting/TermsOfPaymentMaster';
import { TermsOfDeliveryMasterPanel } from '@/pages/erp/masters/supporting/TermsOfDeliveryMaster';
import { BusinessUnitMasterPanel } from '@/pages/erp/masters/BusinessUnitMaster';
import { AssetCentreMasterPanel } from '@/pages/erp/finecore/masters/AssetCentreMaster';
import { ProjectCentreMasterPanel } from '@/pages/erp/projx/masters/ProjectCentreMaster';
import { ParametricPanel } from '@/pages/erp/inventory/Parametric';
import { BatchGridPanel } from '@/pages/erp/inventory/BatchGrid';
import { SerialGridPanel } from '@/pages/erp/inventory/SerialGrid';
import { StockMatrixPanel } from '@/pages/erp/inventory/StockMatrix';
import { ClassifyPanel } from '@/pages/erp/inventory/Classify';
import { BrandMatrixPanel } from '@/pages/erp/inventory/BrandMatrix';
import { StorageMatrixPanel } from '@/pages/erp/inventory/StorageMatrix';
import { MeasureXPanel } from '@/pages/erp/inventory/MeasureX';
import { ItemCraftPanel } from '@/pages/erp/inventory/ItemCraft';
import { CodeMatrixPanel } from '@/pages/erp/inventory/CodeMatrix';
import { ItemTemplatesPanel } from '@/pages/erp/inventory/ItemTemplates';
import { LabelTemplatesPanel } from '@/pages/erp/inventory/LabelTemplates';
import { BarcodeGeneratorPanel } from '@/pages/erp/inventory/BarcodeGenerator';
import { AssetTagManagerPanel } from '@/pages/erp/inventory/AssetTagManager';
import { BinLocationLabelsPanel } from '@/pages/erp/inventory/BinLocationLabels';
import { PrintQueuePanel } from '@/pages/erp/inventory/PrintQueue';
import { RFIDManagerPanel } from '@/pages/erp/inventory/RFIDManager';
import { OpeningStockPanel } from '@/pages/erp/inventory/OpeningStockEntry';
import { ItemRatesPanel } from '@/pages/erp/inventory/ItemRatesMRP';
import { PriceListsPanel } from '@/pages/erp/inventory/PriceListManager';
import { ReorderAlertsPanel } from '@/pages/erp/inventory/ReorderAlerts';
import { GeographyHubPanel } from '@/pages/erp/foundation/geography/GeographyHub';
import { OrgStructurePanel } from '@/pages/erp/foundation/OrgStructureHub';
import { OpeningLedgerBalanceModule } from '../modules/OpeningLedgerBalanceModule';
import { EmployeeOpeningLoansModule } from '../modules/EmployeeOpeningLoansModule';
import { ImportHubModule } from '../modules/ImportHubModule';
import { PayHeadMasterPanel }        from '@/pages/erp/pay-hub/masters/PayHeadMaster';
import { SalaryStructureMasterPanel } from '@/pages/erp/pay-hub/masters/SalaryStructureMaster';
import { PayGradeMasterPanel }        from '@/pages/erp/pay-hub/masters/PayGradeMaster';
import { ShiftMasterPanel }           from '@/pages/erp/pay-hub/masters/ShiftMaster';
import { LeaveTypesMasterPanel }      from '@/pages/erp/pay-hub/masters/LeaveTypesMaster';
import { HolidayCalendarMasterPanel } from '@/pages/erp/pay-hub/masters/HolidayCalendarMaster';
import { AttendanceTypesMasterPanel } from '@/pages/erp/pay-hub/masters/AttendanceTypesMaster';
import { OvertimeRulesMasterPanel }   from '@/pages/erp/pay-hub/masters/OvertimeRulesMaster';
import { LoanTypesMasterPanel }       from '@/pages/erp/pay-hub/masters/LoanTypesMaster';
import { BonusConfigMasterPanel }     from '@/pages/erp/pay-hub/masters/BonusConfigMaster';
import { GratuityNPSPanel }           from '@/pages/erp/pay-hub/masters/GratuityNPSConfig';
import { AssetMasterPanel }           from '@/pages/erp/pay-hub/masters/AssetMaster';

// Stage 1 — CRM, Sales, Collection, Distributor hub modules
import { CRMMastersModule }         from '../modules/CRMMastersModule';
import { SalesMastersModule }       from '../modules/SalesMastersModule';
import { CollectionMastersModule }  from '../modules/CollectionMastersModule';
import { DistributorMastersModule } from '../modules/DistributorMastersModule';

// Stage 1 — Master Panel imports (CRM)
import { CustomerMasterPanel } from '@/pages/erp/masters/CustomerMaster';
import { CustomerSegmentMasterPanel } from '@/pages/erp/masters/CustomerSegmentMaster';
import { VendorMasterPanel }   from '@/pages/erp/masters/VendorMaster';

// Stage 1 — SalesX masters
import { HierarchyMasterPanel }     from '@/pages/erp/salesx/masters/HierarchyMaster';
import { SAMPersonMasterPanel }     from '@/pages/erp/salesx/masters/SAMPersonMaster';
import { EnquirySourceMasterPanel } from '@/pages/erp/salesx/masters/EnquirySourceMaster';
import { CampaignMasterPanel }      from '@/pages/erp/salesx/masters/CampaignMaster';
import { TerritoryMasterPanel }     from '@/pages/erp/salesx/masters/TerritoryMaster';
import { BeatRouteMasterPanel }     from '@/pages/erp/salesx/masters/BeatRouteMaster';
import { TargetMasterPanel }        from '@/pages/erp/salesx/masters/TargetMaster';

// Stage 1 — ReceivX masters
import { CollectionExecMasterPanel }   from '@/pages/erp/receivx/masters/CollectionExecMaster';
import { IncentiveSchemeMasterPanel }  from '@/pages/erp/receivx/masters/IncentiveSchemeMaster';
import { ReminderTemplateMasterPanel } from '@/pages/erp/receivx/masters/ReminderTemplateMaster';
import { ReceivXConfigPanel }          from '@/pages/erp/receivx/masters/ReceivXConfig';

// Stage 1 — Distributor masters
import { DistributorHierarchyMasterPanel } from '@/pages/erp/distributor/DistributorHierarchyMaster';
import { PriceListManagerPanel }           from '@/pages/erp/inventory/PriceListManager';

// Stage 1 — People Core (Employee Master registration)
import { EmployeeMasterPanel } from '@/pages/erp/pay-hub/masters/EmployeeMaster';

// Sprint 12 — Scheme Master
import { SchemeMasterPanel } from '@/pages/erp/masters/SchemeMaster';

import { Card, CardContent } from '@/components/ui/card';
import { getPrimaryEntity } from '@/data/mock-entities';

export type CommandCenterModule =
  | 'overview'
  | 'foundation'
  | 'geography'
  | 'org-structure'
  | 'finecore-hub'
  | 'finecore-tax-rates'
  | 'finecore-tds'
  | 'finecore-tcs'
  | 'finecore-hsn-sac'
  | 'finecore-professional-tax'
  | 'finecore-epf-esi-lwf'
  | 'finecore-income-tax'
  | 'finecore-statutory-reg'
  | 'finecore-gst-config'
  | 'finecore-compliance-settings'
  | 'finecore-finframe'
  | 'finecore-ledgers'
  | 'finecore-voucher-types'
  | 'finecore-currency'
  | 'finecore-transaction-templates'
  | 'finecore-mode-of-payment'
  | 'finecore-terms-of-payment'
  | 'finecore-terms-of-delivery'
  | 'finecore-fiscal-year'
  | 'finecore-business-unit'
  | 'finecore-asset-centres'
  | 'projx-project-centres'
  | 'console'
  | 'inventory-parametric'
  | 'inventory-batch'
  | 'inventory-serial'
  | 'inventory-stock-matrix'
  | 'inventory-classify'
  | 'inventory-brands'
  | 'inventory-storage'
  | 'inventory-uom'
  | 'inventory-item-craft'
  | 'inventory-code-matrix'
  | 'inventory-item-templates'
  | 'inventory-label-templates'
  | 'inventory-barcode-gen'
  | 'inventory-asset-tags'
  | 'inventory-bin-labels'
  | 'inventory-print-queue'
  | 'inventory-rfid'
  | 'inventory-opening-stock'
  | 'inventory-item-rates'
  | 'inventory-price-lists'
  | 'inventory-reorder'
  | 'opening-ledger-balances'
  | 'opening-employee-loans'
  | 'utility-import'
  | 'ph-pay-heads'
  | 'ph-salary-structures'
  | 'ph-pay-grades'
  | 'ph-shifts'
  | 'ph-leave-types'
  | 'ph-holiday-calendar'
  | 'ph-attendance-types'
  | 'ph-overtime-rules'
  | 'ph-loan-types'
  | 'ph-bonus-config'
  | 'ph-gratuity-nps'
  | 'ph-asset-master'
  // Stage 1 — CRM Masters
  | 'crm-hub'
  | 'crm-customer'
  | 'crm-vendor'
  // Stage 1 — Sales Masters
  | 'sales-hub'
  | 'sales-hierarchy'
  | 'sales-sam-person'
  | 'sales-enquiry-source'
  | 'sales-campaign'
  | 'sales-territory'
  | 'sales-beat-route'
  | 'sales-target'
  // Stage 1 — Collection Masters
  | 'collection-hub'
  | 'collection-exec'
  | 'collection-incentive'
  | 'collection-reminder'
  | 'collection-config'
  // Stage 1 — Distributor Masters
  // NOTE: 'distributor-hub' here is a CC-INTERNAL module ID and is NOT the
  // /erp/distributor-hub URL route. Separate namespaces — no collision.
  | 'distributor-hub'
  | 'distributor-hierarchy'
  | 'distributor-price-list'
  | 'distributor-credit-refs'
  | 'distributor-dispute-refs'
  // Stage 1 — People Core (missing registration)
  | 'ph-employee'
  // Sprint 12 — Schemes
  | 'sales-schemes'
  // Sprint 13a — CRM Customer Segments
  | 'crm-customer-segments';
export function CommandCenterPagePanel() {
  return <CommandCenterPage />;
}

export default function CommandCenterPage() {
  const [activeModule, setActiveModule] = useState<CommandCenterModule>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'core' || hash === 'foundation') return 'foundation';
    if (['geography', 'console', 'finecore-hub',
      'finecore-tax-rates', 'finecore-tds', 'finecore-tcs', 'finecore-hsn-sac',
      'finecore-professional-tax', 'finecore-epf-esi-lwf', 'finecore-income-tax',
      'finecore-statutory-reg', 'finecore-gst-config', 'finecore-compliance-settings',
      'org-structure',
      'finecore-finframe', 'finecore-ledgers', 'finecore-voucher-types', 'finecore-currency', 'finecore-transaction-templates',
      'finecore-mode-of-payment', 'finecore-terms-of-payment', 'finecore-terms-of-delivery', 'finecore-fiscal-year', 'finecore-business-unit', 'finecore-asset-centres', 'projx-project-centres',
      'inventory-parametric', 'inventory-batch', 'inventory-serial',
      'inventory-stock-matrix', 'inventory-classify', 'inventory-brands',
      'inventory-storage', 'inventory-uom',
      'inventory-item-craft', 'inventory-code-matrix', 'inventory-item-templates',
      'inventory-label-templates', 'inventory-barcode-gen', 'inventory-asset-tags',
      'inventory-bin-labels', 'inventory-print-queue', 'inventory-rfid',
      'inventory-opening-stock', 'inventory-item-rates', 'inventory-price-lists', 'inventory-reorder',
      'opening-ledger-balances', 'opening-employee-loans', 'utility-import',
      'ph-pay-heads', 'ph-salary-structures', 'ph-pay-grades', 'ph-shifts',
      'ph-leave-types', 'ph-holiday-calendar', 'ph-attendance-types', 'ph-overtime-rules',
      'ph-loan-types', 'ph-bonus-config', 'ph-gratuity-nps', 'ph-asset-master', 'ph-employee',
      // Stage 1
      'crm-hub', 'crm-customer', 'crm-vendor', 'crm-customer-segments',
      'sales-hub', 'sales-hierarchy', 'sales-sam-person', 'sales-enquiry-source',
      'sales-campaign', 'sales-territory', 'sales-beat-route', 'sales-target',
      'sales-schemes',
      'collection-hub', 'collection-exec', 'collection-incentive', 'collection-reminder', 'collection-config',
      'distributor-hub', 'distributor-hierarchy', 'distributor-price-list',
      'distributor-credit-refs', 'distributor-dispute-refs',
    ].includes(hash)) {
      return hash as CommandCenterModule;
    }
    return 'overview';
  });

  const { entityCode, userId, profile, entitlements } = useCardEntitlement();

  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'command-center',
      action: 'card_open',
    });
  }, [entityCode, userId]);

  useEffect(() => {
    rememberModule('command-center', activeModule);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'command-center',
      moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entityCode, userId, {
      card_id: 'command-center',
      kind: 'module',
      ref_id: activeModule,
      title: `Command Center · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/command-center#${activeModule}`,
    });
  }, [activeModule, entityCode, userId]);

  useEffect(() => {
    const hash = activeModule === 'overview' ? '' : `#${activeModule}`;
    window.history.replaceState(null, '', window.location.pathname + hash);
  }, [activeModule]);

  function handleNavigate(module: CommandCenterModule) {
    setActiveModule(module);
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'overview': return <OverviewModule onNavigate={handleNavigate} />;
      case 'foundation': return <FoundationModule />;
      case 'geography': return <GeographyHubPanel />;
      case 'org-structure': return <OrgStructurePanel />;
      case 'finecore-hub': return <FineCoreMastersModule onNavigate={handleNavigate} />;
      case 'finecore-tax-rates': return <TaxRateMasterPanel />;
      case 'finecore-tds': return <TDSSectionMasterPanel />;
      case 'finecore-tcs': return <TCSSectionMasterPanel />;
      case 'finecore-hsn-sac': return <HSNSACMasterPanel />;
      case 'finecore-professional-tax': return <ProfessionalTaxMasterPanel />;
      case 'finecore-epf-esi-lwf': return <EPFESILWFMasterPanel />;
      case 'finecore-income-tax': return <IncomeTaxMasterPanel />;
      case 'finecore-statutory-reg': return <StatutoryRegistrationsPanel />;
      case 'finecore-gst-config': return <GSTEntityConfigPanel />;
      case 'finecore-compliance-settings': return <ComplianceSettingsAutomationPanel />;
      case 'finecore-finframe': return <FinFramePanel />;
      case 'finecore-ledgers': return <LedgerMasterPanel />;
      case 'finecore-voucher-types': return <VoucherTypesMasterPanel />;
      case 'finecore-currency': return <CurrencyMasterPanel />;
      case 'finecore-transaction-templates': return <TransactionTemplatesPanel />;
      // T-H1.5-C-S1 — Supporting masters (CC-017/018/019/020)
      case 'finecore-mode-of-payment': return <ModeOfPaymentMasterPanel />;
      case 'finecore-terms-of-payment': return <TermsOfPaymentMasterPanel />;
      case 'finecore-terms-of-delivery': return <TermsOfDeliveryMasterPanel />;
      case 'finecore-fiscal-year': return <FiscalYearMasterPanel />;
      case 'finecore-business-unit': return <BusinessUnitMasterPanel />;
      case 'finecore-asset-centres': return <AssetCentreMasterPanel />;
      case 'projx-project-centres': return <ProjectCentreMasterPanel />;
      case 'console': return <SecurityModule />;
      case 'inventory-parametric': return <ParametricPanel />;
      case 'inventory-batch':     return <BatchGridPanel />;
      case 'inventory-serial':    return <SerialGridPanel />;
      case 'inventory-stock-matrix': return <StockMatrixPanel />;
      case 'inventory-classify': return <ClassifyPanel />;
      case 'inventory-brands': return <BrandMatrixPanel />;
      case 'inventory-storage': return <StorageMatrixPanel />;
      case 'inventory-uom': return <MeasureXPanel />;
      case 'inventory-item-craft': return <ItemCraftPanel />;
      case 'inventory-code-matrix': return <CodeMatrixPanel />;
      case 'inventory-item-templates': return <ItemTemplatesPanel />;
      case 'inventory-label-templates': return <LabelTemplatesPanel />;
      case 'inventory-barcode-gen': return <BarcodeGeneratorPanel />;
      case 'inventory-asset-tags': return <AssetTagManagerPanel />;
      case 'inventory-bin-labels': return <BinLocationLabelsPanel />;
      case 'inventory-print-queue': return <PrintQueuePanel />;
      case 'inventory-rfid': return <RFIDManagerPanel />;
      case 'inventory-opening-stock': return <OpeningStockPanel />;
      case 'inventory-item-rates': return <ItemRatesPanel />;
      case 'inventory-price-lists': return <PriceListsPanel />;
      case 'inventory-reorder': return <ReorderAlertsPanel />;
      case 'opening-ledger-balances': return <OpeningLedgerBalanceModule />;
      case 'opening-employee-loans': return <EmployeeOpeningLoansModule />;
      case 'utility-import': return <ImportHubModule />;
      case 'ph-pay-heads': return <PayHeadMasterPanel />;
      case 'ph-salary-structures': return <SalaryStructureMasterPanel />;
      case 'ph-pay-grades': return <PayGradeMasterPanel />;
      case 'ph-shifts': return <ShiftMasterPanel />;
      case 'ph-leave-types': return <LeaveTypesMasterPanel />;
      case 'ph-holiday-calendar': return <HolidayCalendarMasterPanel />;
      case 'ph-attendance-types': return <AttendanceTypesMasterPanel />;
      case 'ph-overtime-rules': return <OvertimeRulesMasterPanel />;
      case 'ph-loan-types': return <LoanTypesMasterPanel />;
      case 'ph-bonus-config': return <BonusConfigMasterPanel />;
      case 'ph-gratuity-nps': return <GratuityNPSPanel />;
      case 'ph-asset-master': return <AssetMasterPanel />;

      // Stage 1 — CRM
      case 'crm-hub':       return <CRMMastersModule onNavigate={handleNavigate} />;
      case 'crm-customer':  return <CustomerMasterPanel />;
      case 'crm-customer-segments': return <CustomerSegmentMasterPanel />;
      case 'crm-vendor':    return <VendorMasterPanel />;

      // Stage 1 — Sales
      case 'sales-hub':            return <SalesMastersModule onNavigate={handleNavigate} />;
      case 'sales-hierarchy':      return <HierarchyMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'sales-sam-person':     return <SAMPersonMasterPanel personType="salesman" entityCode={getPrimaryEntity().shortCode} />;
      case 'sales-enquiry-source': return <EnquirySourceMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'sales-campaign':       return <CampaignMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'sales-territory':      return <TerritoryMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'sales-beat-route':     return <BeatRouteMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'sales-target':         return <TargetMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'sales-schemes':        return <SchemeMasterPanel />;

      // Stage 1 — Collection
      case 'collection-hub':       return <CollectionMastersModule onNavigate={handleNavigate} />;
      case 'collection-exec':      return <CollectionExecMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'collection-incentive': return <IncentiveSchemeMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'collection-reminder':  return <ReminderTemplateMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'collection-config':    return <ReceivXConfigPanel entityCode={getPrimaryEntity().shortCode} />;

      // Stage 1 — Distributor
      case 'distributor-hub':           return <DistributorMastersModule onNavigate={handleNavigate} />;
      case 'distributor-hierarchy':     return <DistributorHierarchyMasterPanel entityCode={getPrimaryEntity().shortCode} />;
      case 'distributor-price-list':    return <PriceListManagerPanel />;
      case 'distributor-credit-refs':   return <CreditRefDocPanel />;
      case 'distributor-dispute-refs':  return <DisputeRefDocPanel />;

      // Stage 1 — People Core
      case 'ph-employee':   return <EmployeeMasterPanel />;

      default: return <OverviewModule onNavigate={handleNavigate} />;
    }
  };

  const lastEntryLabel = computeLastEntryLabel(entityCode);

  return (
    <>
      <GuidedTourOverlay cardId='command-center' />
      <Shell
        config={commandCenterShellConfig}
        userProfile={profile}
        tenantEntitlements={entitlements}
        breadcrumbs={buildBreadcrumbs(activeModule)}
        lastEntryLabel={lastEntryLabel}
        contextFlags={{ accounting_mode: 'standalone' /* TODO wire from tenant config */ }}
        onSidebarItemClick={(item) => {
          if (item.moduleId) setActiveModule(item.moduleId as CommandCenterModule);
        }}
      >
        {renderModule()}
      </Shell>
    </>
  );
}

// ───── Helpers extracted from the legacy CommandCenterHeader ─────

const GROUP_LABELS: Partial<Record<CommandCenterModule, string>> = {
  overview: 'Overview',
  foundation: 'Foundation & Core',
  geography: 'Geography',
  'org-structure': 'Organisation Structure',
  'finecore-hub': 'Finance & Compliance',
  console: 'Security Console',
  'utility-import': 'Utilities',
  'opening-ledger-balances': 'Opening Balances',
  'opening-employee-loans': 'Opening Balances',
};

function getGroupLabel(m: CommandCenterModule): string {
  if (m.startsWith('finecore-')) return 'Finance & Compliance';
  if (m.startsWith('inventory-')) return 'Inventory Masters';
  if (m.startsWith('ph-')) return 'People Core';
  if (m.startsWith('opening-')) return 'Opening Balances';
  if (m.startsWith('utility-')) return 'Utilities';
  if (m.startsWith('crm-')) return 'CRM Masters';
  if (m.startsWith('sales-')) return 'Sales Masters';
  if (m.startsWith('collection-')) return 'Collection Masters';
  if (m.startsWith('distributor-')) return 'Distributor Masters';
  return GROUP_LABELS[m] ?? '';
}

function getModuleLabel(m: CommandCenterModule): string {
  const known: Partial<Record<CommandCenterModule, string>> = {
    overview: 'Overview',
    foundation: 'Entity Management',
    geography: 'Geography',
    'org-structure': 'Business Units',
    console: 'Security Console',
    'finecore-hub': 'Finance & Compliance Hub',
    'finecore-ledgers': 'Ledger Master',
    'finecore-finframe': 'FinFrame',
    'finecore-gst-config': 'GST Config',
    'finecore-compliance-settings': 'Compliance Settings & Automation',
    'finecore-asset-centres': 'Asset Centre Master',
    'ph-pay-heads': 'Pay Heads',
    'ph-salary-structures': 'Salary Structures',
    'opening-ledger-balances': 'Opening Ledger Balances',
    'utility-import': 'Import Hub',
  };
  return known[m] ?? m.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildBreadcrumbs(activeModule: CommandCenterModule): BreadcrumbEntry[] {
  const group = getGroupLabel(activeModule);
  const moduleLabel = getModuleLabel(activeModule);
  const crumbs: BreadcrumbEntry[] = [
    { label: 'Operix Core', href: '/erp/dashboard' },
    { label: 'Command Centre', href: '/erp/command-center' },
  ];
  if (group && group !== moduleLabel) crumbs.push({ label: group });
  if (moduleLabel) crumbs.push({ label: moduleLabel });
  return crumbs;
}

function computeLastEntryLabel(entityCode: string): string | undefined {
  try {
    // [JWT] GET /api/accounting/journal/last-entry?entityCode={entityCode}
    const raw = localStorage.getItem(journalKey(entityCode));
    if (!raw) return undefined;
    const entries: Array<{ created_at: string }> = JSON.parse(raw);
    if (!entries.length) return undefined;
    const latest = entries.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    const d = new Date(latest.created_at);
    return 'Last entry: ' +
      d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
      ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return undefined;
  }
}

// ─── Stage 1 — Reference doc panels (read-only enum documentation) ────────
function CreditRefDocPanel() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Credit Request Reference</h2>
        <p className="text-xs text-muted-foreground">
          Reference documentation for credit-increase request enums. Type values are
          defined in <code className="font-mono">src/types/credit-increase-request.ts</code>.
        </p>
      </div>
      <Card><CardContent className="p-4">
        <p className="font-semibold mb-2 text-sm">Urgency Levels</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li><span className="font-mono text-foreground">normal</span> — routine credit increase</li>
          <li><span className="font-mono text-foreground">festival</span> — temporary festival-season credit</li>
          <li><span className="font-mono text-foreground">emergency</span> — time-bound emergency credit line</li>
        </ul>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <p className="font-semibold mb-2 text-sm">Status Flow</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li><span className="font-mono text-foreground">submitted</span> → <span className="font-mono text-foreground">under_review</span> → <span className="font-mono text-foreground">approved / rejected / cancelled</span></li>
        </ul>
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">
        Credit requests are created from <code className="font-mono">/erp/distributor/credit-request</code>{' '}
        and reviewed at <code className="font-mono">/erp/distributor-hub/credit-approvals</code>.
      </p>
    </div>
  );
}

function DisputeRefDocPanel() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Invoice Dispute Reference</h2>
        <p className="text-xs text-muted-foreground">
          Reference documentation for invoice dispute enums. Type values are defined in{' '}
          <code className="font-mono">src/types/invoice-dispute.ts</code>.
        </p>
      </div>
      <Card><CardContent className="p-4">
        <p className="font-semibold mb-2 text-sm">Dispute Reasons</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li><span className="font-mono text-foreground">short_supply</span> — quantity less than billed</li>
          <li><span className="font-mono text-foreground">damaged</span> — physical damage on receipt</li>
          <li><span className="font-mono text-foreground">wrong_item</span> — SKU mismatch</li>
          <li><span className="font-mono text-foreground">rate_mismatch</span> — billed rate different from agreed</li>
          <li><span className="font-mono text-foreground">quality</span> — quality not per spec</li>
          <li><span className="font-mono text-foreground">other</span> — any other valid reason</li>
        </ul>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <p className="font-semibold mb-2 text-sm">Status Flow</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li><span className="font-mono text-foreground">open</span> → <span className="font-mono text-foreground">under_review</span> → <span className="font-mono text-foreground">resolved / rejected / closed</span></li>
        </ul>
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">
        Disputes are raised from <code className="font-mono">/erp/distributor/invoices</code>{' '}
        and processed at <code className="font-mono">/erp/distributor-hub/disputes</code>.
      </p>
    </div>
  );
}
