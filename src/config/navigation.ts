import { RESOURCES, ACTIONS } from '@/constants/permissions';

export interface NavigationItem {
  title: string;
  abbr?: string;
  name?: string;
  permission?: { resource: string; action: string };
  children?: Array<NavigationItem>;
  // Extra path prefixes that also mark the item active (detail pages whose
  // paths don't start with the item's own path).
  activePaths?: string[];
}

const ADMIN_MANAGE = { resource: RESOURCES.ADMIN, action: ACTIONS.MANAGE };

export const navigationItems: NavigationItem[] = [
  {
    title: 'Systems',
    children: [
      {
        name: 'system:overview',
        title: 'Active System',
        abbr: 'SYS',
      },
      {
        name: 'system-security-plans',
        title: 'Manage Systems',
        permission: { resource: RESOURCES.SSP, action: ACTIONS.READ },
      },
    ],
  },
  {
    name: 'evidence:index',
    title: 'Evidence',
    abbr: 'EV',
    permission: { resource: RESOURCES.EVIDENCE, action: ACTIONS.READ },
  },
  {
    name: 'controls:index',
    title: 'Controls',
    abbr: 'CON',
  },
  {
    name: 'lineage',
    title: 'Compliance Map',
    abbr: 'CM',
  },
  {
    name: 'risks:index',
    title: 'Risk Register',
    abbr: 'RIS',
    permission: { resource: RESOURCES.RISK, action: ACTIONS.READ },
  },
  {
    name: 'dashboards',
    title: 'Evidence Filters',
    abbr: 'FIL',
    permission: { resource: RESOURCES.FILTER, action: ACTIONS.READ },
  },
  {
    title: 'Workflows',
    abbr: 'WF',
    children: [
      {
        name: 'workflow:index',
        title: 'Workflow Definitions',
        abbr: 'WD',
        activePaths: ['/workflow-definitions'],
        permission: {
          resource: RESOURCES.WORKFLOW_DEFINITION,
          action: ACTIONS.READ,
        },
      },
      {
        name: 'workflow-instances:index',
        title: 'Workflow Instances',
        abbr: 'WI',
        activePaths: ['/workflow-executions'],
        permission: {
          resource: RESOURCES.WORKFLOW_INSTANCE,
          action: ACTIONS.READ,
        },
      },
    ],
  },
  {
    title: 'Control Definitions',
    abbr: 'CD',
    children: [
      {
        name: 'catalog-list',
        title: 'Catalogs',
        abbr: 'CAT',
        permission: { resource: RESOURCES.CATALOG, action: ACTIONS.READ },
      },
      {
        name: 'control-links-list',
        title: 'Control Links',
        abbr: 'CL',
        permission: { resource: RESOURCES.CONTROL_LINK, action: ACTIONS.READ },
      },
      {
        name: 'profile-list',
        title: 'Profiles',
        abbr: 'PR',
        permission: { resource: RESOURCES.PROFILE, action: ACTIONS.READ },
      },
    ],
  },
  {
    title: 'Admin',
    children: [
      {
        name: 'admin-risks',
        // Distinct from the workspace "Risk Register".
        title: 'Risk Administration',
        permission: ADMIN_MANAGE,
      },
      {
        name: 'users-list',
        // App sign-in accounts, not an SSP's system users.
        title: 'User Accounts',
        permission: ADMIN_MANAGE,
      },
      {
        name: 'admin-groups',
        title: 'Groups',
        permission: ADMIN_MANAGE,
      },
      {
        name: 'admin-agents',
        title: 'Agents',
        permission: { resource: RESOURCES.AGENT, action: ACTIONS.READ },
      },
      {
        name: 'admin-diagnostics',
        title: 'Diagnostics',
        abbr: 'DIAG',
        permission: ADMIN_MANAGE,
      },
      {
        name: 'admin-import',
        title: 'Import',
        abbr: 'IMP',
        permission: ADMIN_MANAGE,
      },
    ],
  },
];
