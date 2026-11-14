import { defineAsyncComponent, type Component } from 'vue';

/**
 * The sections of a system's configuration (its SSP), shared by Configure System and the old SSP
 * Editor URLs, which now both lead here. Each section's content is still the classic SSP view,
 * embedded as a legacy island (see docs/REDESIGN.md); `tab: false` sections are reachable by link
 * but, as before, not shown as tabs.
 */
export interface ConfigureSection {
  /** Route name suffix: `system-configure` + (suffix ? `-${suffix}` : ''). */
  suffix: string;
  /** Path under /systems/:systemId/configure. */
  path: string;
  label: string;
  tab: boolean;
  /** The classic SSP Editor route name it replaces. */
  classic: string;
  component: () => Promise<Component>;
}

const view = (name: string) => () =>
  import(`../../views/system-security-plans/SystemSecurityPlan${name}View.vue`);

export const CONFIGURE_SECTIONS: ConfigureSection[] = [
  {
    suffix: '',
    path: '',
    label: 'Overview',
    tab: true,
    classic: 'overview',
    component: () => import('@/screens/configure/SystemOverviewSection.vue'),
  },
  {
    suffix: 'characteristics',
    path: 'characteristics',
    label: 'Characteristics',
    tab: true,
    classic: 'characteristics',
    component: () =>
      import('@/screens/configure/SystemCharacteristicsSection.vue'),
  },
  {
    suffix: 'boundary',
    path: 'authorization-boundary',
    label: 'Authorization Boundary',
    tab: true,
    classic: 'diagrams',
    component: () => import('@/screens/configure/SystemDiagramsSection.vue'),
  },
  {
    suffix: 'components',
    path: 'components',
    label: 'Components',
    tab: true,
    classic: 'components',
    component: () => import('@/screens/configure/SystemComponentsSection.vue'),
  },
  {
    suffix: 'scope',
    path: 'scope',
    label: 'Scope',
    tab: true,
    classic: 'scope',
    component: () => import('@/screens/configure/SystemScopeSection.vue'),
  },
  {
    suffix: 'json',
    path: 'json',
    label: 'JSON',
    tab: true,
    classic: 'json',
    component: () => import('@/screens/documents/DocumentJsonTab.vue'),
  },
  {
    suffix: 'implementation',
    path: 'system-implementation',
    label: 'System Implementation',
    tab: false,
    classic: 'implementation',
    component: () =>
      import('@/screens/configure/SystemImplementationSection.vue'),
  },
  {
    suffix: 'users',
    path: 'users',
    label: 'Users',
    tab: false,
    classic: 'users',
    component: () => import('@/screens/configure/SystemUsersSection.vue'),
  },
  {
    suffix: 'authorizations',
    path: 'authorizations',
    label: 'Leveraged Authorizations',
    tab: false,
    classic: 'authorizations',
    component: () =>
      import('@/screens/configure/SystemAuthorizationsSection.vue'),
  },
  {
    suffix: 'control-implementation',
    path: 'control-implementation',
    label: 'Control Implementation',
    tab: false,
    classic: 'control-implementation',
    component: view('ControlImplementation'),
  },
  {
    suffix: 'export-offerings',
    path: 'export-offerings',
    label: 'Export Offerings',
    tab: false,
    classic: 'export-offerings',
    component: view('ExportOfferings'),
  },
  {
    suffix: 'leverage',
    path: 'leverage',
    label: 'Leverage',
    tab: false,
    classic: 'leverage',
    component: view('Leverage'),
  },
  {
    suffix: 'inherited-capabilities',
    path: 'inherited-capabilities',
    label: 'Inherited Capabilities',
    tab: false,
    classic: 'inherited-capabilities',
    component: view('InheritedCapabilities'),
  },
];

export const sectionRouteName = (suffix: string) =>
  suffix ? `system-configure-${suffix}` : 'system-configure';

export function asyncSection(section: ConfigureSection) {
  return defineAsyncComponent(section.component);
}
