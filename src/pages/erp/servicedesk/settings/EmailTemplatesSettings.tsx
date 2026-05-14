/**
 * @file        src/pages/erp/servicedesk/settings/EmailTemplatesSettings.tsx
 * @purpose     Email Templates settings UI · 3-language tabs · consumes READ-ONLY getEmailTemplateSettings
 * @sprint      T-Phase-1.C.2 · Block B.2 · MOAT #24 banking
 * @iso        Functional Suitability + Maintainability
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  getEmailTemplateSettings,
  updateEmailTemplateSettings,
  type EmailTemplate,
} from '@/lib/cc-compliance-settings';

const E = 'DEMO';
const LANGS = ['en', 'hi', 'mr'] as const;

export function EmailTemplatesSettings(): JSX.Element {
  const [settings, setSettings] = useState(() => getEmailTemplateSettings(E));
  const [lang, setLang] = useState<(typeof LANGS)[number]>('en');

  const filtered = useMemo(
    () => settings.templates.filter((t) => t.language === lang),
    [settings, lang],
  );

  function save(): void {
    const next = updateEmailTemplateSettings(E, settings, 'admin');
    setSettings(next);
    toast.success('Templates saved');
  }

  function update(idx: number, patch: Partial<EmailTemplate>): void {
    const all = settings.templates.map((t) => (t.template_id === filtered[idx].template_id ? { ...t, ...patch } : t));
    setSettings({ ...settings, templates: all });
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <h1 className="text-xl font-bold">Email Templates</h1>
      <Tabs value={lang} onValueChange={(v) => setLang(v as (typeof LANGS)[number])}>
        <TabsList>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="hi">हिन्दी</TabsTrigger>
          <TabsTrigger value="mr">मराठी</TabsTrigger>
        </TabsList>
        {LANGS.map((l) => (
          <TabsContent key={l} value={l} className="space-y-3">
            {filtered.length === 0 && (
              <Card className="p-4 text-sm text-muted-foreground">
                No templates configured for this language.
              </Card>
            )}
            {filtered.map((t, idx) => (
              <Card key={t.template_id} className="p-4 space-y-2">
                <Label>{t.template_name}</Label>
                <Input value={t.subject_template} onChange={(e) => update(idx, { subject_template: e.target.value })} />
                <Textarea
                  rows={4}
                  value={t.body_template}
                  onChange={(e) => update(idx, { body_template: e.target.value })}
                />
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
      <div className="flex justify-end">
        {/* [JWT] Phase 2 wires SES integration */}
        <Button onClick={save}>Save</Button>
      </div>
    </div>
  );
}

export default EmailTemplatesSettings;
