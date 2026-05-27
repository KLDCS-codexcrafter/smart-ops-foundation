/**
 * AIFAClassificationPanel.tsx — Sprint 68 FAR-4 Prompt A Block 5 thin glue
 * Wraps ai-fa-classification-engine into UI.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { classifyFA, type ClassificationResult } from '@/lib/ai-fa-classification-engine';

interface Props { entityCode: string }

export function AIFAClassificationPanel(_props: Props) {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<ClassificationResult | null>(null);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI FA Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Enter asset description (e.g. CNC milling machine)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <Button onClick={() => setResult(classifyFA(description))} disabled={!description.trim()}>
            Classify
          </Button>
          {result && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Badge variant="default">{result.suggested_category}</Badge>
                <span className="text-sm font-mono text-muted-foreground">
                  Confidence: {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>
              {result.matched_keywords.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Matched: {result.matched_keywords.join(', ')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
