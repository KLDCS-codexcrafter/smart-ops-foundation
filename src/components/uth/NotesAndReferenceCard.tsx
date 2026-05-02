/**
 * @file     NotesAndReferenceCard.tsx — Drop-in form card for UTH header fields
 * @sprint   T-Phase-1.2.6d-hdr · D-228 UTH form-side wiring
 *
 * Renders 3 inputs: Reference No (vendor/customer doc), Narration (free text)
 * and an Override Reason textarea that activates only when a duplicate
 * reference_no collision is detected by the parent (Q7-b hard-block path).
 *
 * Designed to be controlled by the parent form. Parent provides:
 *   - referenceNo / setReferenceNo
 *   - narration / setNarration
 *   - duplicateError (string | null) — message from checkDuplicateReference
 *   - overrideReason / setOverrideReason
 *
 * [JWT] No API calls — values flow through the parent's save handler.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, FileText } from 'lucide-react';

interface Props {
  referenceNo: string;
  setReferenceNo: (v: string) => void;
  /** Label shown next to "Reference No" — varies by transaction type */
  referenceLabel?: string;
  /** Helper text under the reference field */
  referenceHelp?: string;
  narration: string;
  setNarration: (v: string) => void;
  /** Non-null when a duplicate collision has been detected (Q7-b) */
  duplicateError?: string | null;
  overrideReason?: string;
  setOverrideReason?: (v: string) => void;
  /** Hide the duplicate-check UI entirely (sales-non-IM, ProjX, dispatch) */
  showOverrideField?: boolean;
}

export function NotesAndReferenceCard({
  referenceNo, setReferenceNo,
  referenceLabel = 'Reference No',
  referenceHelp,
  narration, setNarration,
  duplicateError = null,
  overrideReason = '',
  setOverrideReason,
  showOverrideField = false,
}: Props) {
  const overrideValid = overrideReason.trim().length >= 10;
  const showOverride = showOverrideField && !!duplicateError && !!setOverrideReason;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Notes &amp; Reference
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="uth-reference-no" className="text-xs">{referenceLabel}</Label>
          <Input
            id="uth-reference-no"
            value={referenceNo}
            onChange={e => setReferenceNo(e.target.value)}
            placeholder="e.g. INV-7841 / PO-2026-0093"
            className="font-mono text-sm"
          />
          {referenceHelp && (
            <p className="text-xs text-muted-foreground mt-1">{referenceHelp}</p>
          )}
          {duplicateError && (
            <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{duplicateError}</span>
            </div>
          )}
        </div>

        {showOverride && (
          <div>
            <Label htmlFor="uth-override-reason" className="text-xs">
              Override Reason <span className="text-muted-foreground">(min 10 characters)</span>
            </Label>
            <Textarea
              id="uth-override-reason"
              value={overrideReason}
              onChange={e => setOverrideReason!(e.target.value)}
              placeholder="State the business reason for re-using this reference number..."
              className="text-sm min-h-[60px]"
            />
            <p className={`text-xs mt-1 ${overrideValid ? 'text-success' : 'text-muted-foreground'}`}>
              {overrideValid
                ? '✓ Override reason satisfies the 10-character minimum'
                : `${overrideReason.trim().length}/10 characters`}
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="uth-narration" className="text-xs">Narration</Label>
          <Textarea
            id="uth-narration"
            value={narration}
            onChange={e => setNarration(e.target.value)}
            placeholder="Free-text notes — e.g. damaged carton replaced, partial delivery, urgent dispatch..."
            className="text-sm min-h-[60px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
