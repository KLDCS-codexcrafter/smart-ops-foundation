/**
 * @file        src/pages/erp/webstorex/WebStoreXPage.tsx
 * @purpose     WebStoreX entry shell · canonical Shell consumer · 6 modules.
 * @sprint      Sprint 149 · T-WebStoreX-A11.1 · Pillar A.11 · Block 4
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
import type { WebStoreXModule } from './WebStoreXSidebar.types';

export default function WebStoreXPage(): JSX.Element {
  const [active, setActive] = useState<WebStoreXModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':    return <WebStoreXWelcome onNavigate={setActive} />;
      case 'catalog':    return <CatalogPage />;
      case 'variants':   return <VariantsPage />;
      case 'brands':     return <BrandsPage />;
      case 'categories': return <CategoriesPage />;
      case 'settings':   return <SettingsPage />;
      default:           return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
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
