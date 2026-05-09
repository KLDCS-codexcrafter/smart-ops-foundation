/**
 * SupplyXSidebar.tsx — Sprint T-Phase-1.A.7.α-a · Block A · D-282
 * Canonical sidebar consumer (post-Shell) · migrated in Sprint T-Phase-1.A.7.α-a ·
 * consumes `supplyXSidebarItems` from `@/apps/erp/configs/supplyx-sidebar-config` ·
 * Architectural note: SupplyX is internal procurement read-only mirror (D-282) ·
 * Vendor Portal is a SEPARATE card with its own scaffold engines (vendor-portal-* in src/lib).
 */
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { supplyXSidebarItems } from '@/apps/erp/configs/supplyx-sidebar-config';
import type { SidebarItem } from '@/shell/types';
import type { SupplyXModule } from './SupplyXSidebar.types';

interface Props {
  active: SupplyXModule;
  onNavigate: (m: SupplyXModule) => void;
}

function renderItem(
  item: SidebarItem,
  active: SupplyXModule,
  onNavigate: (m: SupplyXModule) => void,
): JSX.Element | null {
  if (item.type !== 'item' || !item.moduleId) return null;
  const Icon = item.icon;
  const moduleId = item.moduleId as SupplyXModule;
  return (
    <SidebarMenuItem key={item.id}>
      <SidebarMenuButton
        isActive={active === moduleId}
        onClick={() => onNavigate(moduleId)}
      >
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SupplyXSidebar({ active, onNavigate }: Props): JSX.Element {
  return (
    <Sidebar>
      <SidebarContent>
        {supplyXSidebarItems.map((node) => {
          if (node.type === 'item') {
            return (
              <SidebarGroup key={node.id}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {renderItem(node, active, onNavigate)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }
          if (node.type === 'group') {
            return (
              <SidebarGroup key={node.id}>
                <SidebarGroupLabel>{node.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {(node.children ?? []).map((child) =>
                      renderItem(child, active, onNavigate),
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }
          return null;
        })}
      </SidebarContent>
    </Sidebar>
  );
}
