import { useState } from "react";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

// [JWT] Replace with real ticket data
const TICKETS = [
  { id: "TKT-C-041", title: "Invoice INV-2026-0389 shows incorrect GST amount", status: "in_progress", priority: "high", created: "01 Apr 2026, 10:00 IST", updated: "02 Apr 2026, 15:00 IST", assignedTo: "Support Team" },
  { id: "TKT-C-038", title: "Request: extend payment terms to NET-45", status: "open", priority: "medium", created: "28 Mar 2026, 14:00 IST", updated: "28 Mar 2026, 14:00 IST", assignedTo: "Unassigned" },
  { id: "TKT-C-031", title: "Duplicate invoice received for ORD-0821", status: "resolved", priority: "high", created: "18 Mar 2026, 09:00 IST", updated: "20 Mar 2026, 11:00 IST", assignedTo: "Accounts Team" },
  { id: "TKT-C-024", title: "Price discrepancy on Widget A — Premium", status: "closed", priority: "medium", created: "05 Mar 2026, 11:00 IST", updated: "07 Mar 2026, 14:00 IST", assignedTo: "Sales Team" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:        { label: "Open",        color: "bg-primary/10 text-primary border-primary/20" },
  in_progress: { label: "In Progress", color: "bg-warning/10 text-warning border-warning/20" },
  resolved:    { label: "Resolved",    color: "bg-success/10 text-success border-success/20" },
  closed:      { label: "Closed",      color: "bg-secondary text-muted-foreground border-border" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: "Low",    color: "bg-secondary text-muted-foreground" },
  medium: { label: "Medium", color: "bg-warning/10 text-warning" },
  high:   { label: "High",   color: "bg-destructive/10 text-destructive" },
};

export default function CustomerSupport() {
  const [submitting, setSubmitting] = useState(false);

  const activeCount = TICKETS.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const openCount = TICKETS.filter((t) => t.status === "open").length;
  const inProgressCount = TICKETS.filter((t) => t.status === "in_progress").length;
  const resolvedCount = TICKETS.filter((t) => t.status === "resolved").length;

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("TKT-C-042 created — we'll respond within 24 hours");
    }, 1000);
  };

  return (
    <CustomerLayout title="Support" subtitle="Raise and track support requests">
      <Tabs defaultValue="tickets">
        <TabsList className="mb-6">
          <TabsTrigger value="tickets">My Tickets ({activeCount})</TabsTrigger>
          <TabsTrigger value="new">New Ticket</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          {/* Mini stat cards */}
          <div className="flex flex-wrap gap-4 mb-4">
            {[
              { label: "Open", value: openCount, color: "text-primary" },
              { label: "In Progress", value: inProgressCount, color: "text-warning" },
              { label: "Resolved", value: resolvedCount, color: "text-success" },
              { label: "Total", value: TICKETS.length, color: "text-foreground" },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl px-4 py-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn("font-mono text-lg font-bold", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Ticket list */}
          <div className="space-y-3">
            {TICKETS.map((ticket) => (
              <div key={ticket.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-primary">{ticket.id}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded", PRIORITY_CONFIG[ticket.priority].color)}>
                    {PRIORITY_CONFIG[ticket.priority].label}
                  </span>
                  <span className={cn("text-xs border rounded-lg px-2 py-0.5", STATUS_CONFIG[ticket.status].color)}>
                    {STATUS_CONFIG[ticket.status].label}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground mt-1">{ticket.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assigned: {ticket.assignedTo} • Updated: {ticket.updated}
                </p>
                <Button variant="ghost" size="sm" className="text-xs mt-1 px-0" onClick={() => toast("Ticket detail view coming soon")}>
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="new">
          <div className="max-w-xl space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject *</label>
              <Input placeholder="Brief description of your issue" onKeyDown={onEnterNext} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <Select defaultValue="invoice_query">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice_query">Invoice Query</SelectItem>
                  <SelectItem value="payment_issue">Payment Issue</SelectItem>
                  <SelectItem value="order_problem">Order Problem</SelectItem>
                  <SelectItem value="price_discrepancy">Price Discrepancy</SelectItem>
                  <SelectItem value="general">General Query</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <Select defaultValue="medium">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Related Invoice (optional)</label>
              <Input className="font-mono" placeholder="INV-2026-XXXX" onKeyDown={onEnterNext} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Related Order (optional)</label>
              <Input className="font-mono" placeholder="ORD-XXXX" onKeyDown={onEnterNext} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description *</label>
              <Textarea rows={5} placeholder="Describe your issue in detail..." />
            </div>
            <p className="text-xs text-muted-foreground">
              For file attachments, email support@company.in
            </p>
            <Button data-primary
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </CustomerLayout>
  );
}
