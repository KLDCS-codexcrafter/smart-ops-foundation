import { useState } from "react";
import { toast } from "sonner";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// [JWT] Replace with real profile data
const PROFILE = {
  name:                "Rajesh Procurement",
  email:               "rajesh@sharmatraders.in",
  mobile:              "9821234567",
  designation:         "Purchase Manager",
  company:             "Sharma Traders Pvt Ltd",
  gstin:               "27AABCS5678T1ZX",
  pan:                 "AABCS5678T",
  address:             "Plot 12, MIDC Industrial Area",
  city:                "Navi Mumbai",
  state:               "Maharashtra",
  pincode:             "400705",
  creditLimit:         500000,
  paymentTerms:        "NET-30",
  currency:            "INR",
  accountManager:      "Priya Sharma",
  accountManagerEmail: "priya.sharma@reliancedigital.in",
};

function formatINR(paise: number) {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN")}`;
}

export default function Profile() {
  const [saving, setSaving] = useState(false);
  const [invoiceNotif, setInvoiceNotif] = useState(true);
  const [paymentNotif, setPaymentNotif] = useState(true);
  const [statementNotif, setStatementNotif] = useState(true);
  const [promoNotif, setPromoNotif] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated");
    }, 800);
  };

  return (
    <CustomerLayout title="My Profile" subtitle="Account details and preferences">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Details */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Personal Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
                <Input defaultValue={PROFILE.name} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <Input type="email" defaultValue={PROFILE.email} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Mobile</label>
                <Input className="font-mono" defaultValue={PROFILE.mobile} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Designation</label>
                <Input defaultValue={PROFILE.designation} />
              </div>
            </div>
            <Button
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground mt-4"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Business Details */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Business Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Name</label>
                <Input readOnly value={PROFILE.company} className="bg-muted/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">GSTIN</label>
                  <Input readOnly value={PROFILE.gstin} className="font-mono uppercase bg-muted/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">PAN</label>
                  <Input readOnly value={PROFILE.pan} className="font-mono uppercase bg-muted/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
                <Textarea readOnly rows={2} value={PROFILE.address} className="bg-muted/20" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
                  <Input readOnly value={PROFILE.city} className="bg-muted/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
                  <Input readOnly value={PROFILE.state} className="bg-muted/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Pincode</label>
                  <Input readOnly value={PROFILE.pincode} className="font-mono bg-muted/20" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              To update business details, contact your account manager.
            </p>
          </div>

          {/* Communication Preferences */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Notifications</p>
            <div className="space-y-4">
              {[
                { label: "Invoice notifications", desc: "Email when new invoice raised", checked: invoiceNotif, onChange: setInvoiceNotif },
                { label: "Payment confirmations", desc: "Email when payment recorded", checked: paymentNotif, onChange: setPaymentNotif },
                { label: "Statement ready", desc: "Monthly statement notification", checked: statementNotif, onChange: setStatementNotif },
                { label: "Promotional updates", desc: "New products and offers", checked: promoNotif, onChange: setPromoNotif },
              ].map((pref) => (
                <div key={pref.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <Switch checked={pref.checked} onCheckedChange={pref.onChange} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Account Info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Account Information</p>
            <div className="space-y-0">
              {[
                { label: "Customer Code", value: "CUST-0091", className: "font-mono text-xs text-primary" },
                { label: "Credit Limit", value: formatINR(PROFILE.creditLimit), className: "font-mono text-xs text-success" },
                { label: "Payment Terms", value: PROFILE.paymentTerms, className: "font-mono text-xs" },
                { label: "Currency", value: PROFILE.currency, className: "font-mono text-xs" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={row.className}>{row.value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border/50 mt-3 pt-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your Account Manager</p>
              <p className="text-sm font-semibold text-foreground">{PROFILE.accountManager}</p>
              <p className="text-xs text-primary">{PROFILE.accountManagerEmail}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => toast(`Opening email to ${PROFILE.accountManagerEmail}...`)}
              >
                Contact Manager
              </Button>
            </div>
          </div>

          {/* Security */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Security</p>
            <Button
              variant="outline"
              className="w-full mb-2"
              onClick={() => toast(`Password reset email sent to ${PROFILE.email}`)}
            >
              Change Password
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toast("Session management coming soon")}
            >
              Active Sessions
            </Button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
