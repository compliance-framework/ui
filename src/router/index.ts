import { createRouter, createWebHistory } from 'vue-router'
import AppView from '../views/AppView.vue'

const authenticatedRoutes = [
  {
    path: '/',
    name: 'home',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/assessment-plans/create',
    name: 'assessment-plan.create',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/AssessmentPlanCreate.vue'),
  },
  {
    path: '/assessment-plans/:id',
    name: 'assessment-plan.view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/AssessmentPlanView.vue'),
  },
  {
    path: '/findings/:id',
    name: 'finding-view',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/ResultView.vue'),
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
    path: '/findings',
    name: 'findings',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/FindingsSearchView.vue'),
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
