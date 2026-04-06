import { Building2, Globe, Mail, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PreviewData {
  legalEntityName?: string;
  tradingBrandName?: string;
  businessEntity?: string;
  industry?: string;
  hqCity?: string;
  hqCountry?: string;
  corporateEmail?: string;
  website?: string;
  status?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  shortCode?: string;
}

export function CompanyProfilePreview({ data }: { data: PreviewData }) {
  const primary = data.primaryColor || '#0D9488';
  const secondary = data.secondaryColor || '#1E1B2E';
  const name = data.legalEntityName || 'Your Company Name';

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      {/* Gradient header */}
      <div
        className="px-5 py-6 text-white"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
      >
        <div className="flex items-center gap-3 mb-3">
          {data.logo ? (
            <img src={data.logo} alt="Logo" className="h-10 w-10 rounded-lg object-cover bg-white/20" />
          ) : (
            <Building2 className="h-8 w-8 opacity-70" />
          )}
          <div>
            <p className="font-bold text-sm">{name}</p>
            {data.tradingBrandName && (
              <p className="text-xs opacity-80">{data.tradingBrandName}</p>
            )}
          </div>
        </div>
        {data.shortCode && (
          <Badge className="bg-white/20 text-white border-white/30 text-[10px] mb-2">
            {data.shortCode}
          </Badge>
        )}
        {data.industry && (
          <p className="text-xs opacity-70">{data.businessEntity} · {data.industry}</p>
        )}
      </div>

      {/* Light card body */}
      <div className="p-4 bg-card space-y-2">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        {data.tradingBrandName && (
          <p className="text-xs text-muted-foreground">{data.tradingBrandName}</p>
        )}
        {data.status && (
          <Badge variant="outline" className="text-[10px]">{data.status}</Badge>
        )}
        {data.industry && (
          <p className="text-xs text-muted-foreground">{data.businessEntity} · {data.industry}</p>
        )}
        {data.hqCity && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {data.hqCity}{data.hqCountry ? `, ${data.hqCountry}` : ''}
          </p>
        )}
        {data.corporateEmail && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {data.corporateEmail}
          </p>
        )}
        {data.website && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {data.website}
          </p>
        )}
      </div>
    </div>
  );
}
