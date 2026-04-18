/**
 * ReceivXConfig.tsx — Single-record config (WhatsApp / Email / Risk thresholds)
 */
import { useState, useCallback } from 'react';
import { Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { receivxConfigKey, type ReceivXConfig } from '@/types/receivx';

interface Props { entityCode: string }

const DEFAULT_CONFIG = (e: string): ReceivXConfig => {
  const now = new Date().toISOString();
  return {
    entity_id: e,
    wa_provider: 'wa_me_fallback',
    wa_api_endpoint: 'https://app.messageautosender.com/api/send-message',
    wa_api_key: '', wa_webhook_url: '', wa_webhook_secret: '', wa_default_sender: '',
    email_provider: 'mailto_fallback',
    email_smtp_host: '', email_smtp_port: 587, email_smtp_user: '', email_smtp_pass: '',
    email_pixel_endpoint: '', email_from_name: '', email_from_address: '',
    default_template_id: null, default_escalation_after_days: 30, auto_run_cadence: false,
    bad_debtor_age_days: 90, credit_hold_ratio: 1.0,
    created_at: now, updated_at: now,
  };
};

export function ReceivXConfigPanel({ entityCode }: Props) {
  const [cfg, setCfg] = useState<ReceivXConfig>(() => {
    try {
      // [JWT] GET /api/receivx/config
      const raw = localStorage.getItem(receivxConfigKey(entityCode));
      return raw ? JSON.parse(raw) : DEFAULT_CONFIG(entityCode);
    } catch { return DEFAULT_CONFIG(entityCode); }
  });

  const update = <K extends keyof ReceivXConfig>(k: K, v: ReceivXConfig[K]) => setCfg({ ...cfg, [k]: v });

  const handleSave = useCallback(() => {
    try {
      // [JWT] POST /api/receivx/config
      localStorage.setItem(receivxConfigKey(entityCode), JSON.stringify({ ...cfg, updated_at: new Date().toISOString() }));
      toast.success('Configuration saved');
    } catch { toast.error('Save failed'); }
  }, [cfg, entityCode]);

  useCtrlS(handleSave);

  const testSend = () => {
    if (!cfg.wa_default_sender) { toast.error('Set default sender first'); return; }
    toast.success(`Test message would be sent to ${cfg.wa_default_sender}`);
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">ReceivX Configuration</h1>
          <p className="text-xs text-muted-foreground">API keys, providers, risk thresholds</p>
        </div>
        <Button data-primary size="sm" onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">
          <Save className="h-3.5 w-3.5 mr-1" />Save
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">WhatsApp (Message Auto Sender)</p>
          <Button variant="outline" size="sm" onClick={testSend}><Send className="h-3 w-3 mr-1" />Test Send</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Provider</Label><Input className="text-xs mt-1" value={cfg.wa_provider} onKeyDown={onEnterNext} onChange={e => update('wa_provider', (e.target.value as ReceivXConfig['wa_provider']))} /></div>
          <div><Label className="text-xs">API Endpoint</Label><Input className="text-xs mt-1" value={cfg.wa_api_endpoint} onKeyDown={onEnterNext} onChange={e => update('wa_api_endpoint', e.target.value)} /></div>
          <div><Label className="text-xs">API Key</Label><Input type="password" className="text-xs mt-1" value={cfg.wa_api_key} onKeyDown={onEnterNext} onChange={e => update('wa_api_key', e.target.value)} /></div>
          <div><Label className="text-xs">Default Sender</Label><Input className="text-xs mt-1" value={cfg.wa_default_sender} onKeyDown={onEnterNext} onChange={e => update('wa_default_sender', e.target.value)} /></div>
          <div><Label className="text-xs">Webhook URL</Label><Input className="text-xs mt-1" value={cfg.wa_webhook_url} onKeyDown={onEnterNext} onChange={e => update('wa_webhook_url', e.target.value)} /></div>
          <div><Label className="text-xs">Webhook Secret</Label><Input type="password" className="text-xs mt-1" value={cfg.wa_webhook_secret} onKeyDown={onEnterNext} onChange={e => update('wa_webhook_secret', e.target.value)} /></div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold">Email / SMTP</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Provider</Label><Input className="text-xs mt-1" value={cfg.email_provider} onKeyDown={onEnterNext} onChange={e => update('email_provider', (e.target.value as ReceivXConfig['email_provider']))} /></div>
          <div><Label className="text-xs">SMTP Host</Label><Input className="text-xs mt-1" value={cfg.email_smtp_host} onKeyDown={onEnterNext} onChange={e => update('email_smtp_host', e.target.value)} /></div>
          <div><Label className="text-xs">SMTP Port</Label><Input type="number" className="text-xs mt-1" value={cfg.email_smtp_port} onKeyDown={onEnterNext} onChange={e => update('email_smtp_port', +e.target.value)} /></div>
          <div><Label className="text-xs">SMTP User</Label><Input className="text-xs mt-1" value={cfg.email_smtp_user} onKeyDown={onEnterNext} onChange={e => update('email_smtp_user', e.target.value)} /></div>
          <div><Label className="text-xs">SMTP Pass</Label><Input type="password" className="text-xs mt-1" value={cfg.email_smtp_pass} onKeyDown={onEnterNext} onChange={e => update('email_smtp_pass', e.target.value)} /></div>
          <div><Label className="text-xs">Pixel Endpoint</Label><Input className="text-xs mt-1" value={cfg.email_pixel_endpoint} onKeyDown={onEnterNext} onChange={e => update('email_pixel_endpoint', e.target.value)} /></div>
          <div><Label className="text-xs">From Name</Label><Input className="text-xs mt-1" value={cfg.email_from_name} onKeyDown={onEnterNext} onChange={e => update('email_from_name', e.target.value)} /></div>
          <div><Label className="text-xs">From Address</Label><Input className="text-xs mt-1" value={cfg.email_from_address} onKeyDown={onEnterNext} onChange={e => update('email_from_address', e.target.value)} /></div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold">Defaults & Risk Thresholds</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Default Escalation (days)</Label><Input type="number" className="text-xs mt-1" value={cfg.default_escalation_after_days} onKeyDown={onEnterNext} onChange={e => update('default_escalation_after_days', +e.target.value)} /></div>
          <div className="flex items-center gap-2 mt-5"><Switch checked={cfg.auto_run_cadence} onCheckedChange={v => update('auto_run_cadence', v)} /><Label className="text-xs">Auto-run Cadence</Label></div>
          <div><Label className="text-xs">Bad Debtor Age (days)</Label><Input type="number" className="text-xs mt-1" value={cfg.bad_debtor_age_days} onKeyDown={onEnterNext} onChange={e => update('bad_debtor_age_days', +e.target.value)} /></div>
          <div><Label className="text-xs">Credit Hold Ratio</Label><Input type="number" step="0.1" className="text-xs mt-1" value={cfg.credit_hold_ratio} onKeyDown={onEnterNext} onChange={e => update('credit_hold_ratio', +e.target.value)} /></div>
        </div>
      </Card>
    </div>
  );
}

export default function ReceivXConfigPage() {
  return <ReceivXConfigPanel entityCode="SMRT" />;
}
