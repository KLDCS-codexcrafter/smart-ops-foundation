import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommandCenterSidebar } from "../components/CommandCenterSidebar";
import { CommandCenterHeader } from "../components/CommandCenterHeader";
import { FoundationModule } from "../modules/FoundationModule";
import { SecurityModule } from "../modules/SecurityModule";

export type CommandCenterModule = "console" | "core";

const SEEN_KEY = "operix-welcome-seen-command-center";

export default function CommandCenterPage() {
  const navigate = useNavigate();

  const [activeModule, setActiveModule] = useState<CommandCenterModule>(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "core") return "core";
    return "console";
  });

  useEffect(() => {
    const hash = activeModule === "core" ? "#core" : "";
    window.history.replaceState(null, "", window.location.pathname + hash);
  }, [activeModule]);

  function handleHome() {
    localStorage.removeItem(SEEN_KEY);
    navigate("/erp/command-center");
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-svh w-full bg-background">

        <CommandCenterSidebar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />

        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <CommandCenterHeader
            activeModule={activeModule}
            onModuleChange={setActiveModule}
            onHome={handleHome}
          />

          <ScrollArea className="flex-1">
            <div className="p-6 max-w-7xl mx-auto">
              {activeModule === "console" && <SecurityModule />}
              {activeModule === "core" && <FoundationModule />}
            </div>
          </ScrollArea>
        </SidebarInset>

      </div>
    </SidebarProvider>
  );
}
