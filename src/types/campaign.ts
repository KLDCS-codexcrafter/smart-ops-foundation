/**
 * campaign.ts — Marketing campaign master
 * [JWT] GET/POST/PUT/DELETE /api/salesx/campaigns
 */

export type CampaignStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  entity_id: string;
  campaign_code: string;
  campaign_name: string;
  start_date: string;
  end_date: string | null;
  budget: number | null;
  status: CampaignStatus;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const campaignsKey = (e: string) => `erp_campaigns_${e}`;
