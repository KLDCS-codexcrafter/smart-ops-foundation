import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, Terminal, Cpu, Globe,
  Landmark, ChevronRight, Lock, ShoppingCart, Package,
  TrendingUp, Users,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { CommandCenterModule } from '../pages/CommandCenterPage';

interface CommandCenterSidebarProps {
  activeModule: CommandCenterModule;
  onModuleChange: (module: CommandCenterModule) => void;
}

export function CommandCenterSidebar({ activeModule, onModuleChange }: CommandCenterSidebarProps) {
  const [foundationOpen, setFoundationOpen] = useState(
    activeModule === 'foundation' || activeModule === 'geography'
  );
  const [finecoreOpen, setFinecoreOpen] = useState(
    activeModule.startsWith('finecore')
  );

  useEffect(() => {
    if (activeModule === 'foundation' || activeModule === 'geography') setFoundationOpen(true);
    if (activeModule.startsWith('finecore')) setFinecoreOpen(true);
  }, [activeModule]);

  const FINECORE_ITEMS: { label: string; module: CommandCenterModule }[] = [
    { label: 'Hub Overview', module: 'finecore-hub' },
    { label: 'Tax Rate Master', module: 'finecore-tax-rates' },
    { label: 'TDS Sections', module: 'finecore-tds' },
    { label: 'TCS Sections', module: 'finecore-tcs' },
    { label: 'HSN / SAC Codes', module: 'finecore-hsn-sac' },
    { label: 'Professional Tax', module: 'finecore-professional-tax' },
    { label: 'EPF / ESI / LWF', module: 'finecore-epf-esi-lwf' },
    { label: 'Statutory Registrations', module: 'finecore-statutory-reg' },
    { label: 'GST Entity Config', module: 'finecore-gst-config' },
    { label: 'Comply360 Config', module: 'finecore-comply360' },
  ];

  const COMING_SOON = [
    { label: 'Procure Masters', icon: ShoppingCart },
    { label: 'Inventory Masters', icon: Package },
    { label: 'Sales Masters', icon: TrendingUp },
    { label: 'HR & Payroll Masters', icon: Users },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r" style={{ background: "hsl(222 47% 11%)", borderColor: "rgba(255,255,255,0.06)" }}>
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-primary)' }}>
            <Cpu className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-foreground leading-tight">4DSmartOps</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Command Centre</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* PLATFORM */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeModule === 'overview'} onClick={() => onModuleChange('overview')} tooltip="Overview">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible open={foundationOpen} onOpenChange={setFoundationOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={activeModule === 'foundation' || activeModule === 'geography'}
                      tooltip="Foundation & Core"
                    >
                      <Building2 className="h-4 w-4" />
                      <span>Foundation & Core</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${foundationOpen ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton isActive={activeModule === 'foundation'} onClick={() => onModuleChange('foundation')}>
                          <Building2 className="h-3 w-3" />
                          <span>Entity Management</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton isActive={activeModule === 'geography'} onClick={() => onModuleChange('geography')}>
                          <Globe className="h-3 w-3" />
                          <span>Geography Masters</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* FINANCE & COMPLIANCE */}
        <SidebarGroup>
          <SidebarGroupLabel>Finance & Compliance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible open={finecoreOpen} onOpenChange={setFinecoreOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={activeModule.startsWith('finecore')}
                      tooltip="FineCore Masters"
                    >
                      <Landmark className="h-4 w-4 text-indigo-400" />
                      <span>FineCore Masters</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${finecoreOpen ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {FINECORE_ITEMS.map(item => (
                        <SidebarMenuSubItem key={item.module}>
                          <SidebarMenuSubButton isActive={activeModule === item.module} onClick={() => onModuleChange(item.module)}>
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* COMING SOON */}
        <SidebarGroup>
          <SidebarGroupLabel>Coming Soon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {COMING_SOON.map(item => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton className="opacity-50 pointer-events-none" tooltip={item.label}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    <Lock className="ml-auto h-3 w-3 text-muted-foreground" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SYSTEM */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeModule === 'console'} onClick={() => onModuleChange('console')} tooltip="Security Console">
                  <Terminal className="h-4 w-4" />
                  <span>Security Console</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold leading-tight">
              <span style={{ color: 'hsl(24 95% 53%)' }}>Made</span>{' '}
              <span className="text-foreground">in</span>{' '}
              <span style={{ color: 'hsl(145 63% 42%)' }}>India</span>
            </p>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">4DSmartOps v0.1.0</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}