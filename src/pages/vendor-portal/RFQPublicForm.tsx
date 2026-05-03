/**
 * @file        RFQPublicForm.tsx
 * @sprint      T-Phase-1.2.6f-a-fix · FIX-6 · D-255 STUB placeholder
 */
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RFQPublicForm(): JSX.Element {
  const { rfqId } = useParams<{ rfqId: string }>();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const entity = params.get('entity') ?? '';

  return (
    <div className="min-h-screen p-6 flex items-center justify-center bg-muted/20">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Vendor RFQ Public Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            RFQ <span className="font-mono">{rfqId}</span> · entity <span className="font-mono">{entity}</span>
          </p>
          <p className="text-muted-foreground">
            Token: <span className="font-mono break-all">{token.slice(0, 16)}…</span>
          </p>
          <p className="pt-4 border-t">
            Vendor portal full quotation form is delivered in Sprint 3-b (SupplyX foundation).
            Until then, this URL confirms your token is valid · please respond via email or contact procurement directly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
