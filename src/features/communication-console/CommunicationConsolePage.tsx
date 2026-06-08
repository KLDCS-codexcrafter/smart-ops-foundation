/**
 * CommunicationConsolePage.tsx — Sprint B2 · CC Communication module
 *
 * Tabs:
 *   - Department Email Registry · Template Master · Company Mail Settings
 *   - User Mail Profiles · Outbox Monitor · PULSE Integration (Wave-2 honest status)
 *
 * Admin-gated (governance group). NO password fields anywhere.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listDepartmentEmails, upsertDepartmentEmail, deleteDepartmentEmail,
  listTemplates, upsertTemplate,
  getCompanyMailSettings, saveCompanyMailSettings,
  listUserMailProfiles, upsertUserMailProfile,
  listOutbox, renderTemplate,
} from '@/lib/communication-engine';

export default function CommunicationConsolePage() {
  const { entityCode } = useEntityCode();
  const [tab, setTab] = useState('depts');
  const [rev, setRev] = useState(0);
  const refresh = () => setRev((r) => r + 1);

  /* eslint-disable react-hooks/exhaustive-deps */
  const depts = useMemo(() => listDepartmentEmails(entityCode), [entityCode, rev]);
  const templates = useMemo(() => listTemplates(entityCode), [entityCode, rev]);
  const settings = useMemo(() => getCompanyMailSettings(entityCode), [entityCode, rev]);
  const profiles = useMemo(() => listUserMailProfiles(entityCode), [entityCode, rev]);
  const outbox = useMemo(() => listOutbox(entityCode), [entityCode, rev]);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (!entityCode) {
    return <div className="p-6 text-muted-foreground">Select a company to continue.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Communication Console</h1>
        <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> No passwords stored in-app · Wave-2 server-side</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="depts">Department Emails</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Company Mail Settings</TabsTrigger>
          <TabsTrigger value="profiles">User Mail Profiles</TabsTrigger>
          <TabsTrigger value="outbox">Outbox Monitor</TabsTrigger>
          <TabsTrigger value="pulse">PULSE Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="depts">
          <Card>
            <CardHeader><CardTitle className="text-sm">Department Email Registry</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {depts.length === 0 && <div className="text-xs text-muted-foreground">No department mailboxes yet.</div>}
              {depts.map((d) => (
                <div key={d.id} className="grid grid-cols-12 gap-2 items-center border border-border rounded p-2">
                  <Input className="col-span-2 h-8 text-xs" value={d.card_id} onChange={(e) => { upsertDepartmentEmail(entityCode, { ...d, card_id: e.target.value }); refresh(); }} />
                  <Input className="col-span-3 h-8 text-xs" value={d.department_label} onChange={(e) => { upsertDepartmentEmail(entityCode, { ...d, department_label: e.target.value }); refresh(); }} />
                  <Input className="col-span-3 h-8 text-xs font-mono" value={d.email_id} onChange={(e) => { upsertDepartmentEmail(entityCode, { ...d, email_id: e.target.value }); refresh(); }} />
                  <Input className="col-span-2 h-8 text-xs" value={d.display_name} onChange={(e) => { upsertDepartmentEmail(entityCode, { ...d, display_name: e.target.value }); refresh(); }} />
                  <div className="col-span-1 flex items-center gap-1"><Switch checked={d.active} onCheckedChange={(v) => { upsertDepartmentEmail(entityCode, { ...d, active: v }); refresh(); }} /></div>
                  <Button size="sm" variant="ghost" className="col-span-1" onClick={() => { deleteDepartmentEmail(entityCode, d.id); refresh(); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { upsertDepartmentEmail(entityCode, { card_id: 'new', department_label: 'New Department', email_id: '', display_name: '', reply_to_mode: 'department', active: true }); refresh(); }}>
                <Plus className="h-3 w-3" /> Add Department Mailbox
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader><CardTitle className="text-sm">Template Master ({templates.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {templates.map((t) => {
                const preview = renderTemplate(t.object_type, { doc_no: 'SAMPLE-001', recipient_name: 'Vendor', amount: '₹1,00,000' }, entityCode, t.sender_class_default, 'operator');
                return (
                  <div key={t.id} className="border border-border rounded p-2 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{t.object_type}</Badge>
                      <Badge>{t.sender_class_default}</Badge>
                      <Switch checked={t.active} onCheckedChange={(v) => { upsertTemplate(entityCode, { ...t, active: v }); refresh(); }} />
                    </div>
                    <Input className="h-8 text-xs" value={t.subject_tpl} onChange={(e) => { upsertTemplate(entityCode, { ...t, subject_tpl: e.target.value }); refresh(); }} />
                    <Textarea rows={3} className="text-xs font-mono" value={t.body_tpl} onChange={(e) => { upsertTemplate(entityCode, { ...t, body_tpl: e.target.value }); refresh(); }} />
                    <div className="text-[10px] text-muted-foreground"><strong>Preview:</strong> {preview.subject}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle className="text-sm">Company Mail Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Server Label</Label><Input value={settings.server_label ?? ''} onChange={(e) => { saveCompanyMailSettings(entityCode, { ...settings, server_label: e.target.value }); refresh(); }} /></div>
                <div><Label className="text-xs">Server Address</Label><Input className="font-mono" value={settings.server_address ?? ''} onChange={(e) => { saveCompanyMailSettings(entityCode, { ...settings, server_address: e.target.value }); refresh(); }} /></div>
                <div><Label className="text-xs">From Name</Label><Input value={settings.from_name} onChange={(e) => { saveCompanyMailSettings(entityCode, { ...settings, from_name: e.target.value }); refresh(); }} /></div>
                <div><Label className="text-xs">SSL Port</Label><Input type="number" value={settings.ssl_std_port} onChange={(e) => { saveCompanyMailSettings(entityCode, { ...settings, ssl_std_port: parseInt(e.target.value || '465', 10) }); refresh(); }} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={settings.use_ssl} onCheckedChange={(v) => { saveCompanyMailSettings(entityCode, { ...settings, use_ssl: v }); refresh(); }} />
                <Label className="text-xs">Use SSL</Label>
              </div>
              <div className="text-xs p-3 bg-muted/30 rounded border border-border">
                <strong>Credentials:</strong> <Badge variant="outline">{settings.credentials_state}</Badge>
                <p className="mt-1 text-muted-foreground">Mail server passwords are never stored in this app. The PULSE Relay configures them server-side (AES-256-GCM) at Wave-2.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles">
          <Card>
            <CardHeader><CardTitle className="text-sm">User Mail Profiles · signatures · send-as grants</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {profiles.length === 0 && <div className="text-xs text-muted-foreground">No user profiles yet.</div>}
              {profiles.map((p) => (
                <div key={p.user_name} className="grid grid-cols-12 gap-2 items-center border border-border rounded p-2">
                  <Input className="col-span-3 h-8 text-xs" value={p.user_name} disabled />
                  <Input className="col-span-3 h-8 text-xs font-mono" value={p.email_id ?? ''} placeholder="email" onChange={(e) => { upsertUserMailProfile(entityCode, { ...p, email_id: e.target.value }); refresh(); }} />
                  <Input className="col-span-3 h-8 text-xs" value={p.display_name ?? ''} placeholder="display name" onChange={(e) => { upsertUserMailProfile(entityCode, { ...p, display_name: e.target.value }); refresh(); }} />
                  <Input className="col-span-3 h-8 text-xs" value={p.signature_html ?? ''} placeholder="signature" onChange={(e) => { upsertUserMailProfile(entityCode, { ...p, signature_html: e.target.value }); refresh(); }} />
                </div>
              ))}
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { upsertUserMailProfile(entityCode, { user_name: `user-${Date.now().toString(36).slice(-4)}`, email_id: '', display_name: '', signature_html: '' }); refresh(); }}>
                <Plus className="h-3 w-3" /> Add Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outbox">
          <Card>
            <CardHeader><CardTitle className="text-sm">Outbox Monitor / Communication Log ({outbox.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {outbox.length === 0 && <div className="text-xs text-muted-foreground">No messages yet.</div>}
              {outbox.slice(0, 100).map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-xs border-b border-border py-1.5">
                  <Badge variant={m.delivery_mode === 'sent_via_user_client' ? 'default' : m.delivery_mode === 'eml_exported' ? 'secondary' : 'outline'}>{m.delivery_mode}</Badge>
                  <Badge variant="outline">{m.sender_class}</Badge>
                  <span className="font-mono text-[10px] text-muted-foreground">{m.object_type}</span>
                  <span className="truncate flex-1">{m.subject}</span>
                  <span className="text-[10px] text-muted-foreground">{m.to_resolved.join(', ')}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pulse">
          <Card>
            <CardHeader><CardTitle className="text-sm">PULSE Integration</CardTitle></CardHeader>
            <CardContent>
              <div className="p-4 border border-border rounded bg-muted/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Not connected</Badge>
                  <span className="text-xs text-muted-foreground">— PULSE Relay connects at Wave-2 on the company's India-resident backend</span>
                </div>
                <p className="text-xs text-muted-foreground">Credentials are stored server-side AES-256-GCM only. No SMTP password is ever stored in this app.</p>
                <Button size="sm" variant="outline" disabled>Connect PULSE Relay (Wave-2)</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
