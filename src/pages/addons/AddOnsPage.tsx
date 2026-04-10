import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Puzzle } from 'lucide-react';

const ADDONS = [
  {
    id: 'barcode',
    title: 'Barcode',
    icon: QrCode,
    description: 'Standalone barcode generation for Tally users — pull items, generate labels, print.',
    route: '/add-ons/barcode',
    phase: 'Phase 2 Planned',
  },
];

export default function AddOnsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Puzzle className="h-6 w-6" />Add-ons</h1>
          <p className="text-sm text-muted-foreground">Standalone modules that extend 4DSmartOps without requiring the full ERP</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADDONS.map(a => (
            <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(a.route)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <a.icon className="h-8 w-8 text-primary" />
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">{a.phase}</Badge>
                </div>
                <CardTitle className="text-lg mt-2">{a.title}</CardTitle>
                <CardDescription className="text-xs">{a.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Click to view details →</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
