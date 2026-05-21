/**
 * @file        src/pages/erp/eximx/EximXPage.tsx
 * @purpose     EximX top-level page · Shell wrapper · routes to Welcome by default
 * @sprint      T-Phase-2.HK-1-EximX-AtlasPreview-Retire
 * @decisions   D-NEW-FM: removed saathi-tdl-gaps-atlas import + handler · TDLGapsAtlasPreview.tsx preserved 0-DIFF per FR-10
 */
import { useState, useEffect } from 'react';
import { Shell } from '@/shell';
import { eximxShellConfig } from '@/apps/erp/configs/eximx-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useNavigate } from 'react-router-dom';
import { EximXWelcome } from './EximXWelcome';
import { seedSinhaEximX } from '@/data/sinha-eximx-seed';
import type { EximXModule } from './EximX.types';

export default function EximXPage(): JSX.Element {
  const [active, setActive] = useState<EximXModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();
  const navigate = useNavigate();

  useEffect(() => { seedSinhaEximX(); }, []);

  const handleModuleChange = (moduleId: string): void => {
    if (moduleId === 'eximx-export') { navigate('/erp/eximx/export'); return; }
    if (moduleId === 'eximx-import') { navigate('/erp/eximx/import'); return; }
    if (moduleId === 'eximx-unified') { navigate('/erp/eximx/unified'); return; }
    setActive(moduleId as EximXModule);
  };

  return (
    <Shell
      config={eximxShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      onSidebarItemClick={(item) => { if (item.moduleId) handleModuleChange(item.moduleId); }}
    >
      <div className="p-4 md:p-6 animate-fade-in">
        {active === 'welcome' && <EximXWelcome onNavigate={handleModuleChange} />}
      </div>
    </Shell>
  );
}
