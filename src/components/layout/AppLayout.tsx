import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";
import { ThemeToggle } from "@/components/theme";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppLayout({ children, title, breadcrumbs = [] }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 glass flex h-14 items-center gap-4 border-b border-border/50 px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="h-5 bg-border/50" />

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground">
                    4DSmartOps
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, i) => (
                  <BreadcrumbItem key={i}>
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

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              <UserProfileDropdown variant="app" />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">
            <div className="mb-6 animate-fade-in">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            </div>
            <div className="animate-slide-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
