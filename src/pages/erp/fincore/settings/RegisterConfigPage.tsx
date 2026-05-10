/**
 * @file     RegisterConfigPage.tsx
 * @purpose  Editor UI for RegisterConfig — per-entity per-register column + grouping customization.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-A
 * @sprint   T10-pre.2d-A
 * @iso      Usability (HIGH — mirrors PrintConfigPage UX for learnability)
 *           Functional Suitability (HIGH — all 13 registers configurable)
 * @whom     Entity admins · power accountants
 * @depends  register-config.ts · register-config-storage.ts · shadcn (Switch, Select, Button, Card)
 * @consumers (standalone route — no component consumers)
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, RotateCcw, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  type RegisterConfig,
  type RegisterTypeCode,
  type RegisterToggles,
  type RegisterGroupKey,
  REGISTER_TOGGLES,
  REGISTER_GROUPS,
  REGISTER_LABELS,
  DEFAULT_REGISTER_CONFIG,
} from '@/types/register-config';
import {
  loadRegisterConfig, saveRegisterConfig, resetRegisterConfig,
  resolveToggles, resolveDefaultGroup,
} from '@/lib/register-config-storage';

function RegisterConfigPanel({ entityCode }: { entityCode: string }) {
  const [config, setConfig] = useState<RegisterConfig>(DEFAULT_REGISTER_CONFIG);
  const [selectedRegister, setSelectedRegister] = useState<RegisterTypeCode>('sales_register');

  // [Concrete] Load on mount + on entity change.
  useEffect(() => {
    setConfig(loadRegisterConfig(entityCode));
  }, [entityCode]);

  // [Analytical] Derived state: effective toggles + group for the currently-selected register.
  const effectiveToggles = useMemo(
    () => resolveToggles(config, selectedRegister),
    [config, selectedRegister]
  );
  const effectiveGroup = useMemo(
    () => resolveDefaultGroup(config, selectedRegister),
    [config, selectedRegister]
  );

  // [Concrete] Filtered toggle list — only show those that apply to current register.
  const applicableToggles = useMemo(
    () => REGISTER_TOGGLES.filter(t => t.appliesTo.includes(selectedRegister)),
    [selectedRegister]
  );
  const applicableGroups = useMemo(
    () => REGISTER_GROUPS.filter(g => g.appliesTo.includes(selectedRegister)),
    [selectedRegister]
  );

  const handleToggle = (key: keyof RegisterToggles, value: boolean) => {
    setConfig(prev => ({
      ...prev,
      byRegisterType: {
        ...prev.byRegisterType,
        [selectedRegister]: {
          ...prev.byRegisterType[selectedRegister],
          toggles: {
            ...(prev.byRegisterType[selectedRegister]?.toggles ?? {}),
            [key]: value,
          },
        },
      },
    }));
  };

  const handleGroupChange = (group: RegisterGroupKey) => {
    setConfig(prev => ({
      ...prev,
      byRegisterType: {
        ...prev.byRegisterType,
        [selectedRegister]: {
          ...prev.byRegisterType[selectedRegister],
          defaultGroup: group,
        },
      },
    }));
  };

  const handleSave = () => {
    saveRegisterConfig(entityCode, config);
    toast.success('Register configuration saved');
  };

  const handleReset = () => {
    resetRegisterConfig(entityCode);
    setConfig(DEFAULT_REGISTER_CONFIG);
    toast.success('Register configuration reset to defaults');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Register Configuration</h2>
          <Badge variant="outline" className="text-[10px]">Entity: {entityCode}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to Defaults
          </Button>
          <Button data-primary size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Left: register selector */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Register Type</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {(Object.keys(REGISTER_LABELS) as RegisterTypeCode[]).map(code => (
              <Button
                key={code}
                variant={selectedRegister === code ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={() => setSelectedRegister(code)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                {REGISTER_LABELS[code]}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Right: toggles + grouping for selected register */}
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{REGISTER_LABELS[selectedRegister]} — Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Grouping */}
            <div className="space-y-1">
              <Label className="text-xs">Default Grouping</Label>
              <Select value={effectiveGroup} onValueChange={v => handleGroupChange(v as RegisterGroupKey)}>
                <SelectTrigger className="h-8 text-xs w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {applicableGroups.map(g => (
                    <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Column Visibility</Label>
              <div className="grid grid-cols-2 gap-3">
                {applicableToggles.map(t => (
                  <div key={t.key} className="flex items-start justify-between gap-2 p-2 rounded border border-border/50">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{t.label}</div>
                      <div className="text-[10px] text-muted-foreground">{t.description}</div>
                    </div>
                    <Switch
                      checked={effectiveToggles[t.key]}
                      onCheckedChange={v => handleToggle(t.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterConfigPage() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Fin Core', href: '/erp/finecore' },
            { label: 'Settings' },
            { label: 'Register Config' },
          ]}
          showDatePicker={false}
        />
        <main>
          {entityCode
            ? <RegisterConfigPanel entityCode={entityCode} />
            : <SelectCompanyGate title="Select a company to configure registers" />
          }
        </main>
      </div>
    </SidebarProvider>
  );
}
