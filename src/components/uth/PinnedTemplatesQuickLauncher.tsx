/**
 * PinnedTemplatesQuickLauncher · Sprint T-Phase-2.7-e · OOB-10
 * Dropdown of pins for current voucher type · click clones into form.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  loadPinnedTemplatesForWidget,
  cloneTemplateToFormState,
  type ClonedTemplateState,
} from '@/lib/pinned-templates-engine';

interface Props {
  entityCode: string;
  voucherTypeId: string;
  onClone: (state: ClonedTemplateState | null) => void;
}

export function PinnedTemplatesQuickLauncher({ entityCode, voucherTypeId, onClone }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const templates = useMemo(() => {
    if (!entityCode) return [];
    return loadPinnedTemplatesForWidget(entityCode).filter(
      (t) => t.voucher_type_id === voucherTypeId,
    );
    // re-evaluate on dropdown open
  }, [entityCode, voucherTypeId]);

  function applyClone(id: string) {
    const state = cloneTemplateToFormState(entityCode, id);
    onClone(state);
    setConfirmId(null);
    setOpen(false);
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            From Template
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel>Pinned Templates</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {templates.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              No pinned templates for this voucher type yet.
            </div>
          )}
          {templates.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onSelect={(e) => {
                e.preventDefault();
                setConfirmId(t.id);
              }}
              className="flex items-start justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.template_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {t.party_name ?? 'No party'} · {t.line_items.length} line(s)
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {t.use_count}×
              </Badge>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/erp/finecore/pinned-templates')}>
            View All Templates →
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => { if (!o) setConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current voucher data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the party, line items and narration on the current
              voucher with values from the selected template. You can still edit
              before saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmId && applyClone(confirmId)}>
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
