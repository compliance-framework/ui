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
import AppShell from '@/views/layouts/AppShell.vue';
import router from './index';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { useSystemStore } from '@/stores/system';
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
  redirect?: RouteRecordNormalized['redirect'];
};

// The SSP users/components/authorizations tabs duplicate sections of the V2
// Implementation tab, so they redirect there (owner decision 2026-10-10).
const toImplementationSection =
  (section: string): RouteRecordNormalized['redirect'] =>
  (to) => ({
    name: 'system-security-plan-implementation',
    params: to.params,
    query: { ...to.query, section },
  });

// `/system/*` showed the active SSP a second time, in a second visual system.
// Each of its routes now redirects to the same section of the active SSP's V2
// detail page (owner decision 2026-10-11, backlog M1-10). Without an active
// SSP it goes to the library, whose `next` query returns here once one is set.
// `applyV2Routes` throws if main adds a /system child that isn't mapped here.

const toActiveSsp =
  (name: string, section?: string): RouteRecordNormalized['redirect'] =>
  (to) => {
    const sspId = useSystemStore().system.securityPlan?.uuid;
    if (!sspId) {
      return { name: 'system-security-plans', query: { next: to.fullPath } };
    }
    return {
      name,
      params: { id: sspId },
      query: section ? { ...to.query, section } : to.query,
    };
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

  // Navigating by the parent's name skips its '' child, so it redirects too.
  system: { redirect: toActiveSsp('system-security-plan-overview') },
  'system:overview': { redirect: toActiveSsp('system-security-plan-overview') },
  'system:characteristics': {
    redirect: toActiveSsp('system-security-plan-characteristics'),
  },
  'system:implementation': {
    redirect: toActiveSsp('system-security-plan-implementation'),
  },
  'system:users': {
    redirect: toActiveSsp('system-security-plan-implementation', 'users'),
  },
  'system:components': {
    redirect: toActiveSsp('system-security-plan-implementation', 'components'),
  },
  'system-component-dashboards': {
    redirect: toActiveSsp('system-security-plan-implementation', 'components'),
  },
  'system:authorizations': {
    redirect: toActiveSsp(
      'system-security-plan-implementation',
      'authorizations',
    ),
  },
  'system:control-implementation': {
    redirect: toActiveSsp('system-security-plan-control-implementation'),
  },
  'system:export-offerings': {
    redirect: toActiveSsp('system-security-plan-export-offerings'),
  },
  'system:leverage': { redirect: toActiveSsp('system-security-plan-leverage') },
  'system:inherited-capabilities': {
    redirect: toActiveSsp('system-security-plan-inherited-capabilities'),
  },
  'system:risks': { redirect: toActiveSsp('system-security-plan-risks') },
  'system:compliance': {
    redirect: toActiveSsp('system-security-plan-compliance'),
  },
  'system:json': { redirect: toActiveSsp('system-security-plan-json') },

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
  'system-security-plan-users': { redirect: toImplementationSection('users') },
  'system-security-plan-components': {
    redirect: toImplementationSection('components'),
  },
  'system-security-plan-authorizations': {
    redirect: toImplementationSection('authorizations'),
  },
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

// Component swaps that must NOT be tagged v2. The `app` root hosts both V1 and
// V2 children, and tagging it would make the mixed-version guard block V1 pages.
export const V2_COMPONENT_SWAPS: Record<string, RouteViewComponent> = {
  app: AppShell,
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

// The /__v2 design sandboxes stay reachable for design review on preview
// images, but only for admins (backlog M1-19). They are deleted at cutover (C-01a).
const SANDBOX_PERMISSION = {
  resource: RESOURCES.ADMIN,
  action: ACTIONS.MANAGE,
};

export function applyV2Routes(target: Router): void {
  const records = new Map(
    target.getRoutes().map((record) => [record.name, record]),
  );

  // Fail loudly when main renames or removes a route this overlay targets, so
  // the daily merge surfaces it instead of silently dropping a V2 view.
  const missing = [
    ...Object.keys(V2_ROUTE_OVERRIDES),
    ...Object.keys(V2_COMPONENT_SWAPS),
  ].filter((name) => !records.has(name));
  if (missing.length > 0) {
    throw new Error(
      `[ui-v2] Route overlay targets routes missing from src/router/index.ts: ${missing.join(', ')}`,
    );
  }

  const unmappedSystemRoutes = (records.get('system')?.children ?? [])
    .map((child) => String(child.name))
    .filter((name) => !V2_ROUTE_OVERRIDES[name]?.redirect);
  if (unmappedSystemRoutes.length > 0) {
    throw new Error(
      `[ui-v2] /system routes without an active-SSP redirect: ${unmappedSystemRoutes.join(', ')}`,
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
    if (override.redirect) {
      record.redirect = override.redirect;
    }
    Object.assign(record.meta, override.meta, { uiVersion: 'v2' });
  }

  for (const [name, component] of Object.entries(V2_COMPONENT_SWAPS)) {
    const record = records.get(name)!;
    record.components = { ...record.components, default: component };
  }

  target.addRoute('app', {
    path: '__v2/tokens',
    name: 'ui-v2:tokens',
    component: () => import('../views/system-v2/V2TokenVisualTestView.vue'),
    meta: {
      requiresAuth: true,
      uiVersion: 'v2',
      permission: SANDBOX_PERMISSION,
    },
  });
  target.addRoute('app', {
    path: '__v2/components',
    name: 'ui-v2:components',
    component: () => import('../views/system-v2/V2ComponentLibraryView.vue'),
    meta: {
      requiresAuth: true,
      uiVersion: 'v2',
      permission: SANDBOX_PERMISSION,
    },
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
