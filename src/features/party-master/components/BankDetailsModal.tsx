/**
 * @file     BankDetailsModal.tsx
 * @purpose  Bank-account editor with IFSC auto-fill. Edits the optional bankAccounts[] field.
 * @sprint   T-H1.5-C-S4
 */
import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Search } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useIfscLookup } from '../hooks/useIfscLookup';
import type { BankAccount } from '../lib/party-tree-builder';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: BankAccount[];
  onSave: (next: BankAccount[]) => void;
}

export function BankDetailsModal({ open, onOpenChange, accounts, onSave }: Props) {
  const [draft, setDraft] = useState<BankAccount[]>(accounts);
  const { lookup, loading } = useIfscLookup();
  useEffect(() => { if (open) setDraft(accounts); }, [open, accounts]);

  const upd = (idx: number, patch: Partial<BankAccount>) =>
    setDraft(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));

  const add = () => setDraft(prev => [...prev, {
    id: `bk-${Date.now()}`, accountHolderName: '', accountNumber: '',
    ifscCode: '', bankName: '', branchName: '',
    accountType: 'current', isPrimary: prev.length === 0,
  }]);

  const remove = (idx: number) => setDraft(prev => prev.filter((_, i) => i !== idx));

  const fetchIfsc = async (idx: number) => {
    const ifsc = draft[idx].ifscCode;
    if (!ifsc) { toast.error('Enter IFSC first'); return; }
    const res = await lookup(ifsc);
    if (res) {
      upd(idx, { bankName: res.bankName, branchName: res.branchName });
      toast.success(`Resolved: ${res.bankName} · ${res.branchName}`);
    } else {
      toast.error('IFSC not found — fill bank name manually');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bank Details</DialogTitle>
          <DialogDescription>Add bank accounts with IFSC auto-fill.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {draft.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-6">No bank accounts yet.</div>
          )}
          {draft.map((a, idx) => (
            <div key={a.id} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-[10px]">Account Holder Name</Label>
                  <Input value={a.accountHolderName} onChange={e => upd(idx, { accountHolderName: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Account Number</Label>
                  <Input value={a.accountNumber} onChange={e => upd(idx, { accountNumber: e.target.value })} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <Label className="text-[10px]">Account Type</Label>
                  <Select value={a.accountType} onValueChange={(v) => upd(idx, { accountType: v as BankAccount['accountType'] })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="od">Overdraft</SelectItem>
                      <SelectItem value="cc">Cash Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">IFSC Code</Label>
                  <div className="flex gap-1">
                    <Input value={a.ifscCode}
                      onChange={e => upd(idx, { ifscCode: e.target.value.toUpperCase() })}
                      className="h-8 text-xs font-mono" maxLength={11} />
                    <Button size="sm" variant="outline" type="button" onClick={() => fetchIfsc(idx)}
                      disabled={loading} className="h-8 px-2">
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">Bank Name</Label>
                  <Input value={a.bankName} onChange={e => upd(idx, { bankName: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Branch</Label>
                  <Input value={a.branchName} onChange={e => upd(idx, { branchName: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={a.isPrimary}
                    onCheckedChange={v => setDraft(prev => prev.map((x, i) => ({ ...x, isPrimary: i === idx ? v : (v ? false : x.isPrimary) })))} />
                  <Label className="text-[10px]">Primary account</Label>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(idx)} className="h-7 text-[10px] text-destructive gap-1">
                  <Trash2 className="h-3 w-3" /> Remove
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={add} className="w-full gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add Bank Account
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-primary onClick={() => { onSave(draft); onOpenChange(false); }}>Save Bank Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
