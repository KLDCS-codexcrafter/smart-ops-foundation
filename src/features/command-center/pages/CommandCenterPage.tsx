import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommandCenterSidebar } from '../components/CommandCenterSidebar';
import { CommandCenterHeader } from '../components/CommandCenterHeader';
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
import { Comply360ConfigPanel } from '@/pages/erp/accounting/Comply360Config';
import { FinFramePanel } from '@/pages/erp/accounting/FinFrame';
import { LedgerMasterPanel } from '@/pages/erp/accounting/LedgerMaster';
import { IncomeTaxMasterPanel } from '@/pages/erp/accounting/IncomeTaxMaster';
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

export type CommandCenterModule =
  | 'overview'
  | 'foundation'
  | 'geography'
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
  | 'finecore-comply360'
  | 'finecore-finframe'
  | 'finecore-ledgers'
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
  | 'inventory-rfid';
export default function CommandCenterPage() {
  const [activeModule, setActiveModule] = useState<CommandCenterModule>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'core' || hash === 'foundation') return 'foundation';
    if (['geography', 'console', 'finecore-hub',
      'finecore-tax-rates', 'finecore-tds', 'finecore-tcs', 'finecore-hsn-sac',
      'finecore-professional-tax', 'finecore-epf-esi-lwf', 'finecore-income-tax',
      'finecore-statutory-reg', 'finecore-gst-config', 'finecore-comply360',
      'finecore-finframe', 'finecore-ledgers',
      'inventory-parametric', 'inventory-batch', 'inventory-serial',
      'inventory-stock-matrix', 'inventory-classify', 'inventory-brands',
      'inventory-storage', 'inventory-uom',
      'inventory-item-craft', 'inventory-code-matrix', 'inventory-item-templates',
      'inventory-label-templates', 'inventory-barcode-gen', 'inventory-asset-tags',
      'inventory-bin-labels', 'inventory-print-queue', 'inventory-rfid'].includes(hash)) {
      return hash as CommandCenterModule;
    }
    return 'overview';
  });

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
      case 'geography': return <FoundationModule />;
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
      case 'finecore-comply360': return <Comply360ConfigPanel />;
      case 'finecore-finframe': return <FinFramePanel />;
      case 'finecore-ledgers': return <LedgerMasterPanel />;
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
      default: return <OverviewModule onNavigate={handleNavigate} />;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-svh w-full bg-background">
        <CommandCenterSidebar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <CommandCenterHeader
            activeModule={activeModule}
            onModuleChange={setActiveModule}
          />
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-7xl mx-auto">
              {renderModule()}
            </div>
          </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
