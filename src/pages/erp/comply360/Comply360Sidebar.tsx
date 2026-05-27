/**
 * @file        src/pages/erp/comply360/Comply360Sidebar.tsx
 * @purpose     Comply360 sidebar wrapper · re-exports config for component-level consumers
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 1 · Q2
 * @note        Shell renders the actual sidebar from comply360-shell-config. This file
 *              provides a component-level handle for tests + future custom rendering.
 */
import { comply360SidebarItems } from '@/apps/erp/configs/comply360-sidebar-config';
import type { SidebarItem } from '@/shell/types';

export interface Comply360SidebarProps {
  onSelect?: (moduleId: string) => void;
}

export function Comply360Sidebar({ onSelect }: Comply360SidebarProps): JSX.Element {
  return (
    <nav aria-label="Comply360 mega-menu" className="flex flex-col gap-1 p-2">
      {comply360SidebarItems.map((item: SidebarItem) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-left"
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export { comply360SidebarItems };
