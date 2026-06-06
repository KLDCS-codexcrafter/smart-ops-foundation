/**
 * @file        src/pages/bridge/ImportHub.tsx
 * @sprint      R0 · Step-2 · Block 3 (DP-R0-2) · ImportHub honesty rewrite
 * @purpose     Honest Import Router. Each card owns its own import surface today.
 *              A central cross-module import service arrives with the Phase-2 backend.
 * @decisions   DP-R0-2 — deleted fake `toast("IMP-005 created")` (was :148);
 *              deleted dead Target Company / Target Module / File Format / Date Override
 *              selects that fed no real pipeline; deleted fabricated IMPORT_HISTORY
 *              fixture and the stats derived from it. No new import logic added.
 */
import { Link } from "react-router-dom";
import {
  ShoppingCart, Ship, Landmark, Info, ArrowRight,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import { cn } from "@/lib/utils";

// ─── REAL IMPORT SURFACES (verified at R0 Block 0.3 / Block 1) ────────────
// Only routes that resolve to a real, shipped import workflow are listed.
// Tier scoping continues to be enforced by the entitlement engine; the
// cross-module import service is a Phase-2 backend deliverable.
// ──────────────────────────────────────────────────────────────────────────

interface ImportSurface {
  id: string;
  title: string;
  card: string;
  blurb: string;
  route: string;
  icon: typeof ShoppingCart;
  accent: string;
}

const SURFACES: ImportSurface[] = [
  {
    id: "ecomx-import-center",
    title: "EcomX Import Center",
    card: "EcomX",
    blurb:
      "Marketplace order, settlement and return file ingestion (Amazon · Flipkart · Meesho · Myntra). CSV/Excel templates per channel.",
    route: "/erp/ecomx",
    icon: ShoppingCart,
    accent: "text-primary",
  },
  {
    id: "eximx-import",
    title: "EximX — Import Workbench",
    card: "EximX",
    blurb:
      "Import-PO, BoE, foreign vendor invoice and shipping-doc ingestion for cross-border procurement.",
    route: "/erp/eximx/import",
    icon: Ship,
    accent: "text-success",
  },
  {
    id: "fincore-bank-rec",
    title: "FinCore — Bank Statement Import",
    card: "FinCore",
    blurb:
      "Bank statement (.csv / .xlsx) upload for reconciliation. Auto-match by amount + date inside Bank Reconciliation panel.",
    route: "/erp/fincore",
    icon: Landmark,
    accent: "text-warning",
  },
];

export function ImportHubPanel() {
  return (
    <BridgeLayout
      title="Import Router"
      subtitle="Each card owns its import surface today. A central cross-module import service arrives with the Phase-2 backend."
    >
      <div data-keyboard-form>
        {/* Honesty panel */}
        <div
          role="note"
          aria-label="Import Hub honesty notice"
          data-testid="import-hub-honesty"
          className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3"
        >
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              No central import job runs from this screen.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Imports happen inside the owning card (EcomX, EximX, FinCore, …) where
              the parsing schema, validation and target ledger/voucher rules live.
              This page routes you to the right surface. A cross-module import
              service with a shared queue and audit trail is a Phase-2 backend
              deliverable.
            </p>
          </div>
        </div>

        {/* Router cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SURFACES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.id}
                to={s.route}
                data-testid={`import-router-link-${s.id}`}
                className={cn(
                  "group rounded-2xl border border-border bg-card p-5",
                  "hover:border-primary/40 hover:shadow-elevated transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("p-2 rounded-lg bg-muted/40", s.accent)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                    {s.card}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {s.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {s.blurb}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                  Open surface
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </BridgeLayout>
  );
}

export default function ImportHub() {
  return <ImportHubPanel />;
}
