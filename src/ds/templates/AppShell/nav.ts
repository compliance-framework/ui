import type { IconName } from '@/ds/components/Icon/icons';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

/**
 * Primary navigation for the design-system shell, in the redesign's information architecture:
 * the current system first, then Global, Control definitions and Admin.
 *
 * During the migration most destinations are still legacy pages. Items with `next: true` are
 * redesigned screens that render inside this shell; the rest open the legacy layout. Labels use
 * the redesign's vocabulary even where the legacy page title differs.
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
  /** `system` groups are titled with the active system's name. */
  id: 'system' | 'shared' | 'frameworks' | 'admin';
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
    collapsible: false,
    items: [
      { route: 'system:overview', label: 'Overview', icon: 'overview' },
      { route: 'compliance:index', label: 'Compliance', icon: 'controls' },
      {
        route: 'system:evidence',
        label: 'Evidence',
        icon: 'evidence',
        permission: read(RESOURCES.SSP),
      },
      {
        route: 'risks:index',
        label: 'Risks',
        icon: 'risks',
        permission: read(RESOURCES.RISK),
      },
      { route: 'controls:index', label: 'Implementation', icon: 'components' },
      {
        route: 'workflow-instances:index',
        label: 'Workflows',
        icon: 'workflows',
        permission: read(RESOURCES.WORKFLOW_INSTANCE),
      },
      { route: 'system:json', label: 'Source', icon: 'source' },
    ],
  },
  {
    id: 'shared',
    label: 'Global',
    icon: 'systems',
    collapsible: true,
    items: [
      {
        route: 'ds-systems',
        label: 'All systems',
        icon: 'systems',
        next: true,
        permission: read(RESOURCES.SSP),
      },
      {
        route: 'evidence:index',
        label: 'Evidence stream',
        icon: 'evidence',
        permission: read(RESOURCES.EVIDENCE),
      },
      {
        route: 'dashboards',
        label: 'Evidence filters',
        icon: 'filter',
        permission: read(RESOURCES.FILTER),
      },
      {
        route: 'admin-risks',
        label: 'Cross-system risks',
        icon: 'crossSystemRisks',
        permission: ADMIN_MANAGE,
      },
      { route: 'lineage', label: 'Compliance map', icon: 'complianceMap' },
      {
        route: 'workflow:index',
        label: 'Workflow definitions',
        icon: 'definitions',
        permission: read(RESOURCES.WORKFLOW_DEFINITION),
      },
    ],
  },
  {
    id: 'frameworks',
    label: 'Control definitions',
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
        label: 'Control links',
        icon: 'controlLinks',
        permission: read(RESOURCES.CONTROL_LINK),
      },
      {
        route: 'component-definitions',
        label: 'Component definitions',
        icon: 'componentDefinitions',
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
        route: 'admin-agents',
        label: 'Agents',
        icon: 'agents',
        permission: read(RESOURCES.AGENT),
      },
      {
        route: 'admin-ssp-templates',
        label: 'Templates',
        icon: 'templates',
        permission: ADMIN_MANAGE,
      },
      {
        route: 'admin-import',
        label: 'Import',
        icon: 'import',
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
