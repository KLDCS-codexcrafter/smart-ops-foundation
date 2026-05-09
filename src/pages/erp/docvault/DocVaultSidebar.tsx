/**
 * @file        src/pages/erp/docvault/DocVaultSidebar.tsx
 * @purpose     DocVault sidebar · consumes canonical docvault-sidebar-config · 'd *' keyboard namespace
 * @who         All departments · Document Controller · per-card sub-module consumers (Phase 2 sprints)
 * @when        2026-05-09 (T1 backfill)
 * @sprint      T-Phase-1.A.8.α-a-T1-Audit-Fix · Block C · F-4 backfill
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL · A.8 Foundation) ·
 *              D-NEW-CC sidebar keyboard uniqueness (4th consumer with 'd *' namespace) ·
 *              D-NEW-BV Phase 1 mock pattern ·
 *              FR-30 11/11 header standard (T1 backfill per A.6.α-a-T1 institutional pattern)
 * @disciplines FR-30 (this header) · FR-67 broad-stem grep verified
 * @reuses      docVaultSidebarItems canonical config · @/shell/types SidebarItem
 * @[JWT]       N/A (UI consumer · no storage · no API)
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
