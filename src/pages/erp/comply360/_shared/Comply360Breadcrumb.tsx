/**
 * @file        src/pages/erp/comply360/_shared/Comply360Breadcrumb.tsx
 * @purpose     Cross-mega-menu navigation breadcrumb · Sprint 88 polish slot
 * @sprint      Sprint 88 · T-Phase-5.E.5.0 · L1
 */
import { memo } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';
import type { Comply360Module } from '../Comply360Sidebar.types';

interface Props {
  activeModule: Comply360Module;
  onNavigate: (m: Comply360Module) => void;
}

function labelOf(id: Comply360Module): string {
  if (id === 'welcome' || id === 'home') return 'Home';
  const item = comply360SidebarItems.find((i) => i.id === id);
  return item?.label ?? String(id);
}

function Comply360BreadcrumbInner({ activeModule, onNavigate }: Props): JSX.Element {
  const isHome = activeModule === 'welcome' || activeModule === 'home';
  return (
    <nav aria-label="Comply360 breadcrumb" className="px-4 pt-3 pb-1 text-xs flex items-center gap-1.5 text-muted-foreground">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onNavigate('welcome')}
      >
        <Home className="h-3 w-3" /> Comply360
      </button>
      {!isHome && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{labelOf(activeModule)}</span>
        </>
      )}
    </nav>
  );
}

export const Comply360Breadcrumb = memo(Comply360BreadcrumbInner);
