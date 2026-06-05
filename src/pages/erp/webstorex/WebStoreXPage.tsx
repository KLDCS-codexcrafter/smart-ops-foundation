/**
 * @file        src/pages/erp/webstorex/WebStoreXPage.tsx
 * @purpose     WebStoreX entry shell · S149 PIM + S150 Commerce Engines.
 * @sprint      Sprint 149 · T-WebStoreX-A11.1 · Sprint 150 · T-WebStoreX-A11.2 · Block 4
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { webstorexShellConfig } from '@/apps/erp/configs/webstorex-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { WebStoreXWelcome } from './WebStoreXWelcome';
import { CatalogPage } from './catalog/CatalogPage';
import { VariantsPage } from './variants/VariantsPage';
import { BrandsPage } from './brands/BrandsPage';
import { CategoriesPage } from './categories/CategoriesPage';
import { SettingsPage } from './settings/SettingsPage';
import { PriceListsPage } from './commerce/PriceListsPage';
import { SchemesPage } from './commerce/SchemesPage';
import { LoyaltyPage } from './commerce/LoyaltyPage';
import { GiftVouchersPage } from './commerce/GiftVouchersPage';
import { CampaignsPage } from './commerce/CampaignsPage';
import { TestimonialsPage } from './commerce/TestimonialsPage';
import type { WebStoreXModule } from './WebStoreXSidebar.types';

function ComingSoon({ label }: { label: string }): JSX.Element {
  return (
    <div className="p-10 animate-fade-in">
      <div className="glass-card rounded-2xl p-8 max-w-xl">
        <h2 className="text-lg font-semibold mb-2">{label}</h2>
        <p className="text-sm text-muted-foreground">
          This surface lands in an upcoming sprint. Tracked in DP-WS-20 register.
        </p>
      </div>
    </div>
  );
}

export default function WebStoreXPage(): JSX.Element {
  const [active, setActive] = useState<WebStoreXModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':      return <WebStoreXWelcome onNavigate={setActive} />;
      case 'catalog':      return <CatalogPage />;
      case 'variants':     return <VariantsPage />;
      case 'brands':       return <BrandsPage />;
      case 'categories':   return <CategoriesPage />;
      case 'settings':     return <SettingsPage />;
      case 'price-lists':  return <PriceListsPage />;
      case 'schemes':      return <SchemesPage />;
      case 'loyalty':      return <LoyaltyPage />;
      case 'vouchers':     return <GiftVouchersPage />;
      case 'campaigns':    return <CampaignsPage />;
      case 'testimonials': return <TestimonialsPage />;
      case 'storefront-coming-soon': return <ComingSoon label="Storefront — S151" />;
      case 'visualizer-coming-soon': return <ComingSoon label="Visualizer — S152" />;
      default:             return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <Shell
      config={webstorexShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActive(item.moduleId as WebStoreXModule);
      }}
    >
      {render()}
    </Shell>
  );
}
