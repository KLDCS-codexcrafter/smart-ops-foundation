import { useState } from "react";
import { toast } from "sonner";
import {
  GitBranch, Database, Cloud, Plus,
  Copy, Trash2, Eye, ArrowRight, CheckCircle2,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FieldMapping {
  id: string;
  sourceField: string;
  tallyField: string;
  transform?: string;
  required: boolean;
}

interface MappingTemplate {
  id: string;
  name: string;
  source: string;
  target: string;
  fieldCount: number;
  usageCount: number;
  lastUsed: string;
  mappings: FieldMapping[];
}

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier:
//   Tier 1 (4DSO Dev/IT Team):  GET /api/bridge/field-mappings              → full fleet, all clients
//   Tier 2 (Partner IT Team):   GET /api/bridge/field-mappings?partnerId={jwt.partnerId}  → their clients only
//   Tier 3 (Customer IT Admin): GET /api/bridge/field-mappings?tenantId={jwt.tenantId}    → own company only
// JWT payload shape: { userId, role, tier: 1|2|3, partnerId?: string, tenantId?: string }
// ─────────────────────────────────────────────────────────────────────────

const TEMPLATES: MappingTemplate[] = [
  {
    id: "MAP-001",
    name: "Tally → 4DSO Sales",
    source: "Tally Prime Sales Voucher",
    target: "4DSmartOps Sales Module",
    fieldCount: 12,
    usageCount: 128,
    lastUsed: "Today",
    mappings: [
      { id: "f1", sourceField: "VoucherNumber", tallyField: "voucherNo", required: true },
      { id: "f2", sourceField: "Date", tallyField: "voucherDate", required: true },
      { id: "f3", sourceField: "LedgerName", tallyField: "ledger", required: true },
      { id: "f4", sourceField: "Amount", tallyField: "amount", transform: "paise", required: true },
      { id: "f5", sourceField: "VoucherType", tallyField: "voucherType", required: true },
      { id: "f6", sourceField: "Narration", tallyField: "narration", required: false },
      { id: "f7", sourceField: "GSTNumber", tallyField: "gstin", transform: "uppercase", required: false },
      { id: "f8", sourceField: "CostCentre", tallyField: "costCentre", required: false },
      { id: "f9", sourceField: "Reference", tallyField: "reference", required: false },
      { id: "f10", sourceField: "PartyName", tallyField: "partyName", required: true },
      { id: "f11", sourceField: "TaxAmount", tallyField: "gstAmount", transform: "paise", required: false },
      { id: "f12", sourceField: "CompanyName", tallyField: "company", required: true },
    ],
  },
  {
    id: "MAP-002",
    name: "Tally → 4DSO Ledgers",
    source: "Tally Prime Ledger Master",
    target: "4DSmartOps Chart of Accounts",
    fieldCount: 8,
    usageCount: 45,
    lastUsed: "2 days ago",
    mappings: [
      { id: "g1", sourceField: "Name", tallyField: "ledgerName", required: true },
      { id: "g2", sourceField: "Parent", tallyField: "groupName", required: true },
      { id: "g3", sourceField: "OpeningBalance", tallyField: "openingBal", transform: "paise", required: false },
      { id: "g4", sourceField: "ClosingBalance", tallyField: "closingBal", transform: "paise", required: false },
      { id: "g5", sourceField: "GSTNumber", tallyField: "gstin", transform: "uppercase", required: false },
      { id: "g6", sourceField: "Address", tallyField: "address", required: false },
      { id: "g7", sourceField: "PinCode", tallyField: "pinCode", required: false },
      { id: "g8", sourceField: "State", tallyField: "state", required: false },
    ],
  },
  {
    id: "MAP-003",
    name: "Tally → 4DSO Stock",
    source: "Tally Prime Stock Item",
    target: "4DSmartOps Inventory",
    fieldCount: 10,
    usageCount: 67,
    lastUsed: "1 week ago",
    mappings: [
      { id: "h1", sourceField: "Name", tallyField: "itemName", required: true },
      { id: "h2", sourceField: "Parent", tallyField: "category", required: true },
      { id: "h3", sourceField: "BaseUnit", tallyField: "unit", required: true },
      { id: "h4", sourceField: "Rate", tallyField: "rate", transform: "paise", required: false },
      { id: "h5", sourceField: "ClosingQty", tallyField: "closingQty", required: false },
      { id: "h6", sourceField: "ClosingValue", tallyField: "closingValue", transform: "paise", required: false },
      { id: "h7", sourceField: "HSNCode", tallyField: "hsnCode", required: false },
      { id: "h8", sourceField: "GSTRate", tallyField: "gstRate", required: false },
      { id: "h9", sourceField: "OpeningQty", tallyField: "openingQty", required: false },
      { id: "h10", sourceField: "OpeningValue", tallyField: "openingValue", transform: "paise", required: false },
    ],
  },
];

const PREBUILT_CATEGORIES = [
  {
    category: "Tally Prime → 4DSmartOps",
    items: ["Sales Vouchers", "Purchase Vouchers", "Journal Entries", "Ledger Masters", "Stock Items", "Cost Centres"],
  },
  {
    category: "External → Tally Prime",
    items: ["Excel Sales Import", "CSV Ledger Import", "JSON Purchase Import", "Bank Statement Import"],
  },
  {
    category: "India-specific",
    items: ["GST Sales Register", "GST Purchase Register", "TDS Deduction", "e-Invoice Export"],
  },
];

const FieldMapper = () => {
  const [tab, setTab] = useState("templates");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<MappingTemplate | null>(TEMPLATES[0]);
  const [showDetail, setShowDetail] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<MappingTemplate | null>(null);

  const openDetail = (t: MappingTemplate) => {
    setDetailTemplate(t);
    setShowDetail(true);
  };

  const filtered = TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.source.toLowerCase().includes(search.toLowerCase())
  );

  const renderTransformBadge = (transform?: string) => {
    if (!transform) return <span className="text-muted-foreground">—</span>;
    if (transform === "paise")
      return (
        <span className="bg-warning/10 text-warning text-[10px] px-1.5 py-0.5 rounded border border-warning/20">
          paise
        </span>
      );
    if (transform === "uppercase")
      return (
        <span className="bg-info/10 text-info text-[10px] px-1.5 py-0.5 rounded border border-info/20">
          uppercase
        </span>
      );
    return <span className="text-muted-foreground text-[10px]">{transform}</span>;
  };

  return (
    <BridgeLayout title="Field Mapper" subtitle="Map source fields to Tally Prime fields — build and reuse templates">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="templates">My Templates</TabsTrigger>
          <TabsTrigger value="mapper">Visual Mapper</TabsTrigger>
          <TabsTrigger value="prebuilt">Pre-built</TabsTrigger>
        </TabsList>

        {/* TAB 1 — MY TEMPLATES */}
        <TabsContent value="templates">
          <div className="flex items-center gap-3 mb-4">
            <Input
              placeholder="Search templates..."
              className="w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="ml-auto">
              <Button
                className="bg-gradient-to-r from-primary to-primary/80"
                onClick={() => setTab("mapper")}
              >
                <Plus className="h-4 w-4 mr-1" /> New Template
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => (
                    <TableRow
                      key={t.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => openDetail(t)}
                    >
                      <TableCell>
                        <p className="font-mono text-[10px] text-muted-foreground">{t.id}</p>
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                      </TableCell>
                      <TableCell className="text-xs text-foreground">{t.source}</TableCell>
                      <TableCell className="text-xs text-foreground">{t.target}</TableCell>
                      <TableCell className="font-mono text-sm text-foreground">
                        {t.fieldCount} fields
                      </TableCell>
                      <TableCell className="font-mono text-sm text-foreground">
                        {t.usageCount}×
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {t.lastUsed}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(t)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toast(`${t.name} duplicated`)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => toast("Delete coming soon")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 2 — VISUAL MAPPER */}
        <TabsContent value="mapper">
          {/* Instruction banner */}
          <div className="bg-info/10 border border-info/20 rounded-xl p-3 mb-5 flex items-center">
            <GitBranch className="h-4 w-4 text-info mr-2 shrink-0" />
            <p className="text-xs text-foreground flex-1">
              Select a template from My Templates to edit its field mappings visually.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => setSelectedTemplate(TEMPLATES[0])}
            >
              Load MAP-001
            </Button>
          </div>

          {selectedTemplate ? (
            <>
              <p className="text-sm font-semibold text-foreground mb-1">
                {selectedTemplate.name}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {selectedTemplate.source} → {selectedTemplate.target}
              </p>

              {/* 3-column visual mapper */}
              <div className="grid grid-cols-5 gap-0">
                {/* Left — Tally Prime Fields */}
                <div className="col-span-2">
                  <div className="bg-primary/10 border border-primary/20 rounded-t-xl px-4 py-2.5 flex items-center">
                    <Database className="h-4 w-4 text-primary mr-2" />
                    <span className="text-sm font-semibold text-primary">Tally Prime Source Fields</span>
                  </div>
                  <div className="bg-card border-x border-b border-border rounded-b-xl">
                    {selectedTemplate.mappings.map((m, i) => (
                      <div
                        key={m.id}
                        className={cn(
                          "px-4 py-2.5 flex items-center justify-between",
                          i < selectedTemplate.mappings.length - 1 && "border-b border-border/50"
                        )}
                      >
                        <span className="font-mono text-xs text-foreground">{m.sourceField}</span>
                        {m.required && (
                          <span className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0.5 rounded">
                            required
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Center — Arrows */}
                <div className="col-span-1 flex flex-col items-center">
                  {/* header spacer */}
                  <div className="h-[42px]" />
                  {selectedTemplate.mappings.map((m) => (
                    <div key={m.id} className="h-[41px] flex items-center justify-center">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  ))}
                </div>

                {/* Right — 4DSmartOps Fields */}
                <div className="col-span-2">
                  <div className="bg-success/10 border border-success/20 rounded-t-xl px-4 py-2.5 flex items-center">
                    <Cloud className="h-4 w-4 text-success mr-2" />
                    <span className="text-sm font-semibold text-success">4DSmartOps Target Fields</span>
                  </div>
                  <div className="bg-card border-x border-b border-border rounded-b-xl">
                    {selectedTemplate.mappings.map((m, i) => (
                      <div
                        key={m.id}
                        className={cn(
                          "px-4 py-2.5 flex items-center justify-between",
                          i < selectedTemplate.mappings.length - 1 && "border-b border-border/50"
                        )}
                      >
                        <span className="font-mono text-xs text-foreground">{m.tallyField}</span>
                        {renderTransformBadge(m.transform)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button data-primary
                className="bg-gradient-to-r from-primary to-primary/80 w-full mt-4"
                onClick={() => toast("Field mapping saved")}
              >
                Save Mapping
              </Button>
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No template selected. Load one from My Templates.
            </div>
          )}
        </TabsContent>

        {/* TAB 3 — PRE-BUILT */}
        <TabsContent value="prebuilt">
          <p className="text-sm text-muted-foreground mb-5">
            Ready-to-use mapping templates for common Tally Prime integrations
          </p>

          <div className="space-y-6">
            {PREBUILT_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {cat.category}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {cat.items.map((item) => (
                    <div
                      key={item}
                      className="bg-card border border-border rounded-lg px-3 py-2.5 hover:border-primary/30 cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => toast(`'${item}' template loaded`)}
                    >
                      <span className="text-sm text-foreground">{item}</span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              <span className="font-mono text-lg text-primary">{detailTemplate?.id}</span>
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {detailTemplate?.source} → {detailTemplate?.target}
            </p>
          </SheetHeader>

          {detailTemplate && (
            <div data-keyboard-form className="space-y-5 mt-5">
              {/* Info */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Info</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="text-foreground font-medium">{detailTemplate.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Source</p>
                    <p className="text-foreground">{detailTemplate.source}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="text-foreground">{detailTemplate.target}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fields</p>
                    <p className="font-mono text-foreground">{detailTemplate.fieldCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Usage</p>
                    <p className="font-mono text-foreground">{detailTemplate.usageCount}×</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Used</p>
                    <p className="text-foreground">{detailTemplate.lastUsed}</p>
                  </div>
                </div>
              </div>

              {/* Mappings Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Field Mappings
                </h3>
                <div className="border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Source Field</TableHead>
                        <TableHead className="text-xs">Target Field</TableHead>
                        <TableHead className="text-xs">Transform</TableHead>
                        <TableHead className="text-xs">Required</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailTemplate.mappings.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs">{m.sourceField}</TableCell>
                          <TableCell className="font-mono text-xs">{m.tallyField}</TableCell>
                          <TableCell>{renderTransformBadge(m.transform)}</TableCell>
                          <TableCell>
                            {m.required ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  className="bg-gradient-to-r from-primary to-primary/80 w-full"
                  onClick={() => {
                    setSelectedTemplate(detailTemplate);
                    setTab("mapper");
                    setShowDetail(false);
                  }}
                >
                  Edit in Visual Mapper
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => toast("Template duplicated to My Templates")}
                >
                  Duplicate Template
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-destructive border-destructive/20"
                  onClick={() => toast("Delete coming soon")}
                >
                  Delete Template
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </BridgeLayout>
  );
};

export default FieldMapper;
