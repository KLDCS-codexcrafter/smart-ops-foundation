/**
 * KeyboardShortcutOverlay · Sprint T-Phase-2.7-d-2
 *
 * Modal triggered by F1 / ? / Ctrl+/ · shows universal + form-specific bindings
 * with source attribution table for IP-defensive transparency.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UNIVERSAL_FORM_BINDINGS,
  type ShortcutAction,
  type ShortcutBinding,
} from '@/lib/form-keyboard-engine';

interface Props {
  open: boolean;
  onClose: () => void;
  contextBindings?: ShortcutBinding[];
  formName?: string;
}

interface Group {
  title: string;
  actions: ShortcutAction[];
}

const GROUPS: Group[] = [
  { title: 'Voucher commands', actions: ['save_draft', 'save_post', 'save_and_new'] },
  { title: 'Cell-level',       actions: ['edit_cell', 'open_picker'] },
  { title: 'Search',           actions: ['find_in_voucher', 'find_replace'] },
  { title: 'History',          actions: ['undo', 'redo'] },
  { title: 'Grid operations',  actions: ['insert_line', 'delete_line', 'duplicate_line', 'merge_with_above', 'move_line_up', 'move_line_down'] },
  { title: 'Navigation',       actions: ['goto_line'] },
  { title: 'Help / Safety',    actions: ['help', 'cancel_or_close'] },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
      {children}
    </kbd>
  );
}

function BindingRow({ b }: { b: ShortcutBinding }) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b border-border/40 py-1.5 text-sm">
      <div className="col-span-3"><Kbd>{b.combo}</Kbd></div>
      <div className="col-span-6 text-foreground">{b.description}</div>
      <div className="col-span-3">
        <span className="text-xs text-muted-foreground">{b.source}</span>
      </div>
    </div>
  );
}

export function KeyboardShortcutOverlay({ open, onClose, contextBindings, formName }: Props) {
  const groupedUniversal = GROUPS.map((g) => ({
    title: g.title,
    bindings: UNIVERSAL_FORM_BINDINGS.filter((b) => g.actions.includes(b.action)),
  }));
  const sources = Array.from(new Set(UNIVERSAL_FORM_BINDINGS.map((b) => b.source))).sort();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts{formName ? ` · ${formName}` : ''}</DialogTitle>
          <DialogDescription>
            All bindings sourced from public standards (W3C ARIA · MS Office · IBM PC · Excel · HTML5).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {groupedUniversal.map((g) => (
            g.bindings.length === 0 ? null : (
              <section key={g.title}>
                <h3 className="mb-1 text-sm font-semibold text-foreground">{g.title}</h3>
                <div className="rounded-lg border border-border bg-card/40 px-3">
                  {g.bindings.map((b) => <BindingRow key={b.combo} b={b} />)}
                </div>
              </section>
            )
          ))}

          {contextBindings && contextBindings.length > 0 && (
            <section>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Form-specific</h3>
              <div className="rounded-lg border border-border bg-card/40 px-3">
                {contextBindings.map((b) => <BindingRow key={b.combo} b={b} />)}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-1 text-sm font-semibold text-foreground">Source attribution</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Per Lotus v. Borland (1995) + Oracle v. Google (2021) · methods of operation are not copyrightable.
              Excel/Office-style keyboard navigation · NO third-party trade-dress copying.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          </section>
        </div>

        <DialogFooter>
          <span className="mr-auto text-xs text-muted-foreground">Press Esc to close · Press F1 anytime to reopen</span>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
