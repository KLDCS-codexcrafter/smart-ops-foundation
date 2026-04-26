/**
 * @file     MockAuthDevPanel.tsx
 * @purpose  Phase 1 dev-only UI for switching the active mock user.
 *           Replaced in Phase 2 by real auth login flow.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Z3
 * @iso      Maintainability (HIGH+ explicit Phase 2 removal marker)
 * @whom     Operix dev team (Phase 1) · removed in Phase 2
 * @depends  auth-helpers.ts
 *
 * PHASE 2 REMOVE: This file + its route entry are removed when real auth lands in Phase 2.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RadioGroup, RadioGroupItem,
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  getCurrentUser, setCurrentUser, clearCurrentUser, type MockUser,
} from '@/lib/auth-helpers';

const DEMO_USERS: MockUser[] = [
  { id: 'admin', displayName: 'Admin User', role: 'admin' },
  { id: 'accountant1', displayName: 'Accountant Alpha', role: 'accountant' },
  { id: 'auditor1', displayName: 'Auditor External', role: 'auditor' },
  { id: 'dataentry1', displayName: 'Data Entry Beta', role: 'data-entry' },
];

export default function MockAuthDevPanel() {
  const navigate = useNavigate();
  const [active, setActive] = useState<MockUser>(getCurrentUser());
  const [selectedId, setSelectedId] = useState<string>(active.id);

  useEffect(() => {
    setActive(getCurrentUser());
  }, []);

  const handleSet = (): void => {
    const next = DEMO_USERS.find(u => u.id === selectedId);
    if (!next) {
      toast.error('Pick a user first');
      return;
    }
    setCurrentUser(next);
    setActive(next);
    toast.success(`Active user: ${next.displayName}`);
  };

  const handleClear = (): void => {
    clearCurrentUser();
    setActive(getCurrentUser());
    toast.success('Mock user cleared');
    navigate('/erp/dashboard');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Mock Auth Dev Panel
        </h1>
        <p className="text-sm text-muted-foreground">
          Switch the active mock user used for voucher <span className="font-mono">created_by</span> attribution.
        </p>
        <Badge variant="outline" className="mt-2 bg-warning/10 text-warning border-warning/30">
          <ShieldAlert className="h-3 w-3 mr-1" /> Phase 1 Only — removed in Phase 2 real auth
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            Active User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-mono font-semibold text-foreground">{active.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Display name</span>
            <span className="font-mono text-foreground">{active.displayName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="font-mono text-foreground">{active.role ?? '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Switch User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedId} onValueChange={setSelectedId} className="space-y-2">
            {DEMO_USERS.map(u => (
              <div
                key={u.id}
                className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors"
              >
                <RadioGroupItem value={u.id} id={`user-${u.id}`} />
                <Label htmlFor={`user-${u.id}`} className="flex-1 cursor-pointer">
                  <div className="font-mono text-sm font-semibold text-foreground">{u.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.displayName} · <span className="font-mono">{u.role}</span>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex gap-2">
            <Button onClick={handleSet}>
              <User className="h-4 w-4 mr-2" /> Set User
            </Button>
            <Button variant="outline" onClick={handleClear}>
              <LogOut className="h-4 w-4 mr-2" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
