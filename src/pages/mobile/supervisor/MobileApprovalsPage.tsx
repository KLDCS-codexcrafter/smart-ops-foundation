/**
 * MobileApprovalsPage.tsx — Pending approvals (Phase 1 stub)
 * Sprint T-Phase-1.1.1l-c
 */
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function MobileApprovalsPage() {
  const navigate = useNavigate();
  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/supervisor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Approvals</h1>
      </div>
      <Card className="p-6 flex flex-col items-center text-center gap-3">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">No pending approvals</p>
        <p className="text-xs text-muted-foreground">
          Visit log corrections and lead reassignment requests will appear here in Phase 2.
        </p>
      </Card>
    </div>
  );
}
