/**
 * campaign-template.ts — Multi-channel campaign templates · Canvas Wave 6 (T-Phase-1.1.1j)
 * [JWT] GET/POST/PUT/DELETE /api/salesx/campaign-templates
 *
 * 4 channels coordinated: WhatsApp · Email · SMS · Call
 */

import type { CampaignType } from '@/types/campaign';

export type ChannelKind = 'whatsapp' | 'email' | 'sms' | 'call';

export const CHANNEL_LABELS: Record<ChannelKind, string> = {
  whatsapp: 'WhatsApp',
  email:    'Email',
  sms:      'SMS',
  call:     'Call',
};

export const CHANNEL_COLORS: Record<ChannelKind, string> = {
  whatsapp: 'bg-green-500/15 text-green-700 border-green-500/30',
  email:    'bg-blue-500/15 text-blue-700 border-blue-500/30',
  sms:      'bg-purple-500/15 text-purple-700 border-purple-500/30',
  call:     'bg-orange-500/15 text-orange-700 border-orange-500/30',
};

export interface TemplateChannelStep {
  id: string;
  channel: ChannelKind;
  day_offset: number;
  hour_of_day: number;
  subject: string | null;
  body: string;
  is_active: boolean;
}

export interface CampaignTemplate {
  id: string;
  entity_id: string;
  template_code: string;
  template_name: string;
  campaign_type: CampaignType;
  description: string | null;
  channel_steps: TemplateChannelStep[];
  use_count: number;
  is_active: boolean;
  is_built_in: boolean;
  created_at: string;
  updated_at: string;
}

export const campaignTemplatesKey = (e: string) => `erp_campaign_templates_${e}`;
