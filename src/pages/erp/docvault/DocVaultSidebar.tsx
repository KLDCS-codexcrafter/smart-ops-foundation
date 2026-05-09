/**
 * @file        src/pages/erp/docvault/DocVaultSidebar.tsx
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Block B.2 · canonical sidebar consumer
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
import { docVaultSidebarItems } from '@/apps/erp/configs/docvault-sidebar-config';
import type { SidebarItem } from '@/shell/types';
import type { DocVaultModule } from './DocVaultSidebar.types';

interface Props {
  active: DocVaultModule;
  onNavigate: (m: DocVaultModule) => void;
}

function renderItem(
  item: SidebarItem,
  active: DocVaultModule,
  onNavigate: (m: DocVaultModule) => void,
): JSX.Element | null {
  if (item.type !== 'item' || !item.moduleId) return null;
  const Icon = item.icon;
  const moduleId = item.moduleId as DocVaultModule;
  return (
    <SidebarMenuItem key={item.id}>
      <SidebarMenuButton isActive={active === moduleId} onClick={() => onNavigate(moduleId)}>
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function DocVaultSidebar({ active, onNavigate }: Props): JSX.Element {
  return (
    <Sidebar>
      <SidebarContent>
        {docVaultSidebarItems.map((node) => {
          if (node.type === 'item') {
            return (
              <SidebarGroup key={node.id}>
                <SidebarGroupContent>
                  <SidebarMenu>{renderItem(node, active, onNavigate)}</SidebarMenu>
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
                    {(node.children ?? []).map((child) => renderItem(child, active, onNavigate))}
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
