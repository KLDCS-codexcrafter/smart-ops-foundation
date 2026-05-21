/**
 * @file        src/pages/erp/eximx/EximXExportLayout.tsx
 * @purpose     Layout for EximX-Export sub-module · 7-group sidebar · EX-7a wires Export PO + Foreign Customer + Buyer Reliability
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shell } from '@/shell';
import type { ShellConfig } from '@/shell/types';
import { eximxExportSidebarItems } from '@/apps/erp/configs/eximx-export-sidebar-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { LUTMaster } from './masters/LUTMaster';
import { ExportPOList } from './export/ExportPOList';
import { ExportPOEntry } from './export/ExportPOEntry';
import { ExportPODetail } from './export/ExportPODetail';
import { ForeignCustomerMaster } from './masters/ForeignCustomerMaster';
import { BuyerReliabilityDashboard } from './export/BuyerReliabilityDashboard';
import { ShippingBillList } from './export/ShippingBillList';
import { ShippingBillEntry } from './export/ShippingBillEntry';
import { ShippingBillDetail } from './export/ShippingBillDetail';
import { ExportDispatchList } from './export/ExportDispatchList';
import { CoOLegalizationDashboard } from './export/CoOLegalizationDashboard';
import { ExportRealisationList } from './export/ExportRealisationList';
import { ExportRealisationDetail } from './export/ExportRealisationDetail';
import { EBRCEDPMSDashboard } from './export/EBRCEDPMSDashboard';
import { FEMA270DayTracker } from './export/FEMA270DayTracker';
import { UnifiedDGFTLayout } from './dgft/UnifiedDGFTLayout';
import { seedSinhaEximX } from '@/data/sinha-eximx-seed';
import type { EximXExportModule } from './EximX.types';

const config: ShellConfig & { title: string } = {
  title: 'EximX · Export',
  product: { id: 'erp', name: 'Operix ERP — EximX Export', code: 'EXE', version: '1.0.0' },
  theme: { accent: 'emerald', mode: 'auto' },
  header: {
    logo: { src: '/operix-logo.svg', alt: 'Operix' },
    breadcrumb: true,
    chips: [{ type: 'entity-selector' }, { type: 'branch-selector' }, { type: 'financial-year' }],
    showSearch: true, showNotifications: true, showAppSwitcher: true, showProfileMenu: true,
  },
  sidebar: { items: eximxExportSidebarItems, collapsible: true, defaultCollapsed: false, width: 280, grouping: 'sections' },
  routing: { landingRoute: '/erp/eximx/export', notFoundRoute: '/erp/404', permissionDeniedRoute: '/erp/403' },
  behaviour: { keyboardShortcuts: true, commandPalette: true, recentActivityDrawer: true, guidedTour: true, languages: ['en-IN'] },
};

function ComingSoon({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">{label}</p>
      <p className="text-sm mt-2">Coming in subsequent EX-7b through EX-12 sprints</p>
    </div>
  );
}

function parseExportPOSubpath(pathname: string): { mode: 'new' } | { mode: 'detail'; id: string } | null {
  const m = pathname.match(/\/erp\/eximx\/export\/orders\/([^/]+)\/?$/);
  if (!m) return null;
  if (m[1] === 'new') return { mode: 'new' };
  return { mode: 'detail', id: m[1] };
}

function parseSBSubpath(pathname: string): { mode: 'new' } | { mode: 'detail'; id: string } | null {
  if (/\/erp\/eximx\/export\/shipping-bills\/new\/?$/.test(pathname)) return { mode: 'new' };
  const m = pathname.match(/\/erp\/eximx\/export\/shipping-bills\/([^/]+)\/?$/);
  if (!m || m[1] === 'new') return null;
  return { mode: 'detail', id: m[1] };
}

function parseRealisationSubpath(pathname: string): { id: string } | null {
  const m = pathname.match(/\/erp\/eximx\/export\/realisation\/([^/]+)\/?$/);
  if (!m) return null;
  return { id: m[1] };
}

export default function EximXExportLayout(): JSX.Element {
  const [active, setActive] = useState<EximXExportModule>('export-welcome');
  const { entitlements, profile } = useCardEntitlement();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { seedSinhaEximX(); }, []);

  const expoSub = parseExportPOSubpath(location.pathname);
  const sbSub = parseSBSubpath(location.pathname);
  const realSub = parseRealisationSubpath(location.pathname);

  function renderContent(): JSX.Element {
    if (realSub) return <ExportRealisationDetail />;
    if (sbSub) {
      if (sbSub.mode === 'new') return <ShippingBillEntry />;
      return <ShippingBillDetail />;
    }
    if (expoSub) {
      if (expoSub.mode === 'new') return <ExportPOEntry />;
      return <ExportPODetail />;
    }
    switch (active) {
      case 'lut-master': return <LUTMaster />;
      case 'export-orders': return <ExportPOList />;
      case 'foreign-customers': return <ForeignCustomerMaster />;
      case 'buyer-reliability': return <BuyerReliabilityDashboard />;
      case 'shipping-bills': return <ShippingBillList />;
      case 'export-shipments': return <ExportDispatchList />;
      case 'e-brc': return <><ExportRealisationList /><EBRCEDPMSDashboard /></>;
      case 'firc': return <EBRCEDPMSDashboard />;
      case 'fema-tracker': return <FEMA270DayTracker />;
      case 'rodtep': return <UnifiedDGFTLayout />;
      case 'drawback': return <UnifiedDGFTLayout />;
      case 'export-council': return <UnifiedDGFTLayout />;
      case 'export-welcome': return <><ShippingBillList /><CoOLegalizationDashboard /></>;
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
          setActive(item.moduleId as EximXExportModule);
          if (expoSub) navigate('/erp/eximx/export', { replace: true });
        }
      }}
    >
      <div className="p-4 md:p-6 animate-fade-in">
        {renderContent()}
      </div>
    </Shell>
  );
}
