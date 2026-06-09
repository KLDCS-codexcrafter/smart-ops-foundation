/**
 * @file     src/apps/erp/configs/_all-sidebar-configs.ts
 * @sprint   PRUDENT360 · T-P360-DevTeam-Hub
 * @purpose  Re-export barrel for every per-card sidebar config so the
 *           prudent360-engine can AUTO-DERIVE the Screen Directory without
 *           knowing individual file paths. NEW cards plug in here only —
 *           the engine consumes this barrel.
 * @canon    Read-only re-export. NEVER mutates any sidebar config.
 */
export { commandCenterSidebarItems } from './command-center-sidebar-config';
export { comply360SidebarItems }     from './comply360-sidebar-config';
export { docVaultSidebarItems }      from './docvault-sidebar-config';
export { ecomxSidebarItems }         from './ecomx-sidebar-config';
export { engineeringxSidebarItems }  from './engineeringx-sidebar-config';
export { eximxUnifiedSidebarItems }  from './eximx-unified-sidebar-config';
export { fpaPlanningSidebarItems }   from './fpa-planning-sidebar-config';
export { frontdeskSidebarItems }     from './frontdesk-sidebar-config';
export { gateflowSidebarItems }      from './gateflow-sidebar-config';
export { insightxSidebarItems }      from './insightx-sidebar-config';
export { maintainproSidebarItems }   from './maintainpro-sidebar-config';
export { procure360SidebarItems }    from './procure360-sidebar-config';
export { productionSidebarItems }    from './production-sidebar-config';
export { qualicheckSidebarItems }    from './qualicheck-sidebar-config';
export { requestxSidebarItems }      from './requestx-sidebar-config';
export { servicedeskSidebarItems }   from './servicedesk-sidebar-config';
export { sitexSidebarItems }         from './sitex-sidebar-config';
export { storeHubSidebarItems }      from './store-hub-sidebar-config';
export { taskflowSidebarItems }      from './taskflow-sidebar-config';
export { vendorPortalSidebarItems }  from './vendor-portal-sidebar-config';
export { webstorexSidebarItems }     from './webstorex-sidebar-config';
