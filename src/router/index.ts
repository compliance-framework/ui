import { createRouter, createWebHistory } from 'vue-router'
import AppView from '../views/AppView.vue'
import { useUserStore } from '@/stores/auth';

const authenticatedRoutes = [
  {
    path: '/',
    name: 'home',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsSearchView.vue'),
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
    component: () => import('../views/DashboardsView.vue'),
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
    component: () => import('../views/DashboardCreate.vue'),
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
    component: () => import('../views/DashboardsView.vue'),
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
    path: '/findings/:id',
    name: 'finding-view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/findings/history/:uuid',
    name: 'finding-history',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsHistoryView.vue'),
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
    path: '/subject/:id',
    name: 'admin-subject-crud',
    component: () => import('../views/SubjectEditView.vue'),
    meta: {
      requiresAuth: true,
    }
  },
  {
    path: '/findings',
    name: 'findings',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsSearchView.vue'),
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
    component: () => import('../views/LoginView.vue'),
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth',
      name: 'auth',
      component: AppView,
      children: publicRoutes,
      meta: {
        requiresAuth: false,
        asd: false,
      }
    },
    {
      path: '/',
      name: 'app',
      component: AppView,
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
    next({ name: 'login' });
  } else {
    // Proceed to the requested route
    next();
  }
});

export default router
