import {
  createRouter,
  createWebHistory,
  RouterView,
  type RouteLocation,
} from 'vue-router';
import AppShell from '@/ds/templates/AppShell/AppShell.vue';
import { useUserStore } from '@/stores/auth';
import { useSystemStore } from '@/stores/system';
import {
  CONFIGURE_SECTIONS,
  sectionRouteName,
} from '@/screens/configure/configureSections';

// Where classic Configure System and SSP Editor put a section, when not at its new path.
const CLASSIC_SYSTEM_PATHS: Record<string, string> = {
  overview: '',
  diagrams: 'authorization-boundary',
  implementation: 'implementation',
};
const SSP_EDITOR_PATHS: Record<string, string> = {
  overview: '',
  characteristics: 'system-characteristics',
  diagrams: 'authorization-boundary',
  implementation: 'system-implementation',
};
import { usePermissionsStore } from '@/stores/permissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

// Routes carrying this meta are only reachable when the subject may admin:manage. The nav
// hides their entries; this guard blocks direct-URL access too (BCH-1318).
const ADMIN_MANAGE = {
  resource: RESOURCES.ADMIN,
  action: ACTIONS.MANAGE,
} as const;

// Routes marked `activeSystemScoped` show data for the active system (the nav's This
// System pages). The layout remounts them when the header switcher changes system. Every
// other page ignores a switch. Global > Evidence (`evidence:index`) lists all evidence;
// This System > Evidence (`system:evidence`) lists the active system's in-scope evidence.
const authenticatedRoutes = [
  {
    path: '/',
    name: 'home',
    // Redirects to the canonical evidence route (rather than duplicating its component
    // under a second route name) so the initial landing page resolves as 'evidence:index'
    // — the name the nav's active item matches on — and the "Evidence"
    // nav item is correctly highlighted from the very first render, not just after the user
    // clicks it.
    redirect: { name: 'evidence:index' },
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/dashboards',
    name: 'dashboards',
    component: () => import('../screens/filters/EvidenceFiltersScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: { resource: RESOURCES.FILTER, action: ACTIONS.READ },
    },
  },
  {
    path: '/dashboards/create',
    name: 'dashboards.create',
    component: () => import('../screens/filters/NewEvidenceFilterScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/dashboards/suggestions/:sspId',
    name: 'dashboards.suggestions',
    component: () => import('../screens/filters/SuggestionsScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    // The classic page ignored the id and showed the whole list.
    path: '/dashboards/:id',
    name: 'dashboards.view',
    redirect: { name: 'dashboards' },
  },
  {
    path: 'workflows',
    name: 'workflow:index',
    component: () =>
      import('../screens/workflows/WorkflowDefinitionsScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: 'workflow-definitions/:id',
    name: 'workflow-definition-editor',
    component: () => import('@/screens/workflows/WorkflowDefinitionScreen.vue'),
    meta: {
      ds: true,
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'workflow-definition-overview',
        component: () =>
          import('../views/workflows/WorkflowDefinitionOverviewView.vue'),
      },
      {
        path: 'steps',
        name: 'workflow-definition-steps',
        component: () =>
          import('../views/workflows/WorkflowDefinitionStepsView.vue'),
      },
      {
        path: 'controls',
        name: 'workflow-definition-controls',
        component: () =>
          import('../views/workflows/WorkflowDefinitionControlsView.vue'),
      },
      {
        path: 'json',
        name: 'workflow-definition-json',
        component: () =>
          import('../views/workflows/WorkflowDefinitionJSONView.vue'),
      },
    ],
  },
  {
    path: 'workflow-instances/:id',
    name: 'workflow-instance-editor',
    component: () => import('@/screens/workflows/WorkflowInstanceScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
    children: [
      {
        path: '',
        name: 'workflow-instance-overview',
        component: () =>
          import('../views/workflow-instances/WorkflowInstanceOverviewView.vue'),
      },
      {
        path: 'roles',
        name: 'workflow-instance-roles',
        component: () =>
          import('../views/workflow-instances/WorkflowInstanceRolesView.vue'),
      },
      {
        path: 'executions',
        name: 'workflow-instance-executions',
        component: () =>
          import('../views/workflow-instances/WorkflowInstanceExecutionsView.vue'),
      },
      {
        path: 'json',
        name: 'workflow-instance-json',
        component: () =>
          import('../views/workflow-instances/WorkflowInstanceJSONView.vue'),
      },
    ],
  },
  {
    path: 'workflow-executions/:id',
    name: 'workflow-execution-view',
    component: () => import('../screens/workflows/WorkflowExecutionScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: 'poam-items',
    name: 'poam-items:index',
    component: () => import('../screens/poam/PoamItemsScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: 'risks/:riskId',
    name: 'risks:detail',
    component: () => import('../screens/risks/RiskScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: 'inventory',
    name: 'inventory:index',
    component: () => import('../screens/inventory/InventoryScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/catalogs',
    name: 'catalog-list',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../screens/catalogs/CatalogsScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/catalogs/:id',
    name: 'catalog-view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../screens/catalogs/CatalogScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/catalogs/new',
    name: 'catalog-create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/catalogs/:catalog/control/:id/evidence',
    name: 'catalog-control-evidence',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../screens/catalogs/ControlEvidenceScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/profiles',
    name: 'profile-list',
    component: () => import('../screens/documents/DocumentLists.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/profiles/create',
    name: 'profile:create',
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/profiles/build-props',
    name: 'profile-build-props',
    component: () => import('../screens/profiles/BuildProfileScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/profiles/:id',
    name: 'profile:view',
    component: () => import('@/screens/profiles/ProfileScreen.vue'),
    meta: {
      ds: true,
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'profile:view-controls',
        component: () => import('../views/profile/ProfileControlsView.vue'),
        meta: {
          requiresAuth: true,
        },
      },
      {
        path: 'merge',
        name: 'profile:view-merge',
        component: () => import('../views/profile/ProfileMergeView.vue'),
        meta: {
          requiresAuth: true,
        },
      },
      {
        path: 'compliance',
        name: 'profile:view-compliance',
        component: () => import('../views/profile/ProfileComplianceView.vue'),
        meta: {
          requiresAuth: true,
        },
      },
      {
        path: 'json',
        name: 'profile:view-json',
        component: () => import('../views/profile/ProfileJSONView.vue'),
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/parties',
    name: 'admin-parties',
    component: () => import('../screens/admin/PartiesScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/roles',
    name: 'admin-roles',
    component: () => import('../screens/admin/RolesScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/admin/agents',
    name: 'admin-agents',
    component: () => import('../screens/admin/AgentsScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      // R40: readable with agent:read (viewer/auditor/contributor); keys and CRUD inside the
      // page stay behind admin:manage.
      permission: { resource: RESOURCES.AGENT, action: ACTIONS.READ },
    },
  },
  {
    path: '/admin/notifications',
    name: 'admin-notifications',
    redirect: { name: 'admin-diagnostics-notifications' },
    meta: {
      requiresAuth: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/admin/diagnostics',
    name: 'admin-diagnostics',
    component: () => import('../screens/admin/DiagnosticsScreen.vue'),
    redirect: { name: 'admin-diagnostics-notifications' },
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
    children: [
      {
        path: 'notifications',
        name: 'admin-diagnostics-notifications',
        component: () => import('../views/admin/NotificationsView.vue'),
        meta: {
          requiresAuth: true,
          permission: ADMIN_MANAGE,
        },
      },
      {
        path: 'ai-suggestions',
        name: 'admin-diagnostics-ai-suggestions',
        component: () => import('../views/admin/AiDiagnosticsView.vue'),
        meta: {
          requiresAuth: true,
          permission: ADMIN_MANAGE,
        },
      },
    ],
  },
  {
    path: '/admin/risks',
    name: 'admin-risks',
    component: () => import('../screens/risks/RiskRegisterScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/admin/subject-templates',
    name: 'admin-subject-templates',
    component: () => import('../screens/admin/SubjectTemplatesScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/admin/subject-templates/:id',
    name: 'admin-subject-template-detail',
    component: () => import('../screens/admin/SubjectTemplateScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/admin/ssp-templates',
    name: 'admin-ssp-templates',
    component: () => import('../screens/ssp-templates/SspTemplatesScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/admin/ssp-templates/:id',
    name: 'admin-ssp-template-detail',
    component: () => import('../screens/ssp-templates/SspTemplateScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/admin/risk-templates',
    name: 'admin-risk-templates',
    component: () => import('../screens/admin/RiskTemplatesScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/admin/import',
    name: 'admin-import',
    component: () => import('../screens/admin/ImportScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/admin/groups',
    name: 'admin-groups',
    component: () => import('../screens/admin/GroupsScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/admin/groups/:id',
    name: 'admin-group-view',
    component: () => import('../screens/admin/GroupScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/component-definitions',
    name: 'component-definitions',
    component: () => import('../screens/documents/DocumentLists.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/component-definitions/create',
    name: 'component-definition-create',
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/component-definitions/:id',
    name: 'component-definition-editor',
    component: () =>
      import('@/screens/component-definitions/ComponentDefinitionScreen.vue'),
    meta: {
      ds: true,
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'component-definition-overview',
        component: () =>
          import('../views/component-definitions/ComponentDefinitionOverviewView.vue'),
      },
      {
        path: 'components',
        name: 'component-definition-components',
        component: () =>
          import('../views/component-definitions/ComponentDefinitionComponentsView.vue'),
      },
      {
        path: 'capabilities',
        name: 'component-definition-capabilities',
        component: () =>
          import('../views/component-definitions/ComponentDefinitionCapabilitiesView.vue'),
      },
      {
        path: 'back-matter',
        name: 'component-definition-back-matter',
        component: () =>
          import('../views/component-definitions/ComponentDefinitionBackMatterView.vue'),
      },
      {
        path: 'json',
        name: 'component-definition-json',
        component: () =>
          import('../views/component-definitions/ComponentDefinitionJSONView.vue'),
      },
    ],
  },
  {
    // The API accepts PUT on a component definition but doesn't store metadata changes, so the
    // classic edit page was read-only. Its overview shows the same details.
    path: '/component-definitions/:id/edit',
    name: 'component-definition-edit',
    redirect: (to: RouteLocation) => ({
      name: 'component-definition-overview',
      params: { id: to.params.id },
    }),
  },
  {
    path: '/assessment-plans',
    name: 'assessment-plans',
    component: () => import('../screens/documents/DocumentLists.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/assessment-plans/create',
    name: 'assessment-plan-create',
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/assessment-plans/:id',
    name: 'assessment-plan-editor',
    component: () => import('@/screens/assessments/AssessmentPlanScreen.vue'),
    meta: {
      ds: true,
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'assessment-plan-overview',
        component: () =>
          import('../views/assessment-plans/AssessmentPlanOverviewView.vue'),
      },
      {
        path: 'tasks',
        name: 'assessment-plan-tasks',
        component: () =>
          import('../views/assessment-plans/AssessmentPlanTasksView.vue'),
      },
      {
        path: 'json',
        name: 'assessment-plan-json',
        component: () =>
          import('../views/assessment-plans/AssessmentPlanJSONView.vue'),
      },
    ],
  },
  {
    path: '/assessment-plans/:id/edit',
    name: 'assessment-plan-edit',
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/plan-of-action-and-milestones',
    name: 'plan-of-action-and-milestones',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../screens/documents/DocumentLists.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/plan-of-action-and-milestones/create',
    name: 'plan-of-action-and-milestones-create',
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/plan-of-action-and-milestones/:id',
    name: 'plan-of-action-and-milestones-editor',
    component: () => import('@/screens/poam/PoamScreen.vue'),
    meta: {
      ds: true,
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'plan-of-action-and-milestones-overview',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesOverviewView.vue'),
      },
      {
        path: 'poam-items',
        name: 'plan-of-action-and-milestones-poam-items',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesPoamItemsView.vue'),
      },
      {
        path: 'import-ssp',
        name: 'plan-of-action-and-milestones-import-ssp',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesImportSspView.vue'),
      },
      {
        path: 'system-id',
        name: 'plan-of-action-and-milestones-system-id',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesSystemIdView.vue'),
      },
      {
        path: 'local-definitions',
        name: 'plan-of-action-and-milestones-local-definitions',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesLocalDefinitionsView.vue'),
      },
      {
        path: 'observations',
        name: 'plan-of-action-and-milestones-observations',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesObservationsView.vue'),
      },
      {
        path: 'risks',
        name: 'plan-of-action-and-milestones-risks',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesRisksView.vue'),
      },
      {
        path: 'risks/:riskId',
        name: 'plan-of-action-and-milestones-risk-detail',
        component: () => import('../views/risk/RiskDetailView.vue'),
      },
      {
        path: 'findings',
        name: 'plan-of-action-and-milestones-findings',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesFindingsView.vue'),
      },
      {
        path: 'back-matter',
        name: 'plan-of-action-and-milestones-back-matter',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesBackMatterView.vue'),
      },
      {
        path: 'json',
        name: 'plan-of-action-and-milestones-json',
        component: () =>
          import('../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesJSONView.vue'),
      },
    ],
  },
  {
    path: '/plan-of-action-and-milestones/:id/edit',
    name: 'plan-of-action-and-milestones-edit',
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/system-security-plans/create',
    name: 'system-security-plans-create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/assessment-results',
    name: 'assessment-results',
    component: () => import('../screens/documents/DocumentLists.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/assessment-results/create',
    name: 'assessment-results-create',
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/assessment-results/:id',
    name: 'assessment-results-editor',
    component: () =>
      import('@/screens/assessments/AssessmentResultsScreen.vue'),
    meta: {
      ds: true,
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'assessment-results-overview',
        component: () =>
          import('../views/assessment-results/AssessmentResultsOverviewView.vue'),
      },
      {
        path: 'import-ap',
        name: 'assessment-results-import-ap',
        component: () =>
          import('../views/assessment-results/AssessmentResultsImportApView.vue'),
      },
      {
        path: 'results',
        name: 'assessment-results-results',
        component: () =>
          import('../views/assessment-results/AssessmentResultsResultsView.vue'),
      },
      {
        path: 'local-definitions',
        name: 'assessment-results-local-definitions',
        component: () =>
          import('../views/assessment-results/AssessmentResultsLocalDefinitionsView.vue'),
      },
      {
        path: 'back-matter',
        name: 'assessment-results-back-matter',
        component: () =>
          import('../views/assessment-results/AssessmentResultsBackMatterView.vue'),
      },
      {
        path: 'json',
        name: 'assessment-results-json',
        component: () =>
          import('../views/assessment-results/AssessmentResultsJSONView.vue'),
      },
    ],
  },
  {
    path: '/assessment-results/:id/edit',
    name: 'assessment-results-edit',
    component: () => import('../screens/documents/DocumentForms.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/users',
    name: 'users-list',
    component: () => import('../screens/admin/UsersScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      // Admin-managed directory (matches the nav gate). Individual /users/:id profiles are
      // left ungated so deep links from non-admin contexts still resolve; a denied load
      // falls back to the global 403 handler.
      permission: ADMIN_MANAGE,
    },
  },
  {
    path: '/users/:id',
    name: 'user-view',
    component: () => import('../screens/admin/UserScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/my-tasks',
    name: 'my-tasks',
    component: () => import('../screens/tasks/MyTasksScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/preferences',
    name: 'preferences',
    component: () => import('../screens/preferences/PreferencesScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../screens/about/AboutScreen.vue'),
    meta: { ds: true },
  },
  {
    path: '/control-links',
    name: 'control-links-list',
    component: () => import('../screens/control-links/ControlLinksScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/control-links/new',
    name: 'control-links-create',
    component: () =>
      import('../screens/control-links/NewControlLinkScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
  },
  {
    path: '/lineage',
    component: () => import('../screens/lineage/LineageScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
    },
    children: [
      {
        path: '',
        name: 'lineage',
        component: () => import('../views/lineage/LineageTreeView.vue'),
      },
      {
        path: 'graph',
        name: 'lineage-graph',
        component: () => import('../views/lineage/LineageGraphView.vue'),
      },
    ],
  },
];

const publicRoutes = [
  {
    path: 'login',
    name: 'login',
    component: () => import('@/screens/auth/LoginScreen.vue'),
  },
  {
    path: 'forgot-password',
    name: 'forgot-password',
    component: () => import('@/screens/auth/ForgotPasswordScreen.vue'),
  },
  {
    path: 'password-reset',
    name: 'password-reset',
    component: () => import('@/screens/auth/PasswordResetScreen.vue'),
  },
  {
    path: 'sso/callback',
    name: 'sso-callback',
    component: () => import('@/screens/auth/SSOCallbackScreen.vue'),
  },
  {
    path: 'slack/callback',
    name: 'slack-link-callback',
    component: () => import('@/screens/auth/SlackLinkCallbackScreen.vue'),
  },
  {
    path: 'logout',
    name: 'logout',
    component: () => import('@/screens/auth/LogoutScreen.vue'),
  },
];

// Redesigned screens (src/screens, built on src/ds). They replace classic pages one at a time:
// each takes over its classic route (or the classic route redirects to it) and the classic page
// is deleted. `meta.ds` tells the shell not to wrap them in the legacy page frame.

// An evidence record's tabs, each its own route so tabs are shareable. `prefix` names them for
// the context: inside a system or the global record.
function evidenceRecordTabs(prefix: string) {
  const tab = (path: string, name: string, file: string) => ({
    path,
    name: name ? `${prefix}-${name}` : prefix,
    component: () => import(`../screens/evidence/record/${file}.vue`),
  });
  return [
    tab('', '', 'OverviewTab'),
    tab('metadata', 'metadata', 'MetadataTab'),
    tab('risks', 'risks', 'RisksTab'),
    tab('media', 'media', 'MediaTab'),
    tab('signature', 'signature', 'SignatureTab'),
    tab('history', 'history', 'HistoryTab'),
  ];
}

// A classic system route (which read the current system from the store) now leads to the
// redesigned page for the current system, or to the Systems list to choose one.
function toCurrentSystem(name: string) {
  return (to: RouteLocation) => {
    const systemId = useSystemStore().system.securityPlan?.uuid;
    return systemId
      ? { name, params: { systemId }, query: to.query, hash: to.hash }
      : { name: 'systems' };
  };
}

const designSystemRoutes = [
  {
    path: 'systems',
    name: 'systems',
    component: () => import('@/screens/systems/SystemsScreen.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      title: 'Systems',
      permission: { resource: RESOURCES.SSP, action: ACTIONS.READ },
    },
  },
  {
    // System pages take the system from the URL so links are shareable. SystemScope makes
    // it the current system, which the classic system pages still read.
    path: 'systems/:systemId',
    component: () => import('@/screens/systems/SystemScope.vue'),
    meta: {
      requiresAuth: true,
      ds: true,
      permission: { resource: RESOURCES.SSP, action: ACTIONS.READ },
    },
    children: [
      {
        path: '',
        redirect: { name: 'system-evidence' },
      },
      {
        path: 'compliance',
        name: 'system-compliance',
        component: () => import('@/screens/compliance/ComplianceScreen.vue'),
        meta: { title: 'Compliance' },
      },
      {
        path: 'configure',
        component: () => import('@/screens/configure/ConfigureScreen.vue'),
        meta: { title: 'Configure System' },
        children: [
          ...CONFIGURE_SECTIONS.map((section) => ({
            path: section.path,
            name: sectionRouteName(section.suffix),
            component: () => import('@/screens/configure/ConfigureSection.vue'),
          })),
          {
            path: 'components/dashboards/:componentId',
            name: 'system-configure-component-dashboards',
            component: () => import('@/screens/configure/ConfigureSection.vue'),
          },
        ],
      },
      {
        path: 'implementation',
        name: 'system-implementation',
        component: () =>
          import('@/screens/implementation/ImplementationScreen.vue'),
        meta: { title: 'Implementation' },
      },
      {
        path: 'risks',
        name: 'system-risks',
        component: () => import('@/screens/risks/RisksDashboardScreen.vue'),
        meta: { title: 'Risks' },
      },
      {
        path: 'risks/register',
        name: 'system-risks-register',
        component: () => import('@/screens/risks/RiskRegisterScreen.vue'),
        meta: { title: 'Risks' },
      },
      {
        path: 'workflows',
        name: 'system-workflows',
        component: () =>
          import('@/screens/workflows/WorkflowInstancesScreen.vue'),
        meta: { title: 'Workflow Instances' },
      },
      {
        path: 'evidence',
        name: 'system-evidence',
        component: () => import('@/screens/evidence/EvidenceScreen.vue'),
        meta: { title: 'Evidence' },
      },
      {
        path: 'evidence/:evidenceId',
        component: () =>
          import('@/screens/evidence/record/EvidenceRecordScreen.vue'),
        meta: { title: 'Evidence' },
        children: evidenceRecordTabs('system-evidence-record'),
      },
    ],
  },
  {
    path: 'evidence',
    name: 'evidence:index',
    component: () => import('@/screens/evidence/EvidenceScreen.vue'),
    // No permission gate, as before: 'home' redirects here, so a gate would loop.
    meta: { requiresAuth: true, ds: true, title: 'Evidence' },
  },
  {
    path: 'evidence/create',
    name: 'evidence:create',
    component: () => import('@/screens/evidence/form/EvidenceFormScreen.vue'),
    // Not gated, as before: the form explains a missing permission at submit.
    meta: { requiresAuth: true, ds: true, title: 'New evidence' },
  },
  {
    path: 'evidence/:id/update',
    name: 'evidence:update',
    component: () => import('@/screens/evidence/form/EvidenceFormScreen.vue'),
    // Not gated, as before: the form explains a missing permission at submit.
    meta: { requiresAuth: true, ds: true, title: 'Re-submit evidence' },
  },
  {
    // The classic history URL names a stream; it opens the latest record's History tab.
    path: 'evidence/history/:uuid',
    name: 'evidence:history',
    component: () => import('@/screens/evidence/EvidenceHistoryRedirect.vue'),
    meta: { requiresAuth: true, ds: true, title: 'Evidence history' },
  },
  {
    // The same record outside a system, for links from global pages.
    path: 'evidence/:evidenceId',
    component: () =>
      import('@/screens/evidence/record/EvidenceRecordScreen.vue'),
    meta: { requiresAuth: true, ds: true, title: 'Evidence' },
    children: evidenceRecordTabs('evidence:view'),
  },
  // Classic routes that now lead to redesigned screens, kept so existing links still work.
  {
    path: 'system-security-plans',
    name: 'system-security-plans',
    redirect: { name: 'systems' },
  },
  {
    path: 'system/evidence',
    name: 'system:evidence',
    redirect: toCurrentSystem('system-evidence'),
  },
  {
    path: 'compliance',
    name: 'compliance:index',
    redirect: toCurrentSystem('system-compliance'),
  },
  // Configure System (classic `system:*`, read the current system from the store) and the SSP
  // Editor (classic `system-security-plan-*`, took the system from `:id`) both lead to
  // /systems/:systemId/configure now. Their old names keep resolving for existing links.
  {
    path: 'system',
    name: 'system',
    redirect: toCurrentSystem('system-configure'),
    children: [
      ...CONFIGURE_SECTIONS.map((section) => ({
        path: CLASSIC_SYSTEM_PATHS[section.classic] ?? section.path,
        name: `system:${section.classic}`,
        redirect: toCurrentSystem(sectionRouteName(section.suffix)),
      })),
      {
        path: 'components/dashboards/:componentId',
        name: 'system-component-dashboards',
        redirect: (to: RouteLocation) => {
          const systemId = useSystemStore().system.securityPlan?.uuid;
          return systemId
            ? {
                name: 'system-configure-component-dashboards',
                params: { systemId, componentId: to.params.componentId },
              }
            : { name: 'systems' };
        },
      },
      {
        path: 'risks',
        name: 'system:risks',
        redirect: toCurrentSystem('system-risks-register'),
      },
      {
        path: 'compliance',
        name: 'system:compliance',
        redirect: toCurrentSystem('system-compliance'),
      },
    ],
  },
  {
    path: '/system-security-plans/:id',
    name: 'system-security-plan-editor',
    redirect: (to: RouteLocation) => ({
      name: 'system-configure',
      params: { systemId: to.params.id },
    }),
    children: [
      ...CONFIGURE_SECTIONS.map((section) => ({
        path: SSP_EDITOR_PATHS[section.classic] ?? section.path,
        name: `system-security-plan-${section.classic}`,
        redirect: (to: RouteLocation) => ({
          name: sectionRouteName(section.suffix),
          params: { systemId: to.params.id },
        }),
      })),
      {
        path: 'risks',
        name: 'system-security-plan-risks',
        redirect: (to: RouteLocation) => ({
          name: 'system-risks-register',
          params: { systemId: to.params.id },
          query: to.query,
        }),
      },
      {
        path: 'compliance',
        name: 'system-security-plan-compliance',
        redirect: (to: RouteLocation) => ({
          name: 'system-compliance',
          params: { systemId: to.params.id },
        }),
      },
    ],
  },
  {
    // Risk detail keeps its SSP-scoped URL as a page of its own (its SSP editor parent is gone).
    path: '/system-security-plans/:id/risks/:riskId',
    name: 'system-security-plan-risk-detail',
    component: () => import('../screens/risks/RiskScreen.vue'),
    meta: { requiresAuth: true, ds: true },
  },
  {
    path: 'controls',
    name: 'controls:index',
    redirect: toCurrentSystem('system-implementation'),
  },
  {
    path: 'workflow-instances',
    name: 'workflow-instances:index',
    redirect: toCurrentSystem('system-workflows'),
  },
  {
    // The classic page chose its tab with ?view=; a link carrying register filters (e.g. from a
    // control's risk badge) opened the register.
    path: 'risks',
    name: 'risks:index',
    redirect: (to: RouteLocation) => {
      const { view, ...query } = to.query;
      const register =
        view === 'register' ||
        (view !== 'dashboard' && Object.keys(query).length > 0);
      return toCurrentSystem(
        register ? 'system-risks-register' : 'system-risks',
      )({
        ...to,
        query,
      } as RouteLocation);
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      redirect: (to) => ({
        path: '/auth/login',
        query: to.query,
      }),
    },
    {
      path: '/auth',
      name: 'auth',
      // Each guest screen renders its own GuestTemplate.
      component: RouterView,
      children: publicRoutes,
      meta: {
        requiresAuth: false,
        asd: false,
      },
    },
    {
      path: '/',
      name: 'app',
      component: AppShell,
      children: [...authenticatedRoutes, ...designSystemRoutes],
      meta: {
        requiresAuth: true,
      },
    },
  ],
});

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const userStore = useUserStore();
  const isAuthenticated = userStore.isAuthenticated;
  if (requiresAuth && !isAuthenticated) {
    // Redirect to the login page if the user is not authenticated
    return next({ name: 'login', query: { next: to.fullPath } });
  }

  // Permission gate (BCH-1318): block direct-URL access to routes the subject can't reach.
  // The nav already hides these entries; this covers typed URLs and bookmarks. can() is
  // optimistic until permissions load, so this never traps a user mid-hydration; the PDP
  // and the global 403 handler remain the real enforcement.
  if (isAuthenticated) {
    const permissionsStore = usePermissionsStore();
    const denied = to.matched.some((record) => {
      const permission = record.meta.permission as
        { resource: string; action: string } | undefined;
      return (
        permission &&
        !permissionsStore.can(permission.resource, permission.action)
      );
    });
    if (denied) {
      return next({ name: 'home' });
    }
  }

  // Proceed to the requested route
  return next();
});

export default router;
