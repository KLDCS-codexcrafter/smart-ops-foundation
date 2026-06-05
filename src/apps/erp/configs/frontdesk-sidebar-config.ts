/**
 * @file        src/apps/erp/configs/frontdesk-sidebar-config.ts
 * @purpose     FrontDesk canonical sidebar · 'f *' keyboard namespace.
 * @sprint      Sprint 145 (base) + Sprint 146 (Meeting Rooms + Executive Desk) + S146.T2 hotfix
 * @decisions   D-NEW-CC keyboard namespace 'f *' · D-250 Shell pattern lock · FR-58.
 * @note        S146.T2 · per-item requiredCards REMOVED to match institutional sibling
 *              pattern (taskflow/comply360/etc ship with zero per-item gating).
 *              Card-level access is enforced at the dashboard layer.
 */
import {
  Home, Users, UserPlus, LogIn, BookUser, ShieldAlert, ClipboardList,
  DoorOpen, CalendarRange, Briefcase, Mail, Inbox, Send, Package, ClipboardCheck,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';


export const frontdeskSidebarItems: SidebarItem[] = [
  {
    id: 'welcome', type: 'item', label: 'Welcome', icon: Home,
    moduleId: 'welcome', keyboard: 'f w',
  },
  {
    id: 'visitors-group', type: 'group', label: 'Visitors', icon: Users,
    children: [
      { id: 'visitors', type: 'item', label: 'Visitors Register', icon: Users, moduleId: 'visitors', keyboard: 'f v' },
      { id: 'plan-visit', type: 'item', label: 'Plan Visit', icon: UserPlus, moduleId: 'plan-visit', keyboard: 'f p' },
      { id: 'check-in', type: 'item', label: 'Walk-in Check-in', icon: LogIn, moduleId: 'check-in', keyboard: 'f i' },
      { id: 'roll-call', type: 'item', label: 'Roll-Call / Muster', icon: ClipboardList, moduleId: 'roll-call', keyboard: 'f r' },
    ],
  },
  {
    id: 'meeting-rooms-group', type: 'group', label: 'Meeting Rooms', icon: DoorOpen,
    children: [
      { id: 'meeting-rooms', type: 'item', label: 'Room Board', icon: DoorOpen, moduleId: 'meeting-rooms', keyboard: 'f m' },
      { id: 'booking-calendar', type: 'item', label: 'Calendar', icon: CalendarRange, moduleId: 'booking-calendar', keyboard: 'f b' },
    ],
  },
  {
    id: 'executive-desk-group', type: 'group', label: 'Executive Desk', icon: Briefcase,
    children: [
      { id: 'executive-desk', type: 'item', label: 'Day View', icon: Briefcase, moduleId: 'executive-desk', keyboard: 'f e' },
    ],
  },
  {
    id: 'contacts-group', type: 'group', label: 'Contacts', icon: BookUser,
    children: [
      { id: 'contact-book', type: 'item', label: 'Contact Book', icon: BookUser, moduleId: 'contact-book', keyboard: 'f c' },
      { id: 'watchlist', type: 'item', label: 'Watchlist', icon: ShieldAlert, moduleId: 'watchlist', keyboard: 'f l' },
    ],
  },
];
