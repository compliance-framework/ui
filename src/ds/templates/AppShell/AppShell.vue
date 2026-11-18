<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import BrandMark from '@/ds/components/BrandMark/BrandMark.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import ScrollArea from '@/ds/components/ScrollArea/ScrollArea.vue';
import SystemSwitcher from '@/ds/components/SystemSwitcher/SystemSwitcher.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { SystemSecurityPlan } from '@/oscal';
import { useUserStore } from '@/stores/auth';
import { usePermissionsStore } from '@/stores/permissions';
import { useSystemStore } from '@/stores/system';
import type { DataResponse } from '@/stores/types';
import AccountMenu from './AccountMenu.vue';
import PrimaryNav from './PrimaryNav.vue';
import { useContentScroll } from './useContentScroll';
import { useNavMode } from './useNavMode';

/**
 * The app shell: skip link, primary nav as drawer / rail / expanded by width, and one scrolling
 * <main>. The nav holds the product mark at its head and the account menu (with theme) at its
 * foot; only the drawer layout has a top bar, for the menu button.
 * The catalog view is kept alive between visits.
 */
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const permissions = usePermissionsStore();
const systemStore = useSystemStore();
const api = useAuthenticatedInstance();

const { mode, toggle } = useNavMode();
const drawerOpen = ref(false);
const main = ref<HTMLElement>();
useContentScroll(main);
watch(
  () => route.fullPath,
  () => (drawerOpen.value = false),
);

onMounted(() => {
  if (userStore.isAuthenticated) permissions.hydrate();
  void loadSystems();
});

// Systems ------------------------------------------------------------------------------------

const canReadSystems = computed(() =>
  permissions.can(RESOURCES.SSP, ACTIONS.READ),
);

async function loadSystems(): Promise<void> {
  if (!canReadSystems.value) return;
  try {
    const response = await api.get<DataResponse<SystemSecurityPlan[]>>(
      '/api/oscal/system-security-plans',
    );
    systemStore.setAvailablePlans(response.data.data ?? []);
  } catch {
    // Keep the current list; the 401/403 interceptors handle auth errors.
  }
}

const systems = computed(() =>
  systemStore.availablePlans.map((plan) => ({
    id: plan.uuid,
    name: plan.metadata.title,
    description: plan.metadata.version
      ? `Version ${plan.metadata.version}`
      : '',
  })),
);

/**
 * Switching keeps the user on the same page of the newly chosen system. On a system page
 * that means the same route with the new system in the URL; SystemScope then makes it
 * current. Elsewhere the choice goes straight to the store.
 */
function switchSystem(id: string): void {
  if (typeof route.params.systemId === 'string') {
    if (route.params.systemId === id) return;
    // A record belongs to the system it was opened from, so switching from one goes to the
    // new system's list for that section.
    if (route.params.evidenceId) {
      void router.push({
        name: 'system-evidence',
        params: { systemId: id },
      });
      return;
    }
    void router.push({
      name: route.name ?? 'system-evidence',
      params: { ...route.params, systemId: id },
    });
    return;
  }
  const plan = systemStore.availablePlans.find(
    (candidate) => candidate.uuid === id,
  );
  if (plan) systemStore.setSecurityPlan(plan);
}
</script>

<template>
  <TooltipProvider>
    <div class="shell" :class="`shell--${mode}`">
      <a href="#main" class="shell__skip">Skip to main content</a>

      <header v-if="mode === 'drawer'" class="shell__top ds-scope-nav">
        <IconButton
          icon="menu"
          label="Open navigation"
          aria-haspopup="dialog"
          @click="drawerOpen = true"
        />
        <RouterLink
          :to="{ name: 'home' }"
          class="shell__brand"
          aria-label="CCF, Continuous Compliance Framework, home"
        >
          <BrandMark />
          <span class="shell__wordmark" aria-hidden="true">CCF</span>
        </RouterLink>
        <div v-if="canReadSystems" class="shell__switcher">
          <SystemSwitcher
            :systems="systems"
            :current-id="systemStore.system.securityPlan?.uuid"
            :all-systems-to="{ name: 'systems' }"
            @select="switchSystem"
          />
        </div>
      </header>

      <div class="shell__body">
        <nav
          v-if="mode !== 'drawer'"
          id="primary-nav"
          class="shell__nav ds-scope-nav"
          aria-label="Primary"
        >
          <RouterLink
            :to="{ name: 'home' }"
            class="shell__corner"
            aria-label="CCF, Continuous Compliance Framework, home"
          >
            <BrandMark />
            <span class="shell__wordmark" aria-hidden="true">CCF</span>
          </RouterLink>
          <div v-if="canReadSystems" class="shell__nav-switcher">
            <SystemSwitcher
              :systems="systems"
              :current-id="systemStore.system.securityPlan?.uuid"
              :all-systems-to="{ name: 'systems' }"
              :variant="mode === 'rail' ? 'compact' : 'sidebar'"
              @select="switchSystem"
            />
          </div>
          <ScrollArea surface="raised" scrollbar="none"
            ><PrimaryNav :mode="mode"
          /></ScrollArea>
          <div class="shell__nav-footer">
            <AccountMenu :compact="mode === 'rail'" />
            <IconButton
              :icon="mode === 'expanded' ? 'railCollapse' : 'railExpand'"
              :label="
                mode === 'expanded'
                  ? 'Collapse navigation'
                  : 'Expand navigation'
              "
              :expanded="mode === 'expanded'"
              controls="primary-nav"
              @click="toggle"
            />
          </div>
        </nav>
        <Drawer
          v-else
          v-model:open="drawerOpen"
          class="ds-scope-nav"
          title="Navigation"
          side="left"
          title-hidden
        >
          <nav aria-label="Primary">
            <PrimaryNav mode="drawer" @navigate="drawerOpen = false" />
          </nav>
          <template #footer>
            <div class="shell__drawer-footer"><AccountMenu /></div>
          </template>
        </Drawer>

        <main
          id="main"
          ref="main"
          class="shell__main"
          tabindex="-1"
          data-scroll
        >
          <RouterView v-slot="{ Component }">
            <!-- The catalog keeps its open groups when you visit a control and come back. -->
            <KeepAlive include="CatalogScreen">
              <component :is="Component" />
            </KeepAlive>
          </RouterView>
          <div data-tooltip-portal />
        </main>
      </div>
    </div>
  </TooltipProvider>
</template>

<style scoped>
.shell {
  /* App frame (scroll model): the nav stays put; only the content scrolls. */
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
  background: var(--ds-color-surface-base);
  color: var(--ds-color-text-primary);
  font-family: var(--ds-font-ui);
}

.shell__skip {
  position: absolute;
  top: var(--ds-space-2);
  left: var(--ds-space-2);
  z-index: var(--ds-z-tooltip);
  padding: var(--ds-space-2) var(--ds-space-4);
  background: var(--ds-color-action-primary-bg);
  border: var(--ds-border-width) solid var(--ds-color-action-primary-border);
  color: var(--ds-color-action-primary-fg);
  font-weight: var(--ds-font-weight-bold);
  transform: translateY(-200%);
}

.shell__skip:focus {
  transform: none;
}

/* The drawer layout's top bar: menu button, mark and system switcher. */
.shell__top {
  z-index: var(--ds-z-header);
  display: flex;
  flex: none;
  min-width: 0;
  align-items: center;
  gap: var(--ds-space-2) var(--ds-space-3);
  height: var(--ds-height-header);
  padding: 0 var(--ds-space-page-x);
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
  background: var(--ds-color-surface-raised);
}

.shell__corner {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-2);
  height: var(--ds-height-header);
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
  color: var(--ds-color-text-primary);
  text-decoration: none;
}

.shell--rail .shell__corner .shell__wordmark {
  display: none;
}

.shell__nav-switcher {
  display: flex;
  flex: none;
  padding: var(--ds-space-3) var(--ds-space-3) 0;
  background: var(--ds-color-surface-raised);
}

.shell__nav-switcher > * {
  flex: 1;
}

.shell__brand {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--ds-space-2);
  min-height: var(--ds-size-target-min);
  color: var(--ds-color-text-primary);
  text-decoration: none;
}

.shell__wordmark {
  font-size: var(--ds-font-size-body);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-logo);
}

.shell__switcher {
  display: flex;
  flex: 0 1 auto;
  min-width: 0;
}

.shell__body {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.shell__nav {
  display: flex;
  flex: none;
  flex-direction: column;
  width: var(--ds-width-nav);
  min-height: 0;
  border-right: var(--ds-border-width) solid var(--ds-color-border-subtle);
  background: var(--ds-color-surface-raised);
}

.shell--rail .shell__nav {
  width: var(--ds-width-rail);
}

.shell__nav-footer {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2) var(--ds-space-3);
  border-top: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.shell--rail .shell__nav-footer {
  flex-direction: column;
}

.shell__drawer-footer {
  display: flex;
  flex: 1;
  min-width: 0;
}

.shell__main {
  /* The one page scroller. A size container, so panes inside can size to it (100cqh). */
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--ds-space-4);
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: var(--ds-space-6) var(--ds-space-page-x) var(--ds-space-12);
  container-type: size;
}

.shell__main:focus {
  outline: none;
}

/* Below 640px the system switcher takes its own full-width row. */
@media (max-width: 639px) {
  .shell__top {
    flex-wrap: wrap;
    column-gap: var(--ds-space-1);
    height: auto;
    padding-block: var(--ds-space-2);
  }

  .shell__switcher {
    flex-basis: 100%;
    order: 1;
  }

  .shell__switcher > * {
    flex: 1;
  }
}
</style>
