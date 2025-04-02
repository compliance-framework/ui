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
    name: 'subjects',
    component: () => import('../views/SubjectsView.vue'),
  },
  {
    path: '/subject/:subjectId',
    name: 'subject-crud',
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
