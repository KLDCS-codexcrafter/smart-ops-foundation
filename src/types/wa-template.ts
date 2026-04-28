/**
 * wa-template.ts — WhatsApp message templates for Telecaller (T-Phase-1.1.1g)
 * [JWT] GET/POST/PUT/DELETE /api/salesx/wa-templates
 *
 * Variable substitution: {contact}, {company}, {product}, {follow_up_date},
 * {amount}, {salesman}, {entity}
 */

export type WaTemplateCategory =
  | 'introduction'
  | 'follow_up'
  | 'quotation'
  | 'reminder'
  | 'product_info'
  | 'thank_you'
  | 'custom';

export const WA_TEMPLATE_CATEGORY_LABELS: Record<WaTemplateCategory, string> = {
  introduction: 'Introduction',
  follow_up:    'Follow-up',
  quotation:    'Quotation',
  reminder:     'Reminder',
  product_info: 'Product Info',
  thank_you:    'Thank You',
  custom:       'Custom',
};

export interface WaTemplate {
  id: string;
  entity_id: string;
  template_code: string;
  template_name: string;
  category: WaTemplateCategory;
  body: string;
  language: 'en' | 'hi' | 'mixed';
  is_active: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface WaTemplateContext {
  contact?: string | null;
  company?: string | null;
  product?: string | null;
  follow_up_date?: string | null;
  amount?: number | null;
  salesman?: string | null;
  entity?: string | null;
}

export function fillTemplate(body: string, ctx: WaTemplateContext): string {
  return body
    .replace(/\{contact\}/g,        ctx.contact ?? '')
    .replace(/\{company\}/g,        ctx.company ?? '')
    .replace(/\{product\}/g,        ctx.product ?? '')
    .replace(/\{follow_up_date\}/g, ctx.follow_up_date ?? '')
    .replace(/\{amount\}/g,         ctx.amount != null ? `₹${ctx.amount.toLocaleString('en-IN')}` : '')
    .replace(/\{salesman\}/g,       ctx.salesman ?? '')
    .replace(/\{entity\}/g,         ctx.entity ?? '');
}

export const waTemplatesKey = (e: string) => `erp_wa_templates_${e}`;
