import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/views/layouts/App.vue'
import GuestLayout from '@/views/layouts/Guest.vue'
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
    }
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
    }
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
    }
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
    }
  },
  {
    path: '/catalogs',
    name: 'catalog-list',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/CatalogListView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/catalogs/:id',
    name: 'catalog-view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/CatalogView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/catalogs/new',
    name: 'catalog-create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/CatalogCreateView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/catalogs/control/:class/:id',
    name: 'catalog-control-findings',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/CatalogControlFindings.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/subjects',
    name: 'admin-subjects',
    component: () => import('../views/SubjectsView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/parties',
    name: 'admin-parties',
    component: () => import('../views/PartyListView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/roles',
    name: 'admin-roles',
    component: () => import('../views/RoleListView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/component-definitions',
    name: 'component-definitions',
    component: () => import('../views/ComponentDefinitionListView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/component-definitions/create',
    name: 'component-definition-create',
    component: () => import('../views/ComponentDefinitionCreateView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/component-definitions/:id',
    name: 'component-definition-editor',
    component: () => import('../views/ComponentDefinitionEditorView.vue'),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'component-definition-overview',
        component: () => import('../views/ComponentDefinitionOverviewView.vue')
      },
      {
        path: 'import-definitions',
        name: 'component-definition-import-definitions',
        component: () => import('../views/ComponentDefinitionImportDefinitionsView.vue')
      },
      {
        path: 'components',
        name: 'component-definition-components',
        component: () => import('../views/ComponentDefinitionComponentsView.vue')
      },
      {
        path: 'capabilities',
        name: 'component-definition-capabilities',
        component: () => import('../views/ComponentDefinitionCapabilitiesView.vue')
      },
      {
        path: 'back-matter',
        name: 'component-definition-back-matter',
        component: () => import('../views/ComponentDefinitionBackMatterView.vue')
      },
      {
        path: 'json',
        name: 'component-definition-json',
        component: () => import('../views/ComponentDefinitionJSONView.vue')
      },
    ]
  },
  {
    path: '/component-definitions/:id/edit',
    name: 'component-definition-edit',
    component: () => import('../views/ComponentDefinitionEditView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/subject/:id',
    name: 'admin-subject-crud',
    component: () => import('../views/SubjectEditView.vue'),
    meta: {
      requiresAuth: true,
    }
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
    }
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
    }
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
    }
  },
  {
    path: '/findings/by-subject',
    name: 'findings-by-subject',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsBySubjectSearchView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/findings/by-class',
    name: 'list-classes-of-findings',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/ControlClassesView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/findings/by-class/:className',
    name: 'findings-by-class',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsByClassSearchView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/system-security-plans',
    name: 'system-security-plans',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/SystemSecurityPlanListView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/system-security-plans/:id/editor',
    name: 'system-security-plans-editor',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/SystemSecurityPlanEditorView.vue'),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'system-security-plans-characteristics',
        component: () => import('../views/SystemSecurityPlanCharacteristicsEditorView.vue')
      },
      {
        path: 'diagrams',
        name: 'system-security-plans-diagrams',
        component: () => import('../views/SystemSecurityPlanDiagramsEditorView.vue')
      },
      {
        path: 'system-implementation',
        name: 'system-security-plans-system-implementation',
        component: () => import('../views/SystemSecurityPlanSystemImplementationEditorView.vue')
      },
      {
        path: 'control-implementation',
        name: 'system-security-plans-control-implementation',
        component: () => import('../views/SystemSecurityPlanControlImplementationEditorView.vue')
      },
    ]
  },
  {
    path: '/system-security-plans/create',
    name: 'system-security-plans-create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/SystemSecurityPlanListView.vue'),
    meta: {
      requiresAuth: true,
    }
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
    component: () => import('@/views/LogoutView.vue')
  }
]

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
      }
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
})

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const userStore = useUserStore();
  const isAuthenticated = userStore.isAuthenticated;
  if (requiresAuth && !isAuthenticated) {
    // Redirect to the login page if the user is not authenticated
    return next({ name: 'login', query: {next: to.fullPath} });
  }

  // Proceed to the requested route
  return next();
});

export default router
