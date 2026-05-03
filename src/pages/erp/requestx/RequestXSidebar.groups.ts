/**
 * @file        RequestXSidebar.groups.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 */
import type { RequestXModule } from './RequestXSidebar.types';

export interface RequestXGroup {
  id: string;
  label: string;
  modules: { id: RequestXModule; label: string }[];
}

export const REQUESTX_GROUPS: RequestXGroup[] = [
  {
    id: 'transactions',
    label: 'Transactions',
    modules: [
      { id: 'tx-material-indent', label: 'Material Indent' },
      { id: 'tx-service-request', label: 'Service Request' },
      { id: 'tx-capital-indent',  label: 'Capital Indent' },
      { id: 'tx-approval-inbox',  label: 'Approval Inbox' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    modules: [
      { id: 'rpt-indent-register', label: 'Indent Register' },
      { id: 'rpt-indent-pending',  label: 'Pending' },
      { id: 'rpt-indent-closed',   label: 'Closed' },
    ],
  },
  {
    id: 'masters',
    label: 'Masters',
    modules: [
      { id: 'master-departments', label: 'Department Master' },
    ],
  },
];
