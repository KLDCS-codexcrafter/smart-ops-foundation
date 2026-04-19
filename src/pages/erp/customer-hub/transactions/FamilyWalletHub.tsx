/**
 * FamilyWalletHub.tsx — Sprint 13c · Module ch-t-family-wallet
 * Out-of-box #4. Family linking + point transfers + 24h undo.
 * Teal-500 accent.
 */

import { useEffect, useMemo, useState } from 'react';
import { Heart, Users, Send, Plus, Undo2, Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import { formatINR } from '@/lib/india-validations';
import {
  familyLinksKey, familyTransfersKey,
  type FamilyLink, type FamilyTransfer,
  MIN_TRANSFER_POINTS, UNDO_WINDOW_HOURS,
} from '@/types/family-wallet';
import {
  attemptLink, attemptTransfer, attemptUndo,
} from '@/lib/family-wallet-engine';
import {
  loyaltyLedgerKey, loyaltyStateKey,
  type CustomerLoyaltyState, type LoyaltyLedgerEntry,
} from '@/types/customer-loyalty';
import { rebuildState } from '@/lib/loyalty-engine';
import { logAudit } from '@/lib/card-audit-engine';

const ENTITY = 'SMRT';

interface CustomerLite {
  id: string;
  legalName?: string;
  partyName?: string;
}

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

function getCurrentCustomerId(): string {
  try {
    const raw = localStorage.getItem('4ds_login_credential');
    if (!raw) return 'cust-demo';
    const p = JSON.parse(raw);
    return `cust-${p.value ?? 'demo'}`;
  } catch { return 'cust-demo'; }
}

function loadCustomers(): CustomerLite[] {
  try {
    const raw = localStorage.getItem('erp_group_customer_master');
    if (raw) return JSON.parse(raw) as CustomerLite[];
  } catch { /* ignore */ }
  return [];
}

function customerLabel(c: CustomerLite): string {
  return c.legalName ?? c.partyName ?? c.id;
}

/** Seed 1 demo link + 1 demo transfer on first run. */
function seedDemoIfEmpty(currentId: string, currentName: string): void {
  const existing = ls<FamilyLink>(familyLinksKey(ENTITY));
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const undoUntil = new Date(Date.now() + UNDO_WINDOW_HOURS * 3_600_000).toISOString();

  const demoLink: FamilyLink = {
    id: 'fl-demo-001',
    entity_id: ENTITY,
    primary_customer_id: currentId,
    linked_customer_id: 'cust-sharma-family',
    linked_name: 'Sharma Family Member',
    relationship: 'spouse',
    status: 'active',
    linked_at: now,
    ended_at: null,
    created_by: currentName,
  };
  setLs(familyLinksKey(ENTITY), [demoLink]);

  const demoTransfer: FamilyTransfer = {
    id: 'ft-demo-001',
    entity_id: ENTITY,
    from_customer_id: currentId,
    from_name: currentName,
    to_customer_id: 'cust-sharma-family',
    to_name: 'Sharma Family Member',
    points: 250,
    gift_message: 'Happy birthday! Use these on your next order.',
    status: 'completed',
    transferred_at: now,
    undo_until: undoUntil,
    undone_at: null,
  };
  setLs(familyTransfersKey(ENTITY), [demoTransfer]);
}

const RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other'] as const;

export function FamilyWalletHubPanel() {
  const currentId = getCurrentCustomerId();
  const customers = useMemo(() => loadCustomers(), []);
  const currentName = useMemo(() => {
    const c = customers.find(x => x.id === currentId);
    return c ? customerLabel(c) : currentId;
  }, [customers, currentId]);

  const [links, setLinks] = useState<FamilyLink[]>(() => ls<FamilyLink>(familyLinksKey(ENTITY)));
  const [transfers, setTransfers] = useState<FamilyTransfer[]>(() => ls<FamilyTransfer>(familyTransfersKey(ENTITY)));
  const [loyaltyState, setLoyaltyState] = useState<CustomerLoyaltyState | null>(null);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkPick, setLinkPick] = useState<string>('');
  const [linkRel, setLinkRel] = useState<typeof RELATIONSHIPS[number]>('spouse');

  const [transferTo, setTransferTo] = useState<string>('');
  const [transferPoints, setTransferPoints] = useState<number>(0);
  const [transferMsg, setTransferMsg] = useState<string>('');

  // Seed + hydrate loyalty
  useEffect(() => {
    seedDemoIfEmpty(currentId, currentName);
    setLinks(ls<FamilyLink>(familyLinksKey(ENTITY)));
    setTransfers(ls<FamilyTransfer>(familyTransfersKey(ENTITY)));
    const ledger = ls<LoyaltyLedgerEntry>(loyaltyLedgerKey(ENTITY));
    const states = ls<CustomerLoyaltyState>(loyaltyStateKey(ENTITY));
    const prev = states.find(s => s.customer_id === currentId) ?? null;
    setLoyaltyState(rebuildState(currentId, ENTITY, ledger, prev));
  }, [currentId, currentName]);

  const myActiveLinks = useMemo(
    () => links.filter(l =>
      l.status === 'active' &&
      (l.primary_customer_id === currentId || l.linked_customer_id === currentId)),
    [links, currentId],
  );

  const myRecentTransfers = useMemo(
    () => transfers
      .filter(t => t.from_customer_id === currentId || t.to_customer_id === currentId)
      .sort((a, b) => b.transferred_at.localeCompare(a.transferred_at))
      .slice(0, 10),
    [transfers, currentId],
  );

  const linkableCustomers = useMemo(() => {
    const linkedIds = new Set<string>();
    for (const l of myActiveLinks) {
      linkedIds.add(l.primary_customer_id);
      linkedIds.add(l.linked_customer_id);
    }
    return customers.filter(c => c.id !== currentId && !linkedIds.has(c.id));
  }, [customers, myActiveLinks, currentId]);

  const balance = loyaltyState?.points_balance ?? 0;

  const handleAddMember = () => {
    if (!linkPick) {
      toast.error('Pick a customer to link');
      return;
    }
    const target = customers.find(c => c.id === linkPick);
    if (!target) return;
    const result = attemptLink(currentId, linkPick, customerLabel(target), linkRel, ENTITY, links, currentName);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    const next = [...links, result.link];
    setLinks(next);
    setLs(familyLinksKey(ENTITY), next);
    logAudit({
      entityCode: ENTITY, userId: currentId, userName: currentName,
      cardId: 'customer-hub', moduleId: 'ch-t-family-wallet',
      action: 'master_save',
      refType: 'family_link', refId: result.link.id,
      refLabel: `${currentName} → ${result.link.linked_name} (${linkRel})`,
    });
    toast.success(`Linked ${result.link.linked_name}`);
    setLinkDialogOpen(false);
    setLinkPick(''); setLinkRel('spouse');
  };

  const handleUnlink = (linkId: string) => {
    if (!confirm('End this family link? Points already transferred remain.')) return;
    const next = links.map(l =>
      l.id === linkId ? { ...l, status: 'ended' as const, ended_at: new Date().toISOString() } : l);
    setLinks(next);
    setLs(familyLinksKey(ENTITY), next);
    logAudit({
      entityCode: ENTITY, userId: currentId, userName: currentName,
      cardId: 'customer-hub', moduleId: 'ch-t-family-wallet',
      action: 'master_save',
      refType: 'family_link', refId: linkId,
      refLabel: 'Link ended',
    });
    toast.success('Link ended');
  };

  const handleTransfer = () => {
    if (!transferTo || transferPoints <= 0) {
      toast.error('Pick a recipient and points');
      return;
    }
    const linkRow = myActiveLinks.find(l =>
      (l.primary_customer_id === currentId && l.linked_customer_id === transferTo) ||
      (l.linked_customer_id === currentId  && l.primary_customer_id === transferTo));
    if (!linkRow) {
      toast.error('No active link with recipient');
      return;
    }
    const recipientName = linkRow.linked_customer_id === transferTo
      ? linkRow.linked_name
      : (customers.find(c => c.id === transferTo)?.legalName ?? transferTo);

    const result = attemptTransfer(
      currentId, currentName, balance,
      transferTo, recipientName,
      transferPoints, transferMsg.slice(0, 140),
      ENTITY, links,
    );
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    const nextTransfers = [...transfers, result.transfer];
    setTransfers(nextTransfers);
    setLs(familyTransfersKey(ENTITY), nextTransfers);

    const ledger = ls<LoyaltyLedgerEntry>(loyaltyLedgerKey(ENTITY));
    ledger.push(result.fromLedger, result.toLedger);
    setLs(loyaltyLedgerKey(ENTITY), ledger);

    // Rebuild both customers' loyalty states
    const states = ls<CustomerLoyaltyState>(loyaltyStateKey(ENTITY));
    const updateFor = (cid: string) => {
      const prev = states.find(s => s.customer_id === cid) ?? null;
      const fresh = rebuildState(cid, ENTITY, ledger, prev);
      const idx = states.findIndex(s => s.customer_id === cid);
      if (idx >= 0) states[idx] = fresh; else states.push(fresh);
      if (cid === currentId) setLoyaltyState(fresh);
    };
    updateFor(currentId);
    updateFor(transferTo);
    setLs(loyaltyStateKey(ENTITY), states);

    logAudit({
      entityCode: ENTITY, userId: currentId, userName: currentName,
      cardId: 'customer-hub', moduleId: 'ch-t-family-wallet',
      action: 'adjustment',
      refType: 'family_transfer', refId: result.transfer.id,
      refLabel: `${transferPoints} pts → ${recipientName}`,
    });

    toast.success(`Sent ${transferPoints} points to ${recipientName}`);
    setTransferTo(''); setTransferPoints(0); setTransferMsg('');
  };

  const handleUndo = (transferId: string) => {
    const result = attemptUndo(transferId, transfers);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    const nextTransfers = transfers.map(t => t.id === transferId ? result.reversedTransfer : t);
    setTransfers(nextTransfers);
    setLs(familyTransfersKey(ENTITY), nextTransfers);

    const ledger = ls<LoyaltyLedgerEntry>(loyaltyLedgerKey(ENTITY));
    ledger.push(result.reversalFrom, result.reversalTo);
    setLs(loyaltyLedgerKey(ENTITY), ledger);

    const states = ls<CustomerLoyaltyState>(loyaltyStateKey(ENTITY));
    const updateFor = (cid: string) => {
      const prev = states.find(s => s.customer_id === cid) ?? null;
      const fresh = rebuildState(cid, ENTITY, ledger, prev);
      const idx = states.findIndex(s => s.customer_id === cid);
      if (idx >= 0) states[idx] = fresh; else states.push(fresh);
      if (cid === currentId) setLoyaltyState(fresh);
    };
    updateFor(result.reversedTransfer.from_customer_id);
    updateFor(result.reversedTransfer.to_customer_id);
    setLs(loyaltyStateKey(ENTITY), states);

    logAudit({
      entityCode: ENTITY, userId: currentId, userName: currentName,
      cardId: 'customer-hub', moduleId: 'ch-t-family-wallet',
      action: 'adjustment',
      refType: 'family_transfer_undo', refId: transferId,
      refLabel: `Undid ${result.reversedTransfer.points} pts`,
    });

    toast.success('Transfer undone — points restored');
  };

  const isUndoable = (t: FamilyTransfer): boolean =>
    t.status === 'completed' && new Date(t.undo_until).getTime() > Date.now();

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      <header>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Heart className="h-5 w-5 text-teal-500" />
          Family Wallet
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Link family members · share loyalty points · undo transfers within {UNDO_WINDOW_HOURS}h
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT — LINKS */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-500" />
              <h2 className="text-sm font-semibold">My Family</h2>
            </div>
            <Button
              size="sm"
              onClick={() => setLinkDialogOpen(true)}
              className="h-8 gap-1 bg-teal-500 hover:bg-teal-600 text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add Member
            </Button>
          </div>

          {myActiveLinks.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                Link family members to share loyalty points.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {myActiveLinks.map(l => {
                const otherName = l.primary_customer_id === currentId
                  ? l.linked_name
                  : (customers.find(c => c.id === l.primary_customer_id)?.legalName ?? l.primary_customer_id);
                return (
                  <div
                    key={l.id}
                    className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{otherName}</p>
                        <Badge variant="outline" className="text-[9px] capitalize border-teal-500/30 text-teal-700 dark:text-teal-300">
                          {l.relationship}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Active since {new Date(l.linked_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => handleUnlink(l.id)}
                      className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" /> Unlink
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* RIGHT — TRANSFERS */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-teal-500" />
              <h2 className="text-sm font-semibold">Transfer Points</h2>
            </div>
            <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-700 dark:text-teal-300">
              Balance: {balance.toLocaleString('en-IN')}
            </Badge>
          </div>

          {myActiveLinks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Link a family member first to send points.
            </p>
          ) : (
            <div className="space-y-2">
              <div>
                <Label className="text-[11px]">To</Label>
                <Select value={transferTo} onValueChange={setTransferTo}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick member..." /></SelectTrigger>
                  <SelectContent>
                    {myActiveLinks.map(l => {
                      const otherId = l.primary_customer_id === currentId ? l.linked_customer_id : l.primary_customer_id;
                      const otherName = l.primary_customer_id === currentId
                        ? l.linked_name
                        : (customers.find(c => c.id === l.primary_customer_id)?.legalName ?? l.primary_customer_id);
                      return (
                        <SelectItem key={otherId} value={otherId}>{otherName}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Points (min {MIN_TRANSFER_POINTS})</Label>
                <Input
                  type="number" min={MIN_TRANSFER_POINTS} max={balance}
                  value={transferPoints || ''}
                  onChange={e => setTransferPoints(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">Gift message (optional)</Label>
                <Textarea
                  value={transferMsg}
                  onChange={e => setTransferMsg(e.target.value.slice(0, 140))}
                  placeholder="Treat yourself..."
                  className="text-xs min-h-[60px]"
                  maxLength={140}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                  {transferMsg.length}/140
                </p>
              </div>
              <Button
                onClick={handleTransfer}
                disabled={!transferTo || transferPoints < MIN_TRANSFER_POINTS}
                className="w-full h-9 text-xs gap-1.5 bg-teal-500 hover:bg-teal-600 text-white"
              >
                <Send className="h-3.5 w-3.5" /> Send Points
              </Button>
            </div>
          )}

          <div className="pt-3 border-t">
            <p className="text-[11px] font-semibold mb-2">Recent transfers</p>
            {myRecentTransfers.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No transfers yet.</p>
            ) : (
              <div className="space-y-1.5">
                {myRecentTransfers.map(t => {
                  const outgoing = t.from_customer_id === currentId;
                  const peer = outgoing ? t.to_name : t.from_name;
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-[11px] py-1 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="truncate">
                          <span className={outgoing ? 'text-amber-600' : 'text-emerald-600'}>
                            {outgoing ? '→' : '←'}
                          </span>{' '}
                          {peer} · <span className="font-mono font-semibold">{t.points}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(t.transferred_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            t.status === 'completed' ? 'border-teal-500/30 text-teal-700 dark:text-teal-300' :
                            t.status === 'undone'    ? 'border-amber-500/30 text-amber-700 dark:text-amber-300' :
                                                       'border-muted text-muted-foreground'
                          }`}
                        >
                          {t.status}
                        </Badge>
                        {outgoing && isUndoable(t) && (
                          <Button
                            size="sm" variant="outline"
                            onClick={() => handleUndo(t.id)}
                            className="h-6 text-[10px] gap-1 border-teal-500/40 text-teal-700 dark:text-teal-300"
                          >
                            <Undo2 className="h-3 w-3" /> Undo
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Liability ≈ {formatINR(balance * 10)} on your balance.
      </p>

      {/* ADD MEMBER DIALOG */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px]">Customer</Label>
              <Select value={linkPick} onValueChange={setLinkPick}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={linkableCustomers.length === 0 ? 'No eligible customers' : 'Pick customer...'} />
                </SelectTrigger>
                <SelectContent>
                  {linkableCustomers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{customerLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Relationship</Label>
              <Select value={linkRel} onValueChange={(v) => setLinkRel(v as typeof RELATIONSHIPS[number])}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddMember}
              disabled={!linkPick}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              Link Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FamilyWalletHubPanel;
