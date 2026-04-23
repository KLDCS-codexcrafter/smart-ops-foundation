/**
 * ReceivXConfig.tsx — Single-record config (WhatsApp / Email / Risk / Gateway / Credit Hold / Dunning)
 * Sprint 8: 3 new cards (Payment Gateway, Credit Hold, Dunning) + backfill loader.
 */
import { useState, useCallback } from 'react';
import { Save, Send, CreditCard, ShieldAlert, MailWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  receivxConfigKey, type ReceivXConfig, RECEIVX_CONFIG_SPRINT8_DEFAULTS,
} from '@/types/receivx';
import {
  PROVIDER_LABELS, type GatewayProvider,
} from '@/types/payment-gateway';
import {
  CREDIT_HOLD_MODE_LABELS, type CreditHoldMode,
} from '@/types/credit-hold';
import {
  DEFAULT_DUNNING_TEMPLATES, STAGE_LABELS, type DunningStage, type DunningTemplate,
} from '@/types/dunning';
import { createPaymentRequest } from '@/lib/payment-gateway-engine';
import {
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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
    ...RECEIVX_CONFIG_SPRINT8_DEFAULTS,
    created_at: now, updated_at: now,
  };
};

/** Backfill: merge defaults so old saved configs gain Sprint 8 fields. */
function loadConfig(entityCode: string): ReceivXConfig {
  try {
    // [JWT] GET /api/receivx/config
    const raw = localStorage.getItem(receivxConfigKey(entityCode));
    const saved = raw ? JSON.parse(raw) : {};
    const base = DEFAULT_CONFIG(entityCode);
    const cfg: ReceivXConfig = { ...base, ...RECEIVX_CONFIG_SPRINT8_DEFAULTS, ...saved };
    if (!cfg.gateway_credentials) {
      cfg.gateway_credentials = RECEIVX_CONFIG_SPRINT8_DEFAULTS.gateway_credentials;
    }
    if (!cfg.dunning_templates || cfg.dunning_templates.length < 4) {
      cfg.dunning_templates = DEFAULT_DUNNING_TEMPLATES.map(t => ({ ...t }));
    }
    if (!cfg.credit_hold_block_on) cfg.credit_hold_block_on = ['sales_invoice'];
    return cfg;
  } catch {
    return DEFAULT_CONFIG(entityCode);
  }
}

const STAGES: DunningStage[] = ['polite', 'firm', 'final', 'legal'];

export function ReceivXConfigPanel({ entityCode }: Props) {
  const [cfg, setCfg] = useState<ReceivXConfig>(() => loadConfig(entityCode));

  const update = <K extends keyof ReceivXConfig>(k: K, v: ReceivXConfig[K]) =>
    setCfg(prev => ({ ...prev, [k]: v }));

  const updateCreds = (patch: Partial<ReceivXConfig['gateway_credentials']>) =>
    setCfg(prev => ({ ...prev, gateway_credentials: { ...prev.gateway_credentials, ...patch } }));

  const updateTemplate = (idx: number, patch: Partial<DunningTemplate>) =>
    setCfg(prev => {
      const next = [...prev.dunning_templates];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, dunning_templates: next };
    });

  const toggleBlockOn = (key: 'sales_order' | 'sales_invoice', on: boolean) => {
    setCfg(prev => {
      const set = new Set(prev.credit_hold_block_on);
      if (on) set.add(key); else set.delete(key);
      return { ...prev, credit_hold_block_on: Array.from(set) as ('sales_order' | 'sales_invoice')[] };
    });
  };

  const handleSave = useCallback(() => {
    try {
      // [JWT] POST /api/receivx/config
      localStorage.setItem(
        receivxConfigKey(entityCode),
        JSON.stringify({ ...cfg, updated_at: new Date().toISOString() }),
      );
      toast.success('Configuration saved');
    } catch { toast.error('Save failed'); }
  }, [cfg, entityCode]);

  useCtrlS(handleSave);

  const testSend = () => {
    if (!cfg.wa_default_sender) { toast.error('Set default sender first'); return; }
    toast.success(`Test message would be sent to ${cfg.wa_default_sender}`);
  };

  const testPaymentLink = () => {
    const res = createPaymentRequest(
      {
        ref_voucher_id: 'test-voucher',
        ref_voucher_no: 'TEST-001',
        party_id: 'test-party',
        party_name: 'Test Customer',
        party_phone: cfg.wa_default_sender || null,
        party_email: cfg.email_from_address || null,
        amount: 1000,
        narration: 'ReceivX test payment',
        expiry_days: cfg.gateway_link_expiry_days,
      },
      cfg.gateway_provider,
      cfg.gateway_credentials,
      cfg.gateway_link_expiry_days,
    );
    if (res.success && res.record) {
      toast.success(`Test link generated: ${res.record.link_url}`);
    } else {
      toast.error(res.error || 'Failed to generate link');
    }
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">ReceivX Configuration</h1>
          <p className="text-xs text-muted-foreground">API keys, providers, risk thresholds, gateway, dunning</p>
        </div>
        <Button data-primary size="sm" onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">
          <Save className="h-3.5 w-3.5 mr-1" />Save
        </Button>
      </div>

      {/* WhatsApp */}
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

      {/* Email */}
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

      {/* Defaults & Risk */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold">Defaults & Risk Thresholds</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Default Escalation (days)</Label><Input type="number" className="text-xs mt-1" value={cfg.default_escalation_after_days} onKeyDown={onEnterNext} onChange={e => update('default_escalation_after_days', +e.target.value)} /></div>
          <div className="flex items-center gap-2 mt-5"><Switch checked={cfg.auto_run_cadence} onCheckedChange={v => update('auto_run_cadence', v)} /><Label className="text-xs">Auto-run Cadence</Label></div>
          <div><Label className="text-xs">Bad Debtor Age (days)</Label><Input type="number" className="text-xs mt-1" value={cfg.bad_debtor_age_days} onKeyDown={onEnterNext} onChange={e => update('bad_debtor_age_days', +e.target.value)} /></div>
          <div><Label className="text-xs">Credit Hold Ratio</Label><Input type="number" step="0.1" className="text-xs mt-1" value={cfg.credit_hold_ratio} onKeyDown={onEnterNext} onChange={e => update('credit_hold_ratio', +e.target.value)} /></div>
        </div>
      </Card>

      {/* ── Sprint 8 — Payment Gateway ──────────────────────────── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4 text-amber-500" />Payment Gateway</p>
          <Button variant="outline" size="sm" onClick={testPaymentLink}><Send className="h-3 w-3 mr-1" />Test Link</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Provider</Label>
            <Select
              value={cfg.gateway_provider}
              onValueChange={(v) => {
                const provider = v as GatewayProvider;
                update('gateway_provider', provider);
                updateCreds({ provider });
              }}
            >
              <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_LABELS) as GatewayProvider[]).map(p => (
                  <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Merchant VPA (UPI)</Label><Input className="text-xs mt-1" placeholder="merchant@upi" value={cfg.gateway_credentials.merchant_vpa ?? ''} onKeyDown={onEnterNext} onChange={e => updateCreds({ merchant_vpa: e.target.value || null })} /></div>
          <div><Label className="text-xs">Merchant Name</Label><Input className="text-xs mt-1" value={cfg.gateway_credentials.merchant_name ?? ''} onKeyDown={onEnterNext} onChange={e => updateCreds({ merchant_name: e.target.value || null })} /></div>
          <div><Label className="text-xs">Key ID</Label><Input className="text-xs mt-1" value={cfg.gateway_credentials.key_id} onKeyDown={onEnterNext} onChange={e => updateCreds({ key_id: e.target.value })} /></div>
          <div><Label className="text-xs">Key Secret</Label><Input type="password" className="text-xs mt-1" value={cfg.gateway_credentials.key_secret} onKeyDown={onEnterNext} onChange={e => updateCreds({ key_secret: e.target.value })} /></div>
          <div><Label className="text-xs">Webhook Secret</Label><Input type="password" className="text-xs mt-1" value={cfg.gateway_credentials.webhook_secret} onKeyDown={onEnterNext} onChange={e => updateCreds({ webhook_secret: e.target.value })} /></div>
          <div className="flex items-center gap-2 mt-5"><Switch checked={cfg.gateway_credentials.is_test_mode} onCheckedChange={v => { updateCreds({ is_test_mode: v }); update('gateway_test_mode', v); }} /><Label className="text-xs">Test Mode</Label></div>
          <div><Label className="text-xs">Link Expiry (days)</Label><Input type="number" className="text-xs mt-1" value={cfg.gateway_link_expiry_days} onKeyDown={onEnterNext} onChange={e => update('gateway_link_expiry_days', +e.target.value || 7)} /></div>
        </div>
      </Card>

      {/* ── Sprint 8 — Credit Hold ───────────────────────────── */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" />Credit Hold</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Mode (entity default)</Label>
            <Select value={cfg.credit_hold_mode} onValueChange={v => update('credit_hold_mode', v as CreditHoldMode)}>
              <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CREDIT_HOLD_MODE_LABELS) as CreditHoldMode[]).map(m => (
                  <SelectItem key={m} value={m}>{CREDIT_HOLD_MODE_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Block On</Label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={cfg.credit_hold_block_on.includes('sales_order')}
                  onCheckedChange={v => toggleBlockOn('sales_order', !!v)}
                />
                Sales Order
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={cfg.credit_hold_block_on.includes('sales_invoice')}
                  onCheckedChange={v => toggleBlockOn('sales_invoice', !!v)}
                />
                Sales Invoice
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-5">
            <Switch
              checked={cfg.credit_hold_require_supervisor}
              onCheckedChange={v => update('credit_hold_require_supervisor', v)}
            />
            <Label className="text-xs">Require Supervisor for Override</Label>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Hold Ratio is shared with the Defaults card above. Hard Block stops voucher commit; Soft Warn lets it proceed with audit trail.
        </p>
      </Card>

      {/* ── Sprint 8 — Dunning ───────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-2"><MailWarning className="h-4 w-4 text-amber-500" />Dunning</p>
          <div className="flex items-center gap-2">
            <Switch checked={cfg.dunning_enabled} onCheckedChange={v => update('dunning_enabled', v)} />
            <Label className="text-xs">Enabled</Label>
          </div>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {STAGES.map((stage, idx) => {
            const tpl = cfg.dunning_templates[idx] ?? DEFAULT_DUNNING_TEMPLATES[idx];
            return (
              <AccordionItem key={stage} value={stage}>
                <AccordionTrigger className="text-xs font-semibold">
                  {STAGE_LABELS[stage]} · trigger {tpl.trigger_days_overdue} d overdue
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Trigger Days Overdue</Label>
                      <Input
                        type="number" className="text-xs mt-1"
                        value={tpl.trigger_days_overdue}
                        onKeyDown={onEnterNext}
                        onChange={e => updateTemplate(idx, { trigger_days_overdue: +e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tone Hint</Label>
                      <Input
                        className="text-xs mt-1" value={tpl.tone_hint}
                        onKeyDown={onEnterNext}
                        onChange={e => updateTemplate(idx, { tone_hint: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Subject</Label>
                    <Input
                      className="text-xs mt-1" value={tpl.subject}
                      onKeyDown={onEnterNext}
                      onChange={e => updateTemplate(idx, { subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Body</Label>
                    <Textarea
                      rows={6} className="text-xs mt-1 font-mono" value={tpl.body}
                      onChange={e => updateTemplate(idx, { body: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Variables: {'{party_name} {voucher_nos} {total_overdue} {days_overdue} {payment_link} {sender_name}'}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </Card>
    </div>
  );
}

export default function ReceivXConfigPage() {
  return <ReceivXConfigPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
