import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

export type CommandCenterModule = "overview" | "core" | "console";

const SEEN_KEY = "operix-welcome-seen-command-center";

export default function CommandCenterPage() {
  const navigate = useNavigate();

  const [activeModule, setActiveModule] = useState<CommandCenterModule>(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "core" || hash === "console") return hash;
    return "overview";
  });

  // Sync URL hash with active module
  useEffect(() => {
    const hash = activeModule === "overview" ? "" : `#${activeModule}`;
    const url = window.location.pathname + hash;
    window.history.replaceState(null, "", url);
  }, [activeModule]);

  // Home button handler — clears skip flag and returns to welcome
  function handleHome() {
    localStorage.removeItem(SEEN_KEY);
    navigate("/erp/command-center");
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">

        {/* SIDEBAR — placeholder until Prompt 2 */}
        <aside className="w-60 border-r border-border bg-card hidden md:block">
          <div className="p-4 text-sm text-muted-foreground">
            Sidebar — Prompt 2
          </div>
        </aside>

        {/* MAIN AREA */}
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* HEADER — placeholder until Prompt 2 */}
          <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/50 h-14 flex items-center px-4 sm:px-6">
            <span className="text-sm text-muted-foreground">Command Center Header — Prompt 2</span>
          </header>

          {/* CONTENT */}
          <ScrollArea className="flex-1">
            <main className="p-6">

              {/* Module tab switcher — temporary visual */}
              <div className="flex gap-2 mb-6">
                {(["overview", "core", "console"] as CommandCenterModule[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveModule(m)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeModule === m
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {m === "overview" ? "Overview" : m === "core" ? "Foundation & Core" : "Security Console"}
                  </button>
                ))}
              </div>

              {/* Module placeholders until Prompt 2 and 3 */}
              {activeModule === "overview" && (
                <div className="rounded-xl border border-border bg-card/60 p-8 text-center">
                  <p className="text-sm text-muted-foreground">Overview Module — built in Prompt 2</p>
                </div>
              )}
              {activeModule === "core" && (
                <div className="rounded-xl border border-border bg-card/60 p-8 text-center">
                  <p className="text-sm text-muted-foreground">Foundation &amp; Core — built in Prompt 3</p>
                </div>
              )}
              {activeModule === "console" && (
                <div className="rounded-xl border border-border bg-card/60 p-8 text-center">
                  <p className="text-sm text-muted-foreground">Security Console — built in Prompt 3</p>
                </div>
              )}

            </main>
          </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
