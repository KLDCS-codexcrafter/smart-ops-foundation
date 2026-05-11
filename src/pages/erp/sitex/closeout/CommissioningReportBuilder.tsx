/**
 * @file        src/pages/erp/sitex/closeout/CommissioningReportBuilder.tsx
 * @purpose     Commissioning Report Builder · template selector + dynamic form
 * @sprint      T-Phase-1.A.15a · Q-LOCK-11a · Block F.3
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileCog } from 'lucide-react';
import { COMMISSIONING_TEMPLATES, getTemplateById } from '@/lib/commissioning-templates';

interface Props { onNavigate: (m: string) => void }

export function CommissioningReportBuilder({ onNavigate: _onNavigate }: Props): JSX.Element {
  const [templateId, setTemplateId] = useState<string>(COMMISSIONING_TEMPLATES[0].id);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const tpl = getTemplateById(templateId);

  const set = (id: string, v: string | boolean): void => setValues((s) => ({ ...s, [id]: v }));

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileCog className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">Commissioning Report Builder</h1>
      </div>

      <Card className="p-4">
        <label className="text-sm font-medium block mb-2">Industry Template</label>
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={templateId} onChange={(e) => { setTemplateId(e.target.value); setValues({}); }}>
          {COMMISSIONING_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.template_name}</option>)}
        </select>
      </Card>

      {tpl && tpl.sections.map((sec) => (
        <Card key={sec.id} className="p-6 space-y-3">
          <h2 className="font-semibold">{sec.title}</h2>
          {sec.fields.map((f) => (
            <div key={f.id} className="space-y-1">
              <label className="text-sm">{f.label}{f.required && <span className="text-destructive">*</span>}</label>
              {f.type === 'checkbox' ? (
                <Checkbox
                  checked={Boolean(values[f.id])}
                  onCheckedChange={(c) => set(f.id, Boolean(c))}
                />
              ) : (
                <Input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  value={(values[f.id] as string) ?? ''}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </Card>
      ))}

      {tpl && (
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Approval Signatures Required</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {tpl.approval_signatures_required.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <Button className="mt-4">Generate & Save to DocVault</Button>
        </Card>
      )}
    </div>
  );
}
