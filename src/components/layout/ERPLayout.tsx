/**
 * ERPLayout.tsx — Shell layout for tenant-facing /erp/* pages
 * Sprint 11a patch. Wraps ERPSidebar (tenant nav from applications.ts).
 *
 * Use this for any /erp/* hub page that doesn't have its own custom sidebar
 * (SalesX, ReceivX, FineCore Workspaces all bring their own).
 *
 * Never use AppLayout inside /erp/* — AppLayout exposes KLDCS-internal nav.
 */
import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ERPSidebar } from './ERPSidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Bell } from 'lucide-react';
import { UserProfileDropdown } from '@/components/auth/UserProfileDropdown';
import { ThemeToggle } from '@/components/theme';

interface ERPLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function ERPLayout({ children, title, breadcrumbs = [] }: ERPLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ERPSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 flex h-14 items-center gap-4 border-b border-border/50 px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="h-5 bg-border/50" />

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/erp/dashboard" className="text-muted-foreground hover:text-foreground">
                    Operix ERP
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, i) => (
                  <BreadcrumbItem key={`${crumb.label}-${i}`}>
                    <BreadcrumbSeparator />
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-foreground">
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
              </button>
              <ThemeToggle />
              <UserProfileDropdown variant="app" />
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            {title && (
              <h1 className="text-2xl font-bold mb-6 text-foreground">{title}</h1>
            )}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default ERPLayout;
