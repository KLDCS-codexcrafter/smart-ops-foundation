/**
 * @file        src/pages/erp/eximx/EximXImportLayout.tsx
 * @purpose     Layout for EximX-Import sub-module · sidebar + nested routes for Import PO + Shipments
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 */
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shell } from '@/shell';
import type { ShellConfig } from '@/shell/types';
import { eximxImportSidebarItems } from '@/apps/erp/configs/eximx-import-sidebar-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { IECMaster } from './masters/IECMaster';
import { CustomsTariffHeadMaster } from './masters/CustomsTariffHeadMaster';
import { FTAPreferenceTable } from './masters/FTAPreferenceTable';
import { PortExtensionEditor } from './masters/PortExtensionEditor';
import { ForeignVendorMaster } from './masters/ForeignVendorMaster';
import { ImportPOList } from './import/ImportPOList';
import { ImportPOEntry } from './import/ImportPOEntry';
import { ImportPODetail } from './import/ImportPODetail';
import { MultiLegGITList } from './import/MultiLegGITList';
import { MultiLegGITDetail } from './import/MultiLegGITDetail';
import { LandedCostReconciliationDashboard } from './import/LandedCostReconciliationDashboard';
import { CustomsRevaluationAuditView } from './import/CustomsRevaluationAuditView';
import { CIList } from './import/CIList';
import { CIDetail } from './import/CIDetail';
import { LandedCostReplayView } from './import/LandedCostReplayView';
import { BoEList } from './import/BoEList';
import { BoEDetail } from './import/BoEDetail';
import { RMSDeclarationDashboard } from './import/RMSDeclarationDashboard';
import { AEOTierMaster } from './masters/AEOTierMaster';
import { seedSinhaEximX } from '@/data/sinha-eximx-seed';
import type { EximXImportModule } from './EximX.types';

const config: ShellConfig & { title: string } = {
  title: 'EximX · Import',
  product: { id: 'erp', name: 'Operix ERP — EximX Import', code: 'EXI', version: '1.0.0' },
  theme: { accent: 'amber', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true, showNotifications: true, showAppSwitcher: true, showProfileMenu: true,
  },
  sidebar: { items: eximxImportSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/eximx/import', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};

function ComingSoon({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">{label}</p>
      <p className="text-sm mt-2">Coming in subsequent EX sprints</p>
    </div>
  );
}

function parseOrdersSubpath(pathname: string): { mode: 'new' } | { mode: 'detail'; id: string } | null {
  const m = pathname.match(/\/erp\/eximx\/import\/orders\/([^/]+)\/?$/);
  if (!m) return null;
  if (m[1] === 'new') return { mode: 'new' };
  return { mode: 'detail', id: m[1] };
}

function parseShipmentsSubpath(pathname: string): { id: string } | null {
  const m = pathname.match(/\/erp\/eximx\/import\/shipments\/([^/]+)\/?$/);
  if (!m) return null;
  return { id: m[1] };
}

function parseCISubpath(pathname: string): { id: string } | null {
  const m = pathname.match(/\/erp\/eximx\/import\/commercial-invoices\/([^/]+)\/?$/);
  if (!m) return null;
  return { id: m[1] };
}

export default function EximXImportLayout(): JSX.Element {
  const [active, setActive] = useState<EximXImportModule>('import-welcome');
  const { entitlements, profile } = useCardEntitlement();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { seedSinhaEximX(); }, []);

  const orderSub = parseOrdersSubpath(location.pathname);
  const shipmentSub = parseShipmentsSubpath(location.pathname);
  const ciSub = parseCISubpath(location.pathname);

  function renderContent(): JSX.Element {
    if (orderSub) {
      if (orderSub.mode === 'new') return <ImportPOEntry />;
      return <ImportPODetail />;
    }
    if (shipmentSub) {
      return <MultiLegGITDetail />;
    }
    if (ciSub) {
      return <CIDetail />;
    }
    switch (active) {
      case 'iec-master': return <IECMaster />;
      case 'cth-master': return <CustomsTariffHeadMaster />;
      case 'fta-preference': return <FTAPreferenceTable />;
      case 'port-extension': return <PortExtensionEditor />;
      case 'import-orders': return <ImportPOList />;
      case 'foreign-vendors': return <ForeignVendorMaster />;
      case 'import-shipments': return <MultiLegGITList />;
      case 'commercial-invoice': return <CIList />;
      case 'landed-cost-replay': return <LandedCostReplayView />;
      case 'landed-cost': return <LandedCostReconciliationDashboard />;
      case 'customs-revaluation': return <CustomsRevaluationAuditView />;
      case 'import-welcome': return <ComingSoon label="Import Welcome (EX-6)" />;
      default: return <ComingSoon label={active} />;
    }
  }

  return (
    <Shell
      config={config}
      userProfile={profile}
      tenantEntitlements={entitlements}
      onSidebarItemClick={(item) => {
        if (item.moduleId) {
          setActive(item.moduleId as EximXImportModule);
          if (orderSub || shipmentSub || ciSub) navigate('/erp/eximx/import', { replace: true });
        }
      }}
    >
      <div className="p-4 md:p-6 animate-fade-in">
        {renderContent()}
      </div>
    </Shell>
  );
}
