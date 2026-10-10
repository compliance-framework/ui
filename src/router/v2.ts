// Branch-only overlay that applies the V2 UI on top of main's router.
//
// `src/router/index.ts` must stay byte-identical to main so the daily main merge
// doesn't conflict there (PRD §4.4). Every V2 route change lives here instead:
// swapped components, `meta.uiVersion` tags, V2-only routes and V2 guards.
// At cutover these are folded back into index.ts and this file is deleted.
import type {
  RouteLocationNormalized,
  RouteRecordNormalized,
  Router,
} from 'vue-router';
import GuestV2Layout from '@/views/layouts/GuestV2Layout.vue';
import router from './index';
import {
  dispatchUIMigrationStatusEvent,
  getMatchedUIVersions,
} from './uiMigrationInstrumentation';

type RouteViewComponent = NonNullable<
  RouteRecordNormalized['components']
>[string];

type V2RouteOverride = {
  component?: RouteViewComponent;
  meta?: Record<string, unknown>;
};

// Keyed by route name. Every entry is tagged `uiVersion: 'v2'`; entries without
// a component keep main's view (V1 inside the V2 shell, see route-inventory.md).
export const V2_ROUTE_OVERRIDES: Record<string, V2RouteOverride> = {
  home: {},
  dashboards: {
    component: () => import('../views/dashboards-v2/DashboardListView.vue'),
  },
  'dashboards.view': {
    component: () => import('../views/dashboards-v2/DashboardListView.vue'),
  },
  'controls:index': {
    component: () => import('../views/controls-v2/ControlsWorkspaceView.vue'),
  },

  system: {},
  'system:overview': {
    component: () => import('../views/system-v2/SystemOverviewView.vue'),
  },
  'system:characteristics': {},
  'system:implementation': {},
  'system:users': {},
  'system:components': {},
  'system-component-dashboards': {},
  'system:authorizations': {},
  'system:control-implementation': {},
  'system:export-offerings': {},
  'system:leverage': {},
  'system:inherited-capabilities': {},
  'system:risks': {},
  'system:compliance': {},
  'system:json': {},

  'system-security-plans': {
    component: () =>
      import(
        '../views/system-security-plans-v2/SystemSecurityPlanListView.vue'
      ),
  },
  'system-security-plans-create': {
    component: () =>
      import(
        '../views/system-security-plans-v2/SystemSecurityPlanCreateView.vue'
      ),
  },
  'system-security-plan-editor': {
    component: () =>
      import(
        '../views/system-security-plans-v2/SystemSecurityPlanEditorView.vue'
      ),
  },
  'system-security-plan-overview': {
    component: () =>
      import(
        '../views/system-security-plans-v2/SystemSecurityPlanOverviewView.vue'
      ),
  },
  'system-security-plan-characteristics': {
    component: () =>
      import(
        '../views/system-security-plans-v2/SystemSecurityPlanCharacteristicsView.vue'
      ),
  },
  'system-security-plan-implementation': {
    component: () =>
      import(
        '../views/system-security-plans-v2/SystemSecurityPlanSystemImplementationView.vue'
      ),
  },
  'system-security-plan-users': {},
  'system-security-plan-components': {},
  'system-security-plan-authorizations': {},
  'system-security-plan-control-implementation': {
    component: () =>
      import(
        '../views/system-security-plans-v2/SystemSecurityPlanControlImplementationView.vue'
      ),
  },
  'system-security-plan-export-offerings': {},
  'system-security-plan-leverage': {},
  'system-security-plan-inherited-capabilities': {},
  'system-security-plan-risks': {},
  'system-security-plan-risk-detail': {},
  'system-security-plan-compliance': {
    component: () =>
      import(
        '../views/system-security-plans-v2/SystemSecurityPlanComplianceView.vue'
      ),
  },
  'system-security-plan-json': {
    component: () =>
      import(
        '../views/system-security-plans-v2/SystemSecurityPlanJSONView.vue'
      ),
  },

  auth: {
    component: GuestV2Layout,
    meta: { hideThemeToggle: true },
  },
  login: {
    component: () => import('@/views/auth-v2/LoginView.vue'),
  },
  'forgot-password': {
    component: () => import('@/views/auth-v2/ForgotPasswordView.vue'),
  },
  'password-reset': {
    component: () => import('@/views/auth-v2/PasswordResetView.vue'),
  },
  'sso-callback': {
    component: () => import('@/views/auth-v2/SSOCallbackView.vue'),
  },
  'slack-link-callback': {},
  logout: {
    component: () => import('@/views/auth-v2/LogoutView.vue'),
  },
};

function violatesUIMigrationGuard(to: RouteLocationNormalized): boolean {
  const matchedUIVersions = getMatchedUIVersions(to.matched);
  const firstV2RecordIndex = matchedUIVersions.indexOf('v2');

  if (firstV2RecordIndex === -1) {
    return false;
  }

  return matchedUIVersions
    .slice(firstV2RecordIndex + 1)
    .some((version) => version !== 'v2');
}

export function applyV2Routes(target: Router): void {
  const records = new Map(
    target.getRoutes().map((record) => [record.name, record]),
  );

  // Fail loudly when main renames or removes a route this overlay targets, so
  // the daily merge surfaces it instead of silently dropping a V2 view.
  const missing = Object.keys(V2_ROUTE_OVERRIDES).filter(
    (name) => !records.has(name),
  );
  if (missing.length > 0) {
    throw new Error(
      `[ui-v2] Route overlay targets routes missing from src/router/index.ts: ${missing.join(', ')}`,
    );
  }

  // Normalized records are the matcher's own objects, so mutating them before
  // the first navigation changes what RouterView renders without re-adding
  // routes (re-adding a parent would drop its children).
  for (const [name, override] of Object.entries(V2_ROUTE_OVERRIDES)) {
    const record = records.get(name)!;
    if (override.component) {
      record.components = {
        ...record.components,
        default: override.component,
      };
    }
    Object.assign(record.meta, override.meta, { uiVersion: 'v2' });
  }

  target.addRoute('app', {
    path: '__v2/tokens',
    name: 'ui-v2:tokens',
    component: () => import('../views/system-v2/V2TokenVisualTestView.vue'),
    meta: { requiresAuth: true, uiVersion: 'v2' },
  });
  target.addRoute('app', {
    path: '__v2/components',
    name: 'ui-v2:components',
    component: () => import('../views/system-v2/V2ComponentLibraryView.vue'),
    meta: { requiresAuth: true, uiVersion: 'v2' },
  });
  target.addRoute({
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  });

  // Runs after main's guard (auth and permission checks).
  target.beforeEach((to, from) => {
    if (violatesUIMigrationGuard(to)) {
      console.error(
        `[ui-migration-guard] Blocked mixed V1/V2 route chain from "${from.fullPath}" to "${to.fullPath}".`,
      );
      return { name: 'not-found', query: { reason: 'mixed-ui-version' } };
    }
  });

  target.afterEach((to) => {
    dispatchUIMigrationStatusEvent(to);
  });
}

applyV2Routes(router);

export default router;
