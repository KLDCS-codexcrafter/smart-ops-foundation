/**
 * @file        src/lib/commissioning-templates.ts
 * @purpose     5 industry-standard Commissioning Report templates per Q-LOCK-11a
 * @sprint      T-Phase-1.A.15a SiteX Closeout · Q-LOCK-11a · Block F.2
 */

export interface CommissioningTemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'date' | 'photo' | 'signature';
  required: boolean;
}

export interface CommissioningTemplateSection {
  id: string;
  title: string;
  fields: CommissioningTemplateField[];
}

export interface CommissioningTemplate {
  id: string;
  industry: string;
  template_name: string;
  sections: CommissioningTemplateSection[];
  approval_signatures_required: string[];
}

const f = (id: string, label: string, type: CommissioningTemplateField['type'] = 'text', required = true): CommissioningTemplateField =>
  ({ id, label, type, required });

export const COMMISSIONING_TEMPLATES: CommissioningTemplate[] = [
  {
    id: 'ind-blower',
    industry: 'Industrial Blower',
    template_name: 'Industrial Blower Commissioning Report',
    sections: [
      { id: 'identity', title: 'Identity & Nameplate', fields: [f('model', 'Model'), f('serial', 'Serial No'), f('capacity_cfm', 'Capacity (CFM)', 'number')] },
      { id: 'mechanical', title: 'Mechanical Checks', fields: [f('alignment', 'Alignment OK', 'checkbox'), f('vibration', 'Vibration (mm/s)', 'number'), f('bearing_temp', 'Bearing Temp (°C)', 'number')] },
      { id: 'electrical', title: 'Electrical Checks', fields: [f('insulation', 'Insulation Resistance (MΩ)', 'number'), f('phase_current', 'Phase Currents (A)'), f('earthing', 'Earthing OK', 'checkbox')] },
      { id: 'performance', title: 'Performance Run', fields: [f('flow', 'Flow Rate (CFM)', 'number'), f('static_pressure', 'Static Pressure (mmWC)', 'number'), f('run_hours', 'Continuous Run Hours', 'number')] },
      { id: 'evidence', title: 'Evidence', fields: [f('photo_nameplate', 'Nameplate Photo', 'photo'), f('photo_install', 'Installation Photo', 'photo')] },
    ],
    approval_signatures_required: ['Operix Engineer', 'Customer PMC', 'Customer Operations Head'],
  },
  {
    id: 'cent-pump',
    industry: 'Centrifugal Pump',
    template_name: 'Centrifugal Pump Commissioning Report',
    sections: [
      { id: 'identity', title: 'Identity', fields: [f('model', 'Model'), f('serial', 'Serial No'), f('head_m', 'Head (m)', 'number'), f('flow_lpm', 'Flow (LPM)', 'number')] },
      { id: 'mechanical', title: 'Mechanical', fields: [f('coupling', 'Coupling Alignment OK', 'checkbox'), f('seal', 'Mechanical Seal OK', 'checkbox')] },
      { id: 'performance', title: 'Performance', fields: [f('measured_head', 'Measured Head (m)', 'number'), f('measured_flow', 'Measured Flow (LPM)', 'number')] },
      { id: 'evidence', title: 'Evidence', fields: [f('photo', 'Photo', 'photo')] },
    ],
    approval_signatures_required: ['Operix Engineer', 'Customer'],
  },
  {
    id: 'hvac-ahu',
    industry: 'HVAC AHU',
    template_name: 'HVAC AHU Commissioning Report',
    sections: [
      { id: 'identity', title: 'Identity', fields: [f('tag', 'AHU Tag'), f('cfm', 'CFM', 'number')] },
      { id: 'duct', title: 'Duct & Damper', fields: [f('leak_test', 'Duct Leak Test OK', 'checkbox'), f('damper', 'Damper Operation OK', 'checkbox')] },
      { id: 'tab', title: 'TAB Results', fields: [f('supply_cfm', 'Supply CFM', 'number'), f('return_cfm', 'Return CFM', 'number')] },
    ],
    approval_signatures_required: ['Operix Engineer', 'Customer MEP'],
  },
  {
    id: 'elec-panel',
    industry: 'Electrical Panel',
    template_name: 'Electrical Panel Commissioning Report',
    sections: [
      { id: 'identity', title: 'Identity', fields: [f('panel_tag', 'Panel Tag'), f('rating_amps', 'Rating (A)', 'number')] },
      { id: 'protections', title: 'Protections', fields: [f('mcb_test', 'MCB Trip Test', 'checkbox'), f('rccb_test', 'RCCB Test', 'checkbox'), f('earth_continuity', 'Earth Continuity', 'checkbox')] },
      { id: 'load', title: 'Load Test', fields: [f('phase_balance', 'Phase Balance OK', 'checkbox')] },
    ],
    approval_signatures_required: ['Operix Engineer', 'Customer Electrical'],
  },
  {
    id: 'pipe-spool',
    industry: 'Piping Spool',
    template_name: 'Piping Spool Commissioning Report',
    sections: [
      { id: 'identity', title: 'Identity', fields: [f('line_no', 'Line No'), f('size', 'Size'), f('material', 'Material')] },
      { id: 'tests', title: 'Tests', fields: [f('hydro_test', 'Hydrotest Passed', 'checkbox'), f('pressure', 'Test Pressure (bar)', 'number'), f('duration_hrs', 'Duration (hrs)', 'number')] },
      { id: 'evidence', title: 'Evidence', fields: [f('weld_log', 'Weld Log Attached', 'checkbox')] },
    ],
    approval_signatures_required: ['Operix Engineer', 'Customer Mechanical', 'Customer QC'],
  },
];

export function getTemplateById(id: string): CommissioningTemplate | undefined {
  return COMMISSIONING_TEMPLATES.find((t) => t.id === id);
}
