/**
 * SelectCompanyGate.tsx — Blocking gate rendered when user has 'All Companies'
 * selected on a page that requires a specific entity.
 *
 * PURPOSE
 * FinCorePage (and any other future page that is entity-specific) displays this
 * instead of falling back to a default entity silently. User picks a company
 * via the cards; gate unmounts once selectedCompany !== 'all'.
 *
 * INPUT        title? (default: 'Select a company to continue')
 *              description? (default explains per-company data scoping)
 *
 * OUTPUT       UI. Clicking a company card calls setSelectedCompany via Context.
 *
 * DEPENDENCIES react, useERPCompanyContext, useEntityList, shadcn Card + Badge.
 *
 * TALLY-ON-TOP Neutral. Entity selection is platform-wide.
 *
 * SPEC DOC     Sprint T10-pre.1c Session B.1 — per Q2 rich gate.
 *
 * REUSABILITY
 * Other Command Center pages that don't support consolidated mode can import
 * this component. FinCorePage is the first consumer; other cards adopt the
 * pattern as they hit the need (Q3 — not enforced platform-wide this sprint).
 */
import { Building2, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useERPCompanyContext } from '@/components/layout/ERPCompanyProvider';
import { useEntityList } from '@/hooks/useEntityList';

interface SelectCompanyGateProps {
  title?: string;
  description?: string;
}

export function SelectCompanyGate({
  title = 'Select a company to continue',
  description = "This page works per company. Data is scoped to the selected entity. Pick one below or use the company dropdown in the header.",
}: SelectCompanyGateProps) {
  const [, setSelectedCompany] = useERPCompanyContext();
  const { entities } = useEntityList();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-2">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">{description}</p>
        </div>

        {entities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No entities configured yet. Go to{' '}
              <a href="/erp/command-center" className="text-primary underline">Command Center → Entity Management</a>{' '}
              to set up your first company.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entities.map(entity => (
              <button
                key={entity.id}
                onClick={() => void setSelectedCompany(entity.id)}
                className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{entity.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {entity.shortCode && (
                          <Badge variant="outline" className="text-[10px] font-mono">{entity.shortCode}</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] capitalize">{entity.entityType}</Badge>
                      </div>
                      {entity.gstin && (
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 truncate">{entity.gstin}</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="text-[11px] text-center text-muted-foreground">
          Consolidated view across all companies is coming in Horizon 1.5 (Group P&amp;L, Consolidated Trial Balance).
        </p>
      </div>
    </div>
  );
}

export default SelectCompanyGate;
