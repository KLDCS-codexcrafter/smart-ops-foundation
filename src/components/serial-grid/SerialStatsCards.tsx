import { useSerialNumbers } from '@/hooks/useSerialNumbers';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export function SerialStatsCards() {
  const { serials } = useSerialNumbers();
  const today = new Date();
  const available = serials.filter(s => s.status === 'available').length;
  const sold = serials.filter(s => s.status === 'sold').length;
  const inRepair = serials.filter(s => s.status === 'in_repair').length;
  const warrantyActive = serials.filter(s =>
    s.warranty_end_date && new Date(s.warranty_end_date) >= today
  ).length;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Serials</CardDescription>
          <CardTitle className="text-2xl">{serials.length}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Available</CardDescription>
          <CardTitle className="text-2xl text-emerald-600">{available}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Sold / Deployed</CardDescription>
          <CardTitle className="text-2xl">{sold}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5 text-emerald-600">
            <Shield className="h-3.5 w-3.5" /> Warranty Active
          </CardDescription>
          <CardTitle className="text-2xl text-emerald-600">{warrantyActive}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
