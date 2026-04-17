/**
 * opportunity.ts — CRM Pipeline deal
 * [JWT] GET/POST/PUT/DELETE /api/salesx/opportunities
 */

export type DealStage =
  | 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost'
  | 'requirement_analysis' | 'solution_design' | 'demo_poc'
  | 'technical_approval' | 'commercial_proposal'
  | 'commercial_approval' | 'contract';

export interface StageConfig {
  id: DealStage;
  label: string;
  probability: number;
  color: 'blue' | 'cyan' | 'teal' | 'yellow' | 'orange' | 'purple' | 'indigo' | 'green' | 'red';
}

export const STANDARD_STAGES: StageConfig[] = [
  { id: 'discovery',     label: 'Discovery',     probability: 10,  color: 'blue'   },
  { id: 'qualification', label: 'Qualification', probability: 25,  color: 'yellow' },
  { id: 'proposal',      label: 'Proposal',      probability: 50,  color: 'orange' },
  { id: 'negotiation',   label: 'Negotiation',   probability: 75,  color: 'purple' },
  { id: 'won',           label: 'Won',           probability: 100, color: 'green'  },
  { id: 'lost',          label: 'Lost',          probability: 0,   color: 'red'    },
];

export const SOLUTIONS_STAGES: StageConfig[] = [
  { id: 'requirement_analysis', label: 'Requirement Analysis', probability: 10,  color: 'blue'   },
  { id: 'solution_design',      label: 'Solution Design',      probability: 20,  color: 'cyan'   },
  { id: 'demo_poc',             label: 'Demo / PoC',           probability: 35,  color: 'teal'   },
  { id: 'technical_approval',   label: 'Technical Approval',   probability: 50,  color: 'yellow' },
  { id: 'commercial_proposal',  label: 'Commercial Proposal',  probability: 65,  color: 'orange' },
  { id: 'commercial_approval',  label: 'Commercial Approval',  probability: 80,  color: 'purple' },
  { id: 'contract',             label: 'Contract',             probability: 90,  color: 'indigo' },
  { id: 'won',                  label: 'Won',                  probability: 100, color: 'green'  },
  { id: 'lost',                 label: 'Lost',                 probability: 0,   color: 'red'    },
];

export interface Opportunity {
  id: string;
  entity_id: string;
  opportunity_no: string;
  opportunity_date: string;
  deal_name: string;
  customer_id: string | null;
  customer_name: string | null;
  enquiry_id: string | null;
  stage: DealStage;
  pipeline_type: 'standard' | 'solutions';
  deal_value: number;
  probability: number;
  expected_close_date: string | null;
  sales_owner_id: string | null;
  sales_owner_name: string | null;
  next_action: string | null;
  next_action_date: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const opportunitiesKey = (e: string) => `erp_opportunities_${e}`;
