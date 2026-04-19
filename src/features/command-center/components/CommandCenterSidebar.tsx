import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network } from 'lucide-react';
import {
  LayoutDashboard, Building2, Terminal, Cpu, Globe,
  Landmark, ChevronRight, Lock, ShoppingCart, Package,
  TrendingUp, Users, CreditCard, Settings2, Grid3X3, Hash,
  Boxes, Tags, Tag, Warehouse, Ruler, LayoutTemplate,
  QrCode, ScanLine, MapPin, Printer, Wifi,
  PackageOpen, DollarSign, TrendingDown, AlertTriangle,
  Zap, Upload, BookOpen, HandCoins, Bell, Truck,
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

const STATUTORY_ITEMS: { label: string; module: CommandCenterModule }[] = [
  { label: 'Hub Overview', module: 'finecore-hub' },
  { label: 'GST Rate Reference', module: 'finecore-tax-rates' },
  { label: 'TDS Sections', module: 'finecore-tds' },
  { label: 'TCS Sections', module: 'finecore-tcs' },
  { label: 'HSN / SAC Directory', module: 'finecore-hsn-sac' },
  { label: 'Payroll Statutory', module: 'finecore-epf-esi-lwf' },
  { label: 'Income Tax Reference', module: 'finecore-income-tax' },
  { label: 'Professional Tax', module: 'finecore-professional-tax' },
];

const ENTITY_CONFIG_ITEMS: { label: string; module: CommandCenterModule }[] = [
  { label: 'Statutory Registrations', module: 'finecore-statutory-reg' },
  { label: 'GST Entity Config', module: 'finecore-gst-config' },
  { label: 'Comply360 Config', module: 'finecore-comply360' },
];

const ACCOUNT_STRUCTURE_ITEMS: { label: string; module: CommandCenterModule }[] = [
  { label: 'Currency Master', module: 'finecore-currency' },
  { label: 'FinFrame — Account Groups', module: 'finecore-finframe' },
  { label: 'Ledger Master', module: 'finecore-ledgers' },
  { label: 'Voucher Types', module: 'finecore-voucher-types' },
];

const TRANSACTION_DEFAULTS_ITEMS: { label: string; module: CommandCenterModule }[] = [
  { label: 'Transaction Templates', module: 'finecore-transaction-templates' },
];

const A1_ITEMS: { label: string; module: CommandCenterModule; icon: any }[] = [
  { label: 'Parametric Hub', module: 'inventory-parametric', icon: Settings2 },
  { label: 'Batch Grid',     module: 'inventory-batch',      icon: Grid3X3 },
  { label: 'Serial Grid',    module: 'inventory-serial',     icon: Hash },
];

const A2_ITEMS: { label: string; module: CommandCenterModule; icon: any }[] = [
  { label: 'Stock Matrix',    module: 'inventory-stock-matrix', icon: Boxes },
  { label: 'Classifications', module: 'inventory-classify',     icon: Tags },
  { label: 'Brand Matrix',    module: 'inventory-brands',       icon: Tag },
  { label: 'Storage Matrix',  module: 'inventory-storage',      icon: Warehouse },
  { label: 'Measure X',       module: 'inventory-uom',          icon: Ruler },
];

const A3_ITEMS: { label: string; module: CommandCenterModule; icon: any }[] = [
  { label: 'Item Craft',      module: 'inventory-item-craft',      icon: Package },
  { label: 'Code Matrix',     module: 'inventory-code-matrix',     icon: Hash },
  { label: 'Item Templates',  module: 'inventory-item-templates',  icon: LayoutTemplate },
];

const A4_ITEMS: { label: string; module: CommandCenterModule; icon: any }[] = [
  { label: 'Opening Stock Entry', module: 'inventory-opening-stock', icon: PackageOpen },
  { label: 'Rates & MRP',        module: 'inventory-item-rates',    icon: DollarSign },
  { label: 'Price Lists',        module: 'inventory-price-lists',   icon: TrendingDown },
  { label: 'Reorder & Min-Max',  module: 'inventory-reorder',       icon: AlertTriangle },
];

const A5_ITEMS: { label: string; module: CommandCenterModule; icon: any }[] = [
  { label: 'Label Templates',    module: 'inventory-label-templates', icon: Tag },
  { label: 'Barcode Generator',  module: 'inventory-barcode-gen',     icon: QrCode },
  { label: 'Asset Tag Manager',  module: 'inventory-asset-tags',      icon: ScanLine },
  { label: 'Bin Location Labels',module: 'inventory-bin-labels',      icon: MapPin },
  { label: 'Print Queue',        module: 'inventory-print-queue',     icon: Printer },
  { label: 'RFID Manager',       module: 'inventory-rfid',            icon: Wifi },
];

const OPENING_ITEMS: { label: string; module: CommandCenterModule; icon: any }[] = [
  { label: 'Opening Stock Entry',     module: 'inventory-opening-stock',   icon: PackageOpen },
  { label: 'Ledger Opening Balances', module: 'opening-ledger-balances',   icon: BookOpen },
  { label: 'Employee Opening Loans',  module: 'opening-employee-loans',    icon: HandCoins },
];

const UTILITY_ITEMS: { label: string; module: CommandCenterModule; icon: any }[] = [
  { label: 'Import Hub', module: 'utility-import', icon: Upload },
];

const PEOPLE_CORE_ITEMS: { label: string; module: CommandCenterModule }[] = [
  { label: 'Employee Master',    module: 'ph-employee' },
  { label: 'Pay Heads',          module: 'ph-pay-heads' },
  { label: 'Salary Structures',  module: 'ph-salary-structures' },
  { label: 'Pay Grades',         module: 'ph-pay-grades' },
  { label: 'Shift Master',       module: 'ph-shifts' },
  { label: 'Leave Types',        module: 'ph-leave-types' },
  { label: 'Holiday Calendar',   module: 'ph-holiday-calendar' },
  { label: 'Attendance Types',   module: 'ph-attendance-types' },
  { label: 'Overtime Rules',     module: 'ph-overtime-rules' },
  { label: 'Loan Types',         module: 'ph-loan-types' },
  { label: 'Bonus Config',       module: 'ph-bonus-config' },
  { label: 'Gratuity & NPS',     module: 'ph-gratuity-nps' },
  { label: 'Asset Master',       module: 'ph-asset-master' },
];

// ── Stage 1 — CRM, Sales, Collection, Distributor master sections ──────────
const CRM_ITEMS: { label: string; module: CommandCenterModule }[] = [
  { label: 'Hub Overview',    module: 'crm-hub' },
  { label: 'Customer Master', module: 'crm-customer' },
  { label: 'Vendor Master',   module: 'crm-vendor' },
];

const SALES_ITEMS: { label: string; module: CommandCenterModule }[] = [
  { label: 'Hub Overview',     module: 'sales-hub' },
  { label: 'Sales Hierarchy',  module: 'sales-hierarchy' },
  { label: 'SAM Persons',      module: 'sales-sam-person' },
  { label: 'Enquiry Sources',  module: 'sales-enquiry-source' },
  { label: 'Campaigns',        module: 'sales-campaign' },
  { label: 'Territories',      module: 'sales-territory' },
  { label: 'Beat Routes',      module: 'sales-beat-route' },
  { label: 'Sales Targets',    module: 'sales-target' },
];

const COLLECTION_ITEMS: { label: string; module: CommandCenterModule }[] = [
  { label: 'Hub Overview',       module: 'collection-hub' },
  { label: 'Collection Execs',   module: 'collection-exec' },
  { label: 'Incentive Schemes',  module: 'collection-incentive' },
  { label: 'Reminder Templates', module: 'collection-reminder' },
  { label: 'ReceivX Config',     module: 'collection-config' },
];

const DISTRIBUTOR_ITEMS: { label: string; module: CommandCenterModule }[] = [
  { label: 'Hub Overview',             module: 'distributor-hub' },
  { label: 'Distribution Hierarchy',   module: 'distributor-hierarchy' },
  { label: 'Price Lists',              module: 'distributor-price-list' },
  { label: 'Credit Request Reference', module: 'distributor-credit-refs' },
  { label: 'Dispute Reason Reference', module: 'distributor-dispute-refs' },
];

const COMING_SOON = [
  { label: 'Procure Masters', icon: ShoppingCart },
];

export function CommandCenterSidebar({ activeModule, onModuleChange }: CommandCenterSidebarProps) {
  const navigate = useNavigate();
  const [foundationOpen, setFoundationOpen] = useState(
    activeModule === 'foundation' || activeModule === 'geography' || activeModule === 'org-structure'
  );
  const [finecoreOpen, setFinecoreOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(
    activeModule.startsWith('inventory')
  );
  const [peopleOpen, setPeopleOpen] = useState(activeModule.startsWith('ph-'));

  useEffect(() => {
    if (activeModule === 'foundation' || activeModule === 'geography' || activeModule === 'org-structure') setFoundationOpen(true);
    if (activeModule.startsWith('finecore') || activeModule.startsWith('masters-')) setFinecoreOpen(true);
    if (activeModule.startsWith('inventory')) setInventoryOpen(true);
    if (activeModule.startsWith('ph-')) setPeopleOpen(true);
  }, [activeModule]);

  const allFinecoreModules = [...STATUTORY_ITEMS, ...ENTITY_CONFIG_ITEMS, ...ACCOUNT_STRUCTURE_ITEMS, ...TRANSACTION_DEFAULTS_ITEMS].map(i => i.module);

  const renderSubSection = (label: string, items: { label: string; module: CommandCenterModule }[]) => (
    <>
      <SidebarMenuSubItem>
        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {label}
        </p>
      </SidebarMenuSubItem>
      {items.map(item => (
        <SidebarMenuSubItem key={item.module}>
          <SidebarMenuSubButton isActive={activeModule === item.module} onClick={() => onModuleChange(item.module)}>
            <span>{item.label}</span>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
    </>
  );

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
                      isActive={activeModule === 'foundation' || activeModule === 'geography' || activeModule === 'org-structure'}
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
                        <SidebarMenuSubButton isActive={activeModule === 'org-structure'} onClick={() => onModuleChange('org-structure')}>
                          <Network className="h-3 w-3" />
                          <span>Business Units</span>
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
                      isActive={activeModule.startsWith('finecore') || activeModule.startsWith('masters-')}
                      tooltip="FineCore Masters"
                    >
                      <Landmark className="h-4 w-4 text-indigo-400" />
                      <span>FineCore Masters</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${finecoreOpen ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {renderSubSection('Statutory Reference', STATUTORY_ITEMS)}
                      {renderSubSection('Entity Configuration', ENTITY_CONFIG_ITEMS)}
                      {renderSubSection('Account Structure', ACCOUNT_STRUCTURE_ITEMS)}
                      {renderSubSection('Transaction Defaults', TRANSACTION_DEFAULTS_ITEMS)}
                      
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* INVENTORY MASTERS */}
        <SidebarGroup>
          <SidebarGroupLabel>Inventory Masters</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={activeModule.startsWith('inventory')}
                      tooltip="Inventory Masters"
                    >
                      <Package className="h-4 w-4" />
                      <span>Inventory Masters</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${inventoryOpen ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* A.1 — Parameter & Tracking */}
                      <SidebarMenuSubItem>
                        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          A.1 — Parameter & Tracking
                        </p>
                      </SidebarMenuSubItem>
                      {A1_ITEMS.map(item => (
                        <SidebarMenuSubItem key={item.module}>
                          <SidebarMenuSubButton isActive={activeModule === item.module} onClick={() => onModuleChange(item.module)}>
                            <item.icon className="h-3.5 w-3.5 mr-1" />
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {/* A.2 — Classification & Storage */}
                      <SidebarMenuSubItem>
                        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          A.2 — Classification & Storage
                        </p>
                      </SidebarMenuSubItem>
                      {A2_ITEMS.map(item => (
                        <SidebarMenuSubItem key={item.module}>
                          <SidebarMenuSubButton isActive={activeModule === item.module} onClick={() => onModuleChange(item.module)}>
                            <item.icon className="h-3.5 w-3.5 mr-1" />
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {/* A.3 — Item Core */}
                      <SidebarMenuSubItem>
                        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          A.3 — Item Core
                        </p>
                      </SidebarMenuSubItem>
                      {A3_ITEMS.map(item => (
                        <SidebarMenuSubItem key={item.module}>
                          <SidebarMenuSubButton isActive={activeModule === item.module} onClick={() => onModuleChange(item.module)}>
                            <item.icon className="h-3.5 w-3.5 mr-1" />
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {/* A.4 — Opening Stock & Pricing */}
                      <SidebarMenuSubItem>
                        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          A.4 — Opening Stock & Pricing
                        </p>
                      </SidebarMenuSubItem>
                      {A4_ITEMS.map(item => (
                        <SidebarMenuSubItem key={item.module}>
                          <SidebarMenuSubButton isActive={activeModule === item.module} onClick={() => onModuleChange(item.module)}>
                            <item.icon className="h-3.5 w-3.5 mr-1" />
                            <span>{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {/* A.5 — Label & Identity */}
                      <SidebarMenuSubItem>
                        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          A.5 — Label & Identity
                        </p>
                      </SidebarMenuSubItem>
                      {A5_ITEMS.map(item => (
                        <SidebarMenuSubItem key={item.module}>
                          <SidebarMenuSubButton isActive={activeModule === item.module} onClick={() => onModuleChange(item.module)}>
                            <item.icon className="h-3.5 w-3.5 mr-1" />
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

        {/* OPENING BALANCES */}
        <SidebarGroup>
          <SidebarGroupLabel>Opening Balances</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {OPENING_ITEMS.map(item => (
                <SidebarMenuItem key={item.module}>
                  <SidebarMenuButton isActive={activeModule === item.module} onClick={() => onModuleChange(item.module)} tooltip={item.label}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* UTILITIES */}
        <SidebarGroup>
          <SidebarGroupLabel>Utilities</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {UTILITY_ITEMS.map(item => (
                <SidebarMenuItem key={item.module}>
                  <SidebarMenuButton isActive={activeModule === item.module} onClick={() => onModuleChange(item.module)} tooltip={item.label}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* PEOPLE CORE */}
        <SidebarGroup>
          <SidebarGroupLabel>People Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible open={peopleOpen} onOpenChange={setPeopleOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={activeModule.startsWith('ph-')} tooltip="People Core">
                      <Users className="h-4 w-4" />
                      <span>People Core</span>
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${peopleOpen ? 'rotate-90' : ''}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {PEOPLE_CORE_ITEMS.map(item => (
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
