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
    path: '/catalogs/control/:class/:id',
    name: 'catalog-control-findings',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/CatalogControlFindings.vue'),
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
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
  },
  {
    path: '/components',
    name: 'findings-by-components',
    component: () => import('../views/ComponentList.vue')
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
