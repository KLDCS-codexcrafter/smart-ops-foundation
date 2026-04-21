/**
 * ShellSidebar — Renders SidebarItem[] using shadcn Sidebar primitives.
 *
 * PURPOSE  Layout-only sidebar that delegates navigation to caller via onItemClick + item.route/onClick.
 * INPUT    items: SidebarItem[], onItemClick callback
 * OUTPUT   Rendered shadcn Sidebar
 * DEPENDENCIES  shadcn sidebar/collapsible/badge, react-router-dom
 * TALLY-ON-TOP BEHAVIOR  none (chip handling lives in header)
 * SPEC DOC  Operix_ONE_Shell_Specification.xlsx
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import type { SidebarItem } from '../types';

interface Props {
  items: SidebarItem[];
  onItemClick?: (item: SidebarItem) => void;
}

export function ShellSidebar({ items, onItemClick }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (item: SidebarItem) => {
    if (item.onClick) item.onClick();
    else if (item.route) navigate(item.route);
    onItemClick?.(item);
  };

  const isActive = (item: SidebarItem) =>
    !!item.route && location.pathname === item.route;

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        {items.map(item => {
          if (item.type === 'divider') {
            return <div key={item.id} className="h-px bg-border mx-3 my-2" />;
          }

          if (item.type === 'group') {
            return (
              <Collapsible
                key={item.id}
                defaultOpen={!item.collapsibleByDefault}
              >
                <SidebarGroup>
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {item.icon && <item.icon className="h-4 w-4" />}
                        {item.label}
                      </span>
                      <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {item.children?.map(child => {
                          if (child.type === 'divider') {
                            return <div key={child.id} className="h-px bg-border mx-3 my-2" />;
                          }
                          return (
                            <SidebarMenuItem key={child.id}>
                              <SidebarMenuButton
                                onClick={() => handleClick(child)}
                                isActive={isActive(child)}
                                className={child.comingSoon ? 'opacity-50 pointer-events-none' : ''}
                              >
                                {child.icon && <child.icon className="h-4 w-4" />}
                                <span>{child.label}</span>
                                {child.badge && (
                                  <Badge variant="secondary" className="ml-auto">
                                    {child.badge}
                                  </Badge>
                                )}
                                {child.newBadge && (
                                  <span className="ml-auto text-[10px] font-medium text-success">
                                    NEW
                                  </span>
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          }

          // type === 'item'
          return (
            <SidebarGroup key={item.id}>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleClick(item)}
                      isActive={isActive(item)}
                    >
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
