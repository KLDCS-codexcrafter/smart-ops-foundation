/**
 * TemplateField.tsx — Reusable template-driven textarea for voucher forms
 * [JWT] Template resolution will move to server-side
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw, ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTransactionTemplates } from '@/hooks/useTransactionTemplates';
import { resolveTemplate, applyVariables, type TransactionTemplateType, type TransactionTemplate } from '@/types/transaction-template';

interface TemplateFieldProps {
  type: TransactionTemplateType;
  voucherTypeName: string;
  departmentIds?: string[];
  value: string;
  onChange: (val: string) => void;
  label: string;
  rows?: number;
  vars: Record<string, string>;
}

const DEFAULT_ROWS: Record<TransactionTemplateType, number> = {
  narration: 2,
  terms_conditions: 5,
  payment_enforcement: 3,
};

export function TemplateField({
  type, voucherTypeName, departmentIds, value, onChange, label, rows, vars,
}: TemplateFieldProps) {
  const navigate = useNavigate();
  const { templates } = useTransactionTemplates();
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [usedTemplateName, setUsedTemplateName] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);

  const deptIds = departmentIds ?? [];
  const effectiveRows = rows ?? DEFAULT_ROWS[type];

  // Auto-resolve on mount and when key vars change (only if not manually edited)
  useEffect(() => {
    if (isManuallyEdited) return;
    const resolved = resolveTemplate(type, voucherTypeName, deptIds, templates, vars);
    if (resolved) {
      onChange(resolved);
      const match = templates.find(t =>
        t.status === 'active' && t.is_default && t.type === type &&
        (t.applicable_voucher_types.length === 0 || t.applicable_voucher_types.includes(voucherTypeName))
      );
      setUsedTemplateName(match?.name ?? 'Default');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherTypeName, vars.party, vars.date, vars.due_date, isManuallyEdited]);

  const handleRefresh = () => {
    setIsManuallyEdited(false);
  };

  const handleSelectTemplate = (t: TransactionTemplate) => {
    const resolved = applyVariables(t.content, vars);
    onChange(resolved);
    setUsedTemplateName(t.name);
    setIsManuallyEdited(false);
    setSelectorOpen(false);
  };

  // Filter templates for selector
  const available = templates.filter(t =>
    t.type === type &&
    (t.applicable_voucher_types.length === 0 || t.applicable_voucher_types.includes(voucherTypeName)) &&
    t.status === 'active'
  );

  return (
    <div data-keyboard-form className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {usedTemplateName && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
              {usedTemplateName}
            </Badge>
          )}
          <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]">
                Change <ChevronDown className="h-3 w-3 ml-0.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2 max-h-60 overflow-y-auto" align="end">
              <div className="space-y-1">
                {available.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">No templates available for this voucher type.</p>
                )}
                {available.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-xs transition-colors"
                  >
                    <div className="font-medium text-foreground">{t.name}</div>
                    <div className="text-muted-foreground truncate">{t.content.slice(0, 60)}…</div>
                  </button>
                ))}
                <button
                  onClick={() => { setSelectorOpen(false); navigate('/erp/accounting/transaction-templates'); }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-xs text-primary font-medium flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" /> Manage templates →
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={handleRefresh}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh from template</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <Textarea
        rows={effectiveRows}
        value={value}
        onChange={(e) => { setIsManuallyEdited(true); onChange(e.target.value); }}
        className={type === 'narration' ? 'text-xs font-mono' : 'text-xs'}
        placeholder={`Enter ${label.toLowerCase()}…`}
      />
    </div>
  );
}
