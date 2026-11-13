import type { IconName } from '@/ds/components/Icon/icons';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

/**
 * Primary navigation for the design-system shell. It keeps the classic app's structure and
 * labels (src/views/LeftSideNav.vue): This System, then Global with its Evidence link and the
 * Analysis, Integrations, Control Definitions and Admin groups.
 *
 * During the migration most destinations are still classic pages. Items with `next: true` are
 * redesigned screens that render inside this shell; the rest open the classic layout. A
 * redesigned system page takes the system from its URL (`:systemId`); classic system pages read
 * the current system from the system store, which the URL keeps in step.
 */
export interface NavItem {
  /** Route name. */
  route: string;
  label: string;
  icon: IconName;
  /** Rendered by a redesigned screen inside this shell. */
  next?: boolean;
  /** Hidden unless the user may perform (resource, action). */
  permission?: { resource: string; action: string };
}

export interface NavGroup {
  /** `system` groups are titled with the current system's name. */
  id:
    'system' | 'global' | 'analysis' | 'integrations' | 'frameworks' | 'admin';
  label?: string;
  icon?: IconName;
  /** Disclosure groups collapse; the others are always open. */
  collapsible: boolean;
  items: NavItem[];
}

const ADMIN_MANAGE = { resource: RESOURCES.ADMIN, action: ACTIONS.MANAGE };
const read = (resource: string) => ({ resource, action: ACTIONS.READ });

export const navGroups: NavGroup[] = [
  {
    id: 'system',
    label: 'This System',
    collapsible: false,
    items: [
      {
        route: 'ds-system-evidence',
        label: 'Evidence',
        icon: 'evidence',
        next: true,
        permission: read(RESOURCES.SSP),
      },
      { route: 'controls:index', label: 'Implementation', icon: 'components' },
      { route: 'compliance:index', label: 'Compliance', icon: 'controls' },
      {
        route: 'risks:index',
        label: 'Risks',
        icon: 'risks',
        permission: read(RESOURCES.RISK),
      },
      {
        route: 'workflow-instances:index',
        label: 'Workflow Instances',
        icon: 'instances',
        permission: read(RESOURCES.WORKFLOW_INSTANCE),
      },
      { route: 'system:overview', label: 'Configure System', icon: 'details' },
    ],
  },
  {
    id: 'global',
    label: 'Global',
    collapsible: false,
    items: [
      {
        route: 'evidence:index',
        label: 'Evidence',
        icon: 'evidence',
        permission: read(RESOURCES.EVIDENCE),
      },
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: 'chart',
    collapsible: true,
    items: [
      {
        route: 'admin-risks',
        label: 'Risks',
        icon: 'crossSystemRisks',
        permission: ADMIN_MANAGE,
      },
      { route: 'lineage', label: 'Compliance Map', icon: 'complianceMap' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'integrations',
    collapsible: true,
    items: [
      {
        route: 'workflow:index',
        label: 'Workflow Definitions',
        icon: 'definitions',
        permission: read(RESOURCES.WORKFLOW_DEFINITION),
      },
      {
        route: 'dashboards',
        label: 'Evidence Filters',
        icon: 'filter',
        permission: read(RESOURCES.FILTER),
      },
      {
        route: 'admin-agents',
        label: 'Agents',
        icon: 'agents',
        permission: read(RESOURCES.AGENT),
      },
      {
        route: 'admin-import',
        label: 'Import',
        icon: 'import',
        permission: ADMIN_MANAGE,
      },
    ],
  },
  {
    id: 'frameworks',
    label: 'Control Definitions',
    icon: 'frameworks',
    collapsible: true,
    items: [
      {
        route: 'catalog-list',
        label: 'Catalogs',
        icon: 'catalogs',
        permission: read(RESOURCES.CATALOG),
      },
      {
        route: 'profile-list',
        label: 'Profiles',
        icon: 'profiles',
        permission: read(RESOURCES.PROFILE),
      },
      {
        route: 'control-links-list',
        label: 'Control Links',
        icon: 'controlLinks',
        permission: read(RESOURCES.CONTROL_LINK),
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'admin',
    collapsible: true,
    items: [
      {
        route: 'users-list',
        label: 'Users',
        icon: 'users',
        permission: ADMIN_MANAGE,
      },
      {
        route: 'admin-groups',
        label: 'Groups',
        icon: 'people',
        permission: ADMIN_MANAGE,
      },
      {
        route: 'admin-ssp-templates',
        label: 'System Templates',
        icon: 'templates',
        permission: ADMIN_MANAGE,
      },
      {
        route: 'admin-diagnostics',
        label: 'Diagnostics',
        icon: 'alert',
        permission: ADMIN_MANAGE,
      },
    ],
  },
];
