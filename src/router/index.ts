import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/views/layouts/App.vue';
import GuestLayout from '@/views/layouts/GuestLayout.vue';
import { useUserStore } from '@/stores/auth';

const authenticatedRoutes = [
  {
    path: '/',
    name: 'home',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/evidence/IndexView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/dashboards',
    name: 'dashboards',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/dashboard/IndexView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/dashboards/create',
    name: 'dashboards.create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/dashboard/CreateFormView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/dashboards/:id',
    name: 'dashboards.view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/dashboard/IndexView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: 'controls',
    name: 'controls:index',
    component: () => import('../views/control-implementations/IndexView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: 'system',
    name: 'system',
    component: () => import('../views/SystemView.vue'),
    children: [
      {
        path: '',
        name: 'system:overview',
        component: () => import('../views/system/OverviewView.vue'),
      },
      {
        path: 'users',
        name: 'system:users',
        component: () => import('../views/system/UsersView.vue'),
      },
      {
        path: 'components',
        name: 'system:components',
        component: () => import('../views/system/ComponentsView.vue'),
      },
      {
        path: 'authorizations',
        name: 'system:authorizations',
        component: () => import('../views/system/AuthorizationsView.vue'),
      },
    ],
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: 'risks',
    name: 'risks:index',
    component: () => import('../views/RisksView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: 'inventory',
    name: 'inventory:index',
    component: () => import('../views/InventoryView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/catalogs',
    name: 'catalog-list',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/catalog/CatalogListView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/catalogs/:id',
    name: 'catalog-view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/catalog/CatalogView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/catalogs/new',
    name: 'catalog-create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/catalog/CatalogCreateView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/catalogs/:catalog/control/:id/evidence',
    name: 'catalog-control-evidence',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/EvidenceByControlView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/profiles',
    name: 'profile-list',
    component: () => import('../views/profile/ProfileList.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/profiles/create',
    name: 'profile:create',
    component: () => import('../views/profile/ProfileCreate.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/profiles/:id',
    name: 'profile:view',
    component: () => import('../views/profile/ProfileView.vue'),
    meta: {
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
    path: '/subjects',
    name: 'admin-subjects',
    component: () => import('../views/SubjectsView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/parties',
    name: 'admin-parties',
    component: () => import('../views/PartyListView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/roles',
    name: 'admin-roles',
    component: () => import('../views/RoleListView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/component-definitions',
    name: 'component-definitions',
    component: () =>
      import('../views/component-definitions/ComponentDefinitionListView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/component-definitions/create',
    name: 'component-definition-create',
    component: () =>
      import(
        '../views/component-definitions/ComponentDefinitionCreateView.vue'
      ),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/component-definitions/:id',
    name: 'component-definition-editor',
    component: () =>
      import(
        '../views/component-definitions/ComponentDefinitionEditorView.vue'
      ),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'component-definition-overview',
        component: () =>
          import(
            '../views/component-definitions/ComponentDefinitionOverviewView.vue'
          ),
      },
      {
        path: 'import-definitions',
        name: 'component-definition-import-definitions',
        component: () =>
          import(
            '../views/component-definitions/ComponentDefinitionImportDefinitionsView.vue'
          ),
      },
      {
        path: 'components',
        name: 'component-definition-components',
        component: () =>
          import(
            '../views/component-definitions/ComponentDefinitionComponentsView.vue'
          ),
      },
      {
        path: 'capabilities',
        name: 'component-definition-capabilities',
        component: () =>
          import(
            '../views/component-definitions/ComponentDefinitionCapabilitiesView.vue'
          ),
      },
      {
        path: 'back-matter',
        name: 'component-definition-back-matter',
        component: () =>
          import(
            '../views/component-definitions/ComponentDefinitionBackMatterView.vue'
          ),
      },
      {
        path: 'json',
        name: 'component-definition-json',
        component: () =>
          import(
            '../views/component-definitions/ComponentDefinitionJSONView.vue'
          ),
      },
    ],
  },
  {
    path: '/component-definitions/:id/edit',
    name: 'component-definition-edit',
    component: () =>
      import('../views/component-definitions/ComponentDefinitionEditView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/assessment-plans',
    name: 'assessment-plans',
    component: () =>
      import('../views/assessment-plans/AssessmentPlanListView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/assessment-plans/create',
    name: 'assessment-plan-create',
    component: () =>
      import('../views/assessment-plans/AssessmentPlanCreateView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/assessment-plans/:id',
    name: 'assessment-plan-editor',
    component: () =>
      import('../views/assessment-plans/AssessmentPlanEditorView.vue'),
    meta: {
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
        path: 'subjects',
        name: 'assessment-plan-subjects',
        component: () =>
          import('../views/assessment-plans/AssessmentPlanSubjectsView.vue'),
      },
      {
        path: 'assets',
        name: 'assessment-plan-assets',
        component: () =>
          import('../views/assessment-plans/AssessmentPlanAssetsView.vue'),
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
    component: () =>
      import('../views/assessment-plans/AssessmentPlanEditView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/subject/:id',
    name: 'admin-subject-crud',
    component: () => import('../views/SubjectEditView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/evidence',
    name: 'evidence:index',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/evidence/IndexView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/evidence/:id',
    name: 'evidence:view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/evidence/ViewView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/evidence/create',
    name: 'evidence:create',
    component: () => import('../views/evidence/CreateView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/evidence/:id/update',
    name: 'evidence:update',
    component: () => import('../views/evidence/UpdateView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/evidence/history/:uuid',
    name: 'evidence:history',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/evidence/HistoryView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/system-security-plans',
    name: 'system-security-plans',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import('../views/system-security-plans/SystemSecurityPlanListView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/plan-of-action-and-milestones',
    name: 'plan-of-action-and-milestones',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(
        '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesListView.vue'
      ),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/plan-of-action-and-milestones/create',
    name: 'plan-of-action-and-milestones-create',
    component: () =>
      import(
        '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesCreateView.vue'
      ),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/system-security-plans/:id',
    name: 'system-security-plan-editor',
    component: () =>
      import('../views/system-security-plans/SystemSecurityPlanEditorView.vue'),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'system-security-plan-overview',
        component: () =>
          import(
            '../views/system-security-plans/SystemSecurityPlanOverviewView.vue'
          ),
      },
      {
        path: 'system-characteristics',
        name: 'system-security-plan-characteristics',
        component: () =>
          import(
            '../views/system-security-plans/SystemSecurityPlanCharacteristicsView.vue'
          ),
      },
      {
        path: 'system-implementation',
        name: 'system-security-plan-system-implementation',
        component: () =>
          import(
            '../views/system-security-plans/SystemSecurityPlanSystemImplementationEditorView.vue'
          ),
      },
      {
        path: 'control-implementation',
        name: 'system-security-plan-control-implementation',
        component: () =>
          import(
            '../views/system-security-plans/SystemSecurityPlanControlImplementationView.vue'
          ),
      },
      {
        path: 'json',
        name: 'system-security-plan-json',
        component: () =>
          import(
            '../views/system-security-plans/SystemSecurityPlanJSONView.vue'
          ),
      },
    ],
  },
  {
    path: '/plan-of-action-and-milestones/:id',
    name: 'plan-of-action-and-milestones-editor',
    component: () =>
      import(
        '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesEditorView.vue'
      ),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'plan-of-action-and-milestones-overview',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesOverviewView.vue'
          ),
      },
      {
        path: 'poam-items',
        name: 'plan-of-action-and-milestones-poam-items',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesPoamItemsView.vue'
          ),
      },
      {
        path: 'import-ssp',
        name: 'plan-of-action-and-milestones-import-ssp',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesImportSspView.vue'
          ),
      },
      {
        path: 'system-id',
        name: 'plan-of-action-and-milestones-system-id',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesSystemIdView.vue'
          ),
      },
      {
        path: 'local-definitions',
        name: 'plan-of-action-and-milestones-local-definitions',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesLocalDefinitionsView.vue'
          ),
      },
      {
        path: 'observations',
        name: 'plan-of-action-and-milestones-observations',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesObservationsView.vue'
          ),
      },
      {
        path: 'risks',
        name: 'plan-of-action-and-milestones-risks',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesRisksView.vue'
          ),
      },
      {
        path: 'findings',
        name: 'plan-of-action-and-milestones-findings',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesFindingsView.vue'
          ),
      },
      {
        path: 'back-matter',
        name: 'plan-of-action-and-milestones-back-matter',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesBackMatterView.vue'
          ),
      },
      {
        path: 'json',
        name: 'plan-of-action-and-milestones-json',
        component: () =>
          import(
            '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesJSONView.vue'
          ),
      },
    ],
  },
  {
    path: '/plan-of-action-and-milestones/:id/edit',
    name: 'plan-of-action-and-milestones-edit',
    component: () =>
      import(
        '../views/plan-of-actions-and-milestones/PlanOfActionAndMilestonesEditView.vue'
      ),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/system-security-plans/create',
    name: 'system-security-plans-create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import('../views/system-security-plans/SystemSecurityPlanListView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/assessment-results',
    name: 'assessment-results',
    component: () =>
      import('../views/assessment-results/AssessmentResultsListView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/assessment-results/create',
    name: 'assessment-results-create',
    component: () =>
      import('../views/assessment-results/AssessmentResultsCreateView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/assessment-results/:id',
    name: 'assessment-results-editor',
    component: () =>
      import('../views/assessment-results/AssessmentResultsEditorView.vue'),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'assessment-results-overview',
        component: () =>
          import(
            '../views/assessment-results/AssessmentResultsOverviewView.vue'
          ),
      },
      {
        path: 'import-ap',
        name: 'assessment-results-import-ap',
        component: () =>
          import(
            '../views/assessment-results/AssessmentResultsImportApView.vue'
          ),
      },
      {
        path: 'results',
        name: 'assessment-results-results',
        component: () =>
          import(
            '../views/assessment-results/AssessmentResultsResultsView.vue'
          ),
      },
      {
        path: 'local-definitions',
        name: 'assessment-results-local-definitions',
        component: () =>
          import(
            '../views/assessment-results/AssessmentResultsLocalDefinitionsView.vue'
          ),
      },
      {
        path: 'back-matter',
        name: 'assessment-results-back-matter',
        component: () =>
          import(
            '../views/assessment-results/AssessmentResultsBackMatterView.vue'
          ),
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
    component: () =>
      import('../views/assessment-results/AssessmentResultsEditView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/users',
    name: 'users-list',
    component: () => import('../views/users/UsersListView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/users/:id',
    name: 'user-view',
    component: () => import('../views/users/UserView.vue'),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
  },
];

const publicRoutes = [
  {
    path: 'login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
  },
  {
    path: 'logout',
    name: 'logout',
    component: () => import('@/views/LogoutView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth',
      name: 'auth',
      component: GuestLayout,
      children: publicRoutes,
      meta: {
        requiresAuth: false,
        asd: false,
      },
    },
    {
      path: '/',
      name: 'app',
      component: AppLayout,
      children: authenticatedRoutes,
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

  // Proceed to the requested route
  return next();
});

export default router;
