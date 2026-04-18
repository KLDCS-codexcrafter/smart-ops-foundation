/**
 * CampaignMaster.tsx — CRUD for marketing campaigns
 * Sprint 3 SalesX.
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { Campaign, CampaignStatus } from '@/types/campaign';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

interface FormState {
  campaign_code: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  budget: string;
  status: CampaignStatus;
  description: string;
  is_active: boolean;
  editingId: string | null;
}

const todayISO = () => new Date().toISOString().split('T')[0];

const BLANK: FormState = {
  campaign_code: '',
  campaign_name: '',
  start_date: todayISO(),
  end_date: '',
  budget: '',
  status: 'planned',
  description: '',
  is_active: true,
  editingId: null,
};

const STATUS_COLOR: Record<CampaignStatus, string> = {
  planned: 'bg-muted text-muted-foreground border-border',
  active: 'bg-green-500/15 text-green-700 border-green-500/30',
  completed: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function CampaignMasterPanel({ entityCode }: Props) {
  const { campaigns, saveCampaign, deleteCampaign } = useCampaigns(entityCode);
  const [form, setForm] = useState<FormState>(BLANK);

  const handleSave = useCallback(() => {
    if (!form.campaign_code.trim()) { toast.error('Campaign code required'); return; }
    if (!form.campaign_name.trim()) { toast.error('Campaign name required'); return; }
    if (!form.start_date) { toast.error('Start date required'); return; }
    if (form.end_date && form.end_date < form.start_date) {
      toast.error('End date cannot be before start date'); return;
    }
    const dup = campaigns.find(c =>
      c.campaign_code.toUpperCase() === form.campaign_code.toUpperCase() && c.id !== form.editingId);
    if (dup) { toast.error(`Code ${form.campaign_code} already exists`); return; }

    saveCampaign({
      id: form.editingId ?? undefined,
      entity_id: entityCode,
      campaign_code: form.campaign_code.toUpperCase().trim(),
      campaign_name: form.campaign_name.trim(),
      start_date: form.start_date,
      end_date: form.end_date || null,
      budget: form.budget ? Number(form.budget) : null,
      status: form.status,
      description: form.description.trim() || null,
      is_active: form.is_active,
    });
    toast.success(form.editingId ? 'Campaign updated' : 'Campaign added');
    setForm(BLANK);
  }, [form, campaigns, saveCampaign, entityCode]);

  const isFormActive = !!(form.campaign_name.trim() || form.editingId);
  useCtrlS(isFormActive ? handleSave : () => {});

  const handleEdit = (c: Campaign) => {
    setForm({
      campaign_code: c.campaign_code,
      campaign_name: c.campaign_name,
      start_date: c.start_date,
      end_date: c.end_date ?? '',
      budget: c.budget != null ? String(c.budget) : '',
      status: c.status,
      description: c.description ?? '',
      is_active: c.is_active,
      editingId: c.id,
    });
  };

  return (
    <div data-keyboard-form className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Marketing Campaigns</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No campaigns defined yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Period</TableHead>
                  <TableHead className="text-xs text-right">Budget</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map(c => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => handleEdit(c)}>
                    <TableCell className="text-xs font-mono">{c.campaign_code}</TableCell>
                    <TableCell className="text-xs">{c.campaign_name}</TableCell>
                    <TableCell className="text-xs">
                      {c.start_date}{c.end_date ? ` – ${c.end_date}` : ''}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {c.budget != null ? `₹${inrFmt.format(c.budget)}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLOR[c.status])}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); deleteCampaign(c.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {form.editingId ? 'Edit Campaign' : 'New Campaign'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Code *</Label>
              <Input
                value={form.campaign_code}
                onChange={e => setForm(p => ({ ...p, campaign_code: e.target.value.toUpperCase().slice(0, 12) }))}
                onKeyDown={onEnterNext}
                placeholder="DIWALI24"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status}
                onValueChange={v => setForm(p => ({ ...p, status: v as CampaignStatus }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Campaign Name *</Label>
            <Input
              value={form.campaign_name}
              onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))}
              onKeyDown={onEnterNext}
              placeholder="Diwali Festive Drive 2024"
              className="h-8 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start Date *</Label>
              <SmartDateInput value={form.start_date}
                onChange={v => setForm(p => ({ ...p, start_date: v }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <SmartDateInput value={form.end_date}
                onChange={v => setForm(p => ({ ...p, end_date: v }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Budget (₹)</Label>
            <Input
              type="number"
              value={form.budget}
              onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
              onKeyDown={onEnterNext}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              className="text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Active</Label>
            <Switch checked={form.is_active}
              onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button data-primary size="sm" onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CampaignMaster(props: Props) {
  return <CampaignMasterPanel {...props} />;
}
