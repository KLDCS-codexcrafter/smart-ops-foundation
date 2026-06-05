/**
 * @file        src/pages/erp/webstorex/commerce/GiftVouchersPage.tsx
 * @sprint      Sprint 150 · T-WebStoreX-A11.2 · DP-WS-19.3 · APPEND-ONLY
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listVouchers, issueVoucher, getVoucherBalance, redeemVoucher,
  listCreditEntries, issueCredit, redeemCredit, getCreditBalance,
} from '@/lib/webstorex-commerce-engine';
import type { WsGiftVoucher, WsCreditEntry } from '@/types/webstorex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

function suggestCode(): string {
  return 'GV-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function GiftVouchersPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [issueOpen, setIssueOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  const vouchers = useMemo<WsGiftVoucher[]>(
    () => entityCode ? listVouchers(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );
  const credits = useMemo<WsCreditEntry[]>(
    () => entityCode ? listCreditEntries(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  const partyBalances = useMemo(() => {
    if (!entityCode) return [];
    const ids = Array.from(new Set(credits.map(c => c.partyId)));
    return ids.map(id => ({ id, balance: getCreditBalance(entityCode, id) }));
  }, [credits, entityCode]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <h1 className="text-xl font-semibold">Vouchers & Store Credit</h1>

      <Tabs defaultValue="vouchers">
        <TabsList>
          <TabsTrigger value="vouchers">Gift Vouchers</TabsTrigger>
          <TabsTrigger value="credit">Store Credit</TabsTrigger>
        </TabsList>

        <TabsContent value="vouchers" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setIssueOpen(true)}><Plus className="h-4 w-4 mr-1" />Issue voucher</Button>
          </div>
          <Card className="glass-card">
            <CardContent className="p-0">
              {vouchers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No vouchers yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead><TableHead>Initial</TableHead>
                      <TableHead>Balance</TableHead><TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead><TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((v) => {
                      const b = getVoucherBalance(entityCode, v.code);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono">{v.code}</TableCell>
                          <TableCell className="font-mono">₹{v.initialValue}</TableCell>
                          <TableCell className="font-mono">₹{b.balance}</TableCell>
                          <TableCell className="font-mono text-xs">{v.expiresAt?.slice(0, 10) ?? '—'}</TableCell>
                          <TableCell><Badge variant={b.expired ? 'destructive' : 'default'}>{b.expired ? 'Expired' : 'Active'}</Badge></TableCell>
                          <TableCell>
                            <RedeemButton entityCode={entityCode} code={v.code} onDone={reload} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setCreditOpen(true)}><Plus className="h-4 w-4 mr-1" />Issue credit</Button>
          </div>
          <Card className="glass-card">
            <CardContent className="p-0">
              {partyBalances.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No credit issued yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Party</TableHead><TableHead>Balance</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {partyBalances.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{p.id}</TableCell>
                        <TableCell className="font-mono">₹{p.balance}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <IssueVoucherDialog open={issueOpen} onOpenChange={setIssueOpen} entityCode={entityCode} onDone={reload} />
      <IssueCreditDialog open={creditOpen} onOpenChange={setCreditOpen} entityCode={entityCode} onDone={reload} />
    </div>
  );
}

function RedeemButton(props: { entityCode: string; code: string; onDone: () => void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');

  const submit = (): void => {
    try {
      redeemVoucher(props.entityCode, props.code, Number(amount), ref || 'manual');
      toast.success('Redeemed');
      setOpen(false); setAmount(''); setRef(''); props.onDone();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Redeem</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redeem voucher {props.code}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Label>Order ref</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Redeem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function IssueVoucherDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; entityCode: string; onDone: () => void }): JSX.Element {
  const [code, setCode] = useState(suggestCode());
  const [value, setValue] = useState('1000');
  const [expiry, setExpiry] = useState('');
  const submit = (): void => {
    try {
      issueVoucher(props.entityCode, {
        code, initialValue: Number(value),
        issuedToPartyId: null, expiresAt: expiry ? new Date(expiry).toISOString() : null,
        isActive: true, issuedByUserId: 'system',
      });
      toast.success('Voucher issued');
      props.onOpenChange(false); setCode(suggestCode()); props.onDone();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Issue gift voucher</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <Button variant="outline" size="sm" onClick={() => setCode(suggestCode())}>Suggest</Button>
          </div>
          <div><Label>Value ₹</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          <div><Label>Expires on (optional)</Label><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Issue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueCreditDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; entityCode: string; onDone: () => void }): JSX.Element {
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'issue' | 'redeem'>('issue');
  const submit = (): void => {
    try {
      if (mode === 'issue') issueCredit(props.entityCode, partyId, Number(amount), reason);
      else redeemCredit(props.entityCode, partyId, Number(amount), reason);
      toast.success('Posted'); props.onOpenChange(false);
      setPartyId(''); setAmount(''); setReason(''); props.onDone();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Store credit — {mode}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'issue' | 'redeem')}>
            <TabsList><TabsTrigger value="issue">Issue</TabsTrigger><TabsTrigger value="redeem">Redeem</TabsTrigger></TabsList>
          </Tabs>
          <div><Label>Party ID</Label><Input value={partyId} onChange={(e) => setPartyId(e.target.value)} /></div>
          <div><Label>Amount ₹</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>Reason (mandatory)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Post</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
