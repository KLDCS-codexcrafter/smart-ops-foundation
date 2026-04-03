import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// [JWT] Replace with real document list
const DOCUMENTS = [
  { id: "DOC-001", name: "GST Registration Certificate", type: "certificate", size: "0.4 MB", date: "12 Jan 2024", category: "tax" },
  { id: "DOC-002", name: "Credit Facility Agreement FY 2025-26", type: "agreement", size: "1.2 MB", date: "01 Apr 2025", category: "legal" },
  { id: "DOC-003", name: "Annual Statement FY 2024-25", type: "statement", size: "0.8 MB", date: "31 Mar 2025", category: "financial" },
  { id: "DOC-004", name: "Annual Statement FY 2025-26 (YTD)", type: "statement", size: "0.6 MB", date: "31 Mar 2026", category: "financial" },
  { id: "DOC-005", name: "Price List — Effective 01 Apr 2026", type: "price_list", size: "0.3 MB", date: "01 Apr 2026", category: "commercial" },
  { id: "DOC-006", name: "TDS Certificate Q3 FY 2025-26", type: "certificate", size: "0.2 MB", date: "15 Jan 2026", category: "tax" },
  { id: "DOC-007", name: "Payment Terms & Conditions", type: "agreement", size: "0.5 MB", date: "01 Apr 2025", category: "legal" },
  { id: "DOC-008", name: "Product Catalogue 2026", type: "catalogue", size: "5.8 MB", date: "01 Jan 2026", category: "commercial" },
];

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  tax:        { label: "Tax",        color: "bg-warning/10 text-warning border-warning/20" },
  legal:      { label: "Legal",      color: "bg-info/10 text-info border-info/20" },
  financial:  { label: "Financial",  color: "bg-primary/10 text-primary border-primary/20" },
  commercial: { label: "Commercial", color: "bg-accent/10 text-accent border-accent/20" },
};

const CATEGORIES = ["all", "tax", "legal", "financial", "commercial"] as const;

export default function Documents() {
  const [category, setCategory] = useState("all");

  const filtered = category === "all"
    ? DOCUMENTS
    : DOCUMENTS.filter((d) => d.category === category);

  return (
    <CustomerLayout title="Documents" subtitle="Download certificates, agreements and tax documents">
      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg transition-colors capitalize",
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-muted"
            )}
          >
            {cat === "all" ? "All" : CATEGORY_CONFIG[cat].label}
          </button>
        ))}
      </div>

      {/* Document grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 cursor-pointer transition-colors"
          >
            <FileText className="h-8 w-8 text-primary/40 mb-3" />
            <span className={cn(
              "text-xs border rounded-lg px-2 py-0.5 inline-block mb-2",
              CATEGORY_CONFIG[doc.category].color
            )}>
              {CATEGORY_CONFIG[doc.category].label}
            </span>
            <p className="text-sm font-semibold text-foreground">{doc.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{doc.date} • {doc.size}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => toast(`Downloading ${doc.name}...`)}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          </div>
        ))}
      </div>
    </CustomerLayout>
  );
}
