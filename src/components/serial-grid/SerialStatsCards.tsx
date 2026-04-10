import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, CheckCircle, Wrench, Shield } from 'lucide-react';
import type { SerialNumber } from '@/types/serial-number';

interface Props {
  serials: SerialNumber[];
}

const SerialStatsCards: React.FC<Props> = ({ serials }) => {
  const today = new Date();
  const available = serials.filter(s => s.status === 'available').length;
  const sold = serials.filter(s => s.status === 'sold').length;
  const inRepair = serials.filter(s => s.status === 'in_repair').length;
  const warrantyActive = serials.filter(s =>
    s.warranty_end_date && new Date(s.warranty_end_date) >= today
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Total Units
          </CardDescription>
          <CardTitle className="text-2xl">{serials.length}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle className="h-3.5 w-3.5" /> Available
          </CardDescription>
          <CardTitle className="text-2xl text-emerald-600">{available}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5 text-amber-600">
            <Wrench className="h-3.5 w-3.5" /> In Repair
          </CardDescription>
          <CardTitle className="text-2xl text-amber-600">{inRepair}</CardTitle>
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
};

export default SerialStatsCards;
