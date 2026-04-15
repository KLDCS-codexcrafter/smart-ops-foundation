import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

// [JWT] Replace with real payment data
const PAYMENT_HISTORY = [
  { id: "PAY-0412", date: "28 Mar 2026", amount: 120000, method: "NEFT", ref: "NEFT2026032800123", invoices: ["INV-2026-0334"], status: "cleared" },
  { id: "PAY-0389", date: "10 Mar 2026", amount: 45000,  method: "UPI",  ref: "UPI/2026/031000456", invoices: ["INV-2026-0298"],  status: "cleared" },
  { id: "PAY-0361", date: "18 Feb 2026", amount: 67800,  method: "IMPS", ref: "IMPS20260218005678",  invoices: ["INV-2026-0271"], status: "cleared" },
  { id: "PAY-0334", date: "02 Feb 2026", amount: 38500,  method: "NEFT", ref: "NEFT2026020200789",   invoices: ["INV-2026-0240"], status: "cleared" },
];

const UNPAID_INVOICES = [
  { id: "INV-2026-0412", amount: 84000,  dueDate: "15 Apr 2026", overdue: false },
  { id: "INV-2026-0389", amount: 54500,  dueDate: "05 Apr 2026", overdue: true },
];

function formatINR(paise: number) {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

export default function Payments() {
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>(["INV-2026-0412", "INV-2026-0389"]);
  const [method, setMethod] = useState("neft");
  const [txnRef, setTxnRef] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [payDate, setPayDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedTotal = UNPAID_INVOICES
    .filter((i) => selectedInvoices.includes(i.id))
    .reduce((s, i) => s + i.amount, 0);

  const toggleInvoice = (id: string) =>
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Payment recorded — awaiting confirmation");
    }, 1000);
  };

  return (
    <CustomerLayout title="Payments" subtitle="Payment history and make a payment"><div data-keyboard-form>
      <Tabs defaultValue="make">
        <TabsList className="mb-6">
          <TabsTrigger value="make">Make Payment</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="make">
          {/* Outstanding summary */}
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-5">
            <p className="font-mono text-lg font-bold text-warning">
              Total Outstanding: {formatINR(UNPAID_INVOICES.reduce((s, i) => s + i.amount, 0))}
            </p>
            <p className="text-xs text-muted-foreground">
              {UNPAID_INVOICES.length} unpaid invoices — including {UNPAID_INVOICES.filter((i) => i.overdue).length} overdue
            </p>
          </div>

          <div className="space-y-4">
            {/* Select invoices */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Select Invoices</p>
              {UNPAID_INVOICES.map((inv) => (
                <label key={inv.id} className="flex items-center gap-3 py-2 cursor-pointer">
                  <Checkbox
                    checked={selectedInvoices.includes(inv.id)}
                    onCheckedChange={() => toggleInvoice(inv.id)}
                  />
                  <span className="font-mono text-xs text-primary">{inv.id}</span>
                  <span className="text-xs text-muted-foreground">—</span>
                  <span className="font-mono text-sm font-semibold">{formatINR(inv.amount)}</span>
                  <span className="text-xs text-muted-foreground">— Due {inv.dueDate}</span>
                  {inv.overdue && <span className="text-xs text-destructive font-medium">OVERDUE</span>}
                </label>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Amount</label>
              <Input type="number" className="font-mono" value={selectedTotal / 100} readOnly onKeyDown={onEnterNext} />
              <p className="text-xs text-muted-foreground mt-1">Amount in ₹</p>
            </div>

            {/* Method */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Method</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="neft">NEFT</SelectItem>
                  <SelectItem value="imps">IMPS</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional reference fields */}
            {(method === "neft" || method === "imps") && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Transaction Reference</label>
                <Input className="font-mono" placeholder="NEFT2026040300123" value={txnRef} onChange={(e) => setTxnRef(e.target.value)} />
              </div>
            )}
            {method === "upi" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">UPI Transaction ID</label>
                <Input className="font-mono" placeholder="UPI/2026/040300456" value={txnRef} onChange={(e) => setTxnRef(e.target.value)} />
              </div>
            )}
            {method === "cheque" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Cheque Number</label>
                  <Input className="font-mono" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Bank Name</label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
              </>
            )}

            {/* Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Date</label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>

            {/* Remarks */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Remarks (optional)</label>
              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>

            {/* Bank details */}
            <div className="bg-muted/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Pay to (NEFT/IMPS/Cheque):</p>
              <p className="text-sm text-foreground">Account Name: Reliance Digital Solutions Pvt Ltd</p>
              <p className="text-sm font-mono text-foreground">Account No: 50200012345678</p>
              <p className="text-sm font-mono text-foreground">IFSC: HDFC0001234</p>
              <p className="text-sm text-foreground">Bank: HDFC Bank, Mumbai</p>
            </div>

            <Button data-primary
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Payment"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Pay ID</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                  <TableHead className="text-xs">Invoices</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PAYMENT_HISTORY.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-primary">{p.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.date}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-success">{formatINR(p.amount)}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{p.method}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">{p.ref}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.invoices.join(", ")}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-success/10 text-success border border-success/20 rounded-lg px-2 py-0.5">
                        Cleared
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast(`Downloading receipt ${p.id}...`)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div></CustomerLayout>
  );
}
