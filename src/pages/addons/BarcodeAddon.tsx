import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode, ArrowLeft, CheckCircle2, Download, Printer, Palette, IndianRupee } from 'lucide-react';

const FEATURES = [
  { icon: Download, title: 'Pull from Tally', desc: 'Import item masters directly from Tally ERP via the Bridge sync engine. No manual data entry — items flow automatically with code, name, HSN, and UOM.' },
  { icon: QrCode, title: 'Generate Barcodes', desc: 'Create EAN-13, QR, Code 128, and other barcode formats for every item. Supports batch generation for hundreds of SKUs in one go.' },
  { icon: Palette, title: 'Design & Print', desc: 'Pick from pre-built label templates or design custom layouts. Send to thermal printers, A4 sheet printers, or export as PDF for external printing.' },
];

const COMPARE = [
  { feature: 'Item Source', erp: 'Native Item Craft module', addon: 'Tally via Bridge sync' },
  { feature: 'Label Templates', erp: '13 types (9 standard + 4 compliance)', addon: '4 types (product, price, shelf, carton)' },
  { feature: 'Barcode Types', erp: '8 types incl. GS1-128, DataMatrix', addon: '4 types (EAN-13, QR, Code128, ITF-14)' },
  { feature: 'Print Queue', erp: 'Full queue with reprint tracking', addon: 'Basic queue (print & done)' },
  { feature: 'Asset Tags', erp: 'Full asset tag + custody transfer', addon: 'Not included' },
  { feature: 'RFID', erp: 'RFID Manager with bulk scan', addon: 'Not included' },
  { feature: 'Bin Labels', erp: 'Full bin location labels', addon: 'Not included' },
  { feature: 'Compliance Labels', erp: 'MRP, FSSAI, Drug, EPR', addon: 'Not included' },
  { feature: 'Requires ERP?', erp: 'Yes — full ERP subscription', addon: 'No — Tally only' },
];

const STEPS = [
  { step: 1, title: 'Create Add-on Shell', desc: 'Set up /add-ons/barcode route with its own layout (no ERP sidebar). Standalone header with branding.' },
  { step: 2, title: 'Build Tally Item Importer', desc: 'Use Bridge sync profiles to pull item masters from Tally. Map Tally fields (Name, HSN, UOM, Group) to add-on item schema.' },
  { step: 3, title: 'Barcode Generation Engine', desc: 'Reuse barcode type definitions from ERP but limit to 4 types. Build simplified job creation flow.' },
  { step: 4, title: 'Template Selector', desc: 'Offer 4 pre-built templates. No custom template builder — keep it simple for Tally-only users.' },
  { step: 5, title: 'Print & Export', desc: 'Direct print to thermal/A4 printers. PDF export option. Basic print history (no reprint tracking).' },
];

const SAAS_TIERS = [
  {
    name: 'Starter',
    price: '₹299 – ₹499 / month',
    skus: 'Up to 500 SKUs',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    conditions: [
      'Tally item master import via Bridge — single Tally company',
      '4 barcode types — EAN-13, QR Code, Code 128, ITF-14',
      '4 pre-built label templates — Product, Price, Shelf, Carton',
      'Batch generation up to 100 labels per job',
      'Print to thermal and A4 printers · PDF export',
      'Basic print history — last 30 days only',
      'No custom template builder · No compliance labels · No RFID',
    ],
  },
  {
    name: 'Growth',
    price: '₹999 – ₹1,499 / month',
    skus: 'Up to 5,000 SKUs',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    conditions: [
      'Everything in Starter',
      'Multiple Tally companies OR CSV / Excel item import',
      '6 barcode types — adds GS1-128 and PDF417',
      'Custom template builder — drag-and-drop field placement',
      'Batch generation up to 1,000 labels per job',
      'Full print queue with reprint tracking and job history',
      'Bulk barcode export as ZIP of image files',
      'No compliance labels (MRP, FSSAI, Drug, EPR)',
    ],
  },
  {
    name: 'Professional',
    price: '₹2,499 – ₹3,999 / month',
    skus: 'Unlimited SKUs',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    conditions: [
      'Everything in Growth',
      'All 8 barcode types — adds DataMatrix, GS1-DataBar, Aztec',
      'Compliance labels — MRP, FSSAI, Drug Schedule, EPR mandate',
      'Asset tags with custody transfer and scan-in / scan-out tracking',
      'Bin location labels for warehouse rack and shelf layout',
      'RFID Manager — tag encoding, bulk scan, read verification',
      'Unlimited batch size per job',
      'API access for programmatic label generation',
    ],
  },
];

export default function BarcodeAddon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Top nav */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/add-ons')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Add-ons
        </Button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Barcode — Standalone Add-on</h1>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Phase 2</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Barcode generation for businesses using Tally ERP — without requiring the full 4DSmartOps ERP module.</p>
          </div>
        </div>

        {/* What this Add-on does */}
        <div className="rounded-lg border-2 border-dashed p-6">
          <h2 className="text-lg font-semibold mb-2">What this Add-on does</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Many businesses run Tally for accounting but need professional barcode labels for their inventory.
            This standalone add-on connects to Tally via the Bridge sync engine, pulls item masters automatically,
            and lets users generate, design, and print barcode labels — without purchasing or learning the full ERP system.
            It's a focused, affordable tool for the specific job of labelling products.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <Card key={f.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <f.icon className="h-5 w-5 text-primary" />{f.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison table */}
        <div>
          <h2 className="text-lg font-semibold mb-3">ERP vs Add-on Comparison</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>ERP (Full Module)</TableHead>
                  <TableHead>Add-on (Standalone)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARE.map(r => (
                  <TableRow key={r.feature}>
                    <TableCell className="font-medium text-sm">{r.feature}</TableCell>
                    <TableCell className="text-sm">{r.erp}</TableCell>
                    <TableCell className="text-sm">{r.addon}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Developer guide */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Developer Build Guide</h2>
          <div className="space-y-3">
            {STEPS.map(s => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{s.step}</div>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Phase 2 */}
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Why Phase 2?</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              The full ERP Label & Identity infrastructure (Label Templates, Barcode Generator, Asset Tags, Bin Labels, Print Queue, RFID Manager)
              must be production-stable first. The add-on reuses core barcode logic but wraps it in a simplified, standalone experience.
              Phase 1 (ERP) is complete — Phase 2 (Add-on) begins after ERP stabilisation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
