/**
 * @file        src/apps/erp/configs/frontdesk-sidebar-config.ts
 * @purpose     FrontDesk canonical sidebar · 'f *' keyboard namespace.
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Pillar A.6-F · Block 4
 * @decisions   D-NEW-CC keyboard namespace 'f *' · D-250 Shell pattern lock · FR-58.
 * @reuses      @/shell/types SidebarItem · lucide-react.
 * @[JWT]       N/A (config only)
 */
import {
  Home, Users, UserPlus, LogIn, BookUser, ShieldAlert, ClipboardList,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const frontdeskSidebarItems: SidebarItem[] = [
  {
    id: 'welcome', type: 'item', label: 'Welcome', icon: Home,
    moduleId: 'welcome', requiredCards: ['frontdesk'], keyboard: 'f w',
  },
  {
    id: 'visitors-group', type: 'group', label: 'Visitors', icon: Users,
    children: [
      {
        id: 'visitors', type: 'item', label: 'Visitors Register', icon: Users,
        moduleId: 'visitors', requiredCards: ['frontdesk'], keyboard: 'f v',
      },
      {
        id: 'plan-visit', type: 'item', label: 'Plan Visit', icon: UserPlus,
        moduleId: 'plan-visit', requiredCards: ['frontdesk'], keyboard: 'f p',
      },
      {
        id: 'check-in', type: 'item', label: 'Walk-in Check-in', icon: LogIn,
        moduleId: 'check-in', requiredCards: ['frontdesk'], keyboard: 'f i',
      },
      {
        id: 'roll-call', type: 'item', label: 'Roll-Call / Muster', icon: ClipboardList,
        moduleId: 'roll-call', requiredCards: ['frontdesk'], keyboard: 'f r',
      },
    ],
  },
  {
    id: 'contacts-group', type: 'group', label: 'Contacts', icon: BookUser,
    children: [
      {
        id: 'contact-book', type: 'item', label: 'Contact Book', icon: BookUser,
        moduleId: 'contact-book', requiredCards: ['frontdesk'], keyboard: 'f c',
      },
      {
        id: 'watchlist', type: 'item', label: 'Watchlist', icon: ShieldAlert,
        moduleId: 'watchlist', requiredCards: ['frontdesk'], keyboard: 'f l',
      },
    ],
  },
];
