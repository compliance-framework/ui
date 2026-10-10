import { RESOURCES, ACTIONS } from '@/constants/permissions';

export interface NavigationItem {
  title: string;
  abbr?: string;
  name?: string;
  permission?: { resource: string; action: string };
  children?: Array<NavigationItem>;
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
        permission: {
          resource: RESOURCES.WORKFLOW_DEFINITION,
          action: ACTIONS.READ,
        },
      },
      {
        name: 'workflow-instances:index',
        title: 'Workflow Instances',
        abbr: 'WI',
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
        title: 'Risks',
        permission: ADMIN_MANAGE,
      },
      {
        name: 'users-list',
        title: 'System Users',
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
