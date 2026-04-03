

## Fix Control Tower Dashboard

The current `src/pages/tower/Dashboard.tsx` still has the old simple 4-stat + activity list layout. It needs to be replaced with the full dashboard from the reference project [SmartOps Control](/projects/fbb648f5-7864-4531-97a6-45d9a84d673d).

### What changes

**File: `src/pages/tower/Dashboard.tsx`** — Full rewrite to match the reference dashboard:

1. **4 Stat Cards row** — Total Tenants (142), Active Tenants (118), Trial Tenants (19), Monthly Revenue (₹18.4L) with colored icons via a local `StatCard` component
2. **3 Metric Cards row** — New This Month (bar chart via recharts), Churned This Month, Avg Health Score (progress bar with gradient)
3. **System Health strip** — API Status (badge), Database Health (3 regions with uptimes), Bridge Agents Online count
4. **Alerts section** — 3 alert cards (Churn Risk, Payment Failures, Trial Expiring) with color-coded borders/backgrounds
5. **Recent Activity table** — 10-row table with Tenant, Action, Time columns using Indian company names (Reliance, Tata, Infosys, etc.)

Adapts the reference code to use our `AppLayout` wrapper (with `title="Control Tower"` and `breadcrumbs`), and uses our existing `Card`, `Table`, `Badge` components from `src/components/ui/`.

Removes old imports (`formatCurrency`, `Package`, `Truck`) and adds new ones (`Building2`, `CheckCircle2`, `Clock`, `Activity`, `Server`, `Database`, `Wifi`, `XCircle`, `Timer`, recharts components).

