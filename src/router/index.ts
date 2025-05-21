import { createRouter, createWebHistory } from 'vue-router'
import AppView from '../views/AppView.vue'

const authenticatedRoutes = [
  {
    path: '/',
    name: 'home',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsSearchView.vue'),
  },
  {
    path: '/dashboards',
    name: 'dashboards',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/DashboardsView.vue'),
  },
  {
    path: '/dashboards/create',
    name: 'dashboards.create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/DashboardCreate.vue'),
  },
  {
    path: '/dashboards/:id',
    name: 'dashboards.view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/DashboardsView.vue'),
  },
  {
    path: '/catalogs',
    name: 'catalog-list',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/CatalogListView.vue'),
  },
  {
    path: '/catalogs/:id',
    name: 'catalog-view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/CatalogView.vue'),
  },
  {
    path: '/catalogs/new',
    name: 'catalog-create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/CatalogCreateView.vue'),
  },
  {
    path: '/catalogs/control/:class/:id',
    name: 'catalog-control-findings',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/CatalogControlFindings.vue'),
  },
  {
    path: "/profiles",
    name: "profile-list",
    component: () => import ("../views/ProfileListView.vue"),
  },
  {
    path: "/profiles/:id",
    name: "profile-view",
    component: () => import("../views/ProfileView.vue"),
  },
  {
    path: '/findings/:id',
    name: 'finding-view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsView.vue'),
  },
  {
    path: '/findings/history/:uuid',
    name: 'finding-history',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsHistoryView.vue'),
  },
  {
    path: '/subjects',
    name: 'admin-subjects',
    component: () => import('../views/SubjectsView.vue'),
  },
  {
    path: '/subject/:id',
    name: 'admin-subject-crud',
    component: () => import('../views/SubjectEditView.vue'),
  },
  {
    path: '/findings',
    name: 'findings',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsSearchView.vue'),
  },
  {
    path: '/findings/by-subject',
    name: 'findings-by-subject',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsBySubjectSearchView.vue'),
  },
  {
    path: '/findings/by-class',
    name: 'list-classes-of-findings',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/ControlClassesView.vue'),
  },
  {
    path: '/findings/by-class/:className',
    name: 'findings-by-class',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsByClassSearchView.vue'),
  },
  {
    path: '/system-security-plans',
    name: 'system-security-plans',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/SystemSecurityPlanListView.vue'),
  },
  {
    path: '/system-security-plans/:id/editor',
    name: 'system-security-plans-editor',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/SystemSecurityPlanEditorView.vue'),
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
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'app',
      component: AppView,
      children: authenticatedRoutes
    },
  ],
})

export default router
