<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import BrandMark from '@/ds/components/BrandMark/BrandMark.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import Icon from '@/ds/components/Icon/Icon.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import ScrollArea from '@/ds/components/ScrollArea/ScrollArea.vue';
import SystemSwitcher from '@/ds/components/SystemSwitcher/SystemSwitcher.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useTheme } from '@/composables/useTheme';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { SystemSecurityPlan } from '@/oscal';
import { useUserStore } from '@/stores/auth';
import { usePermissionsStore } from '@/stores/permissions';
import { useSystemStore } from '@/stores/system';
import type { DataResponse } from '@/stores/types';
import PrimaryNav from './PrimaryNav.vue';
import { useContentScroll } from './useContentScroll';
import { useNavMode } from './useNavMode';

/**
 * The app shell: skip link, header (product mark, account menu with theme), primary nav as
 * drawer / rail / expanded by width, and one scrolling <main>.
 * The catalog view is kept alive between visits.
 */
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const permissions = usePermissionsStore();
const systemStore = useSystemStore();
const api = useAuthenticatedInstance();
const { theme, isSystemTheme, toggleTheme, useSystemValue } = useTheme();

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

// Account ------------------------------------------------------------------------------------

const userName = computed(() => {
  const user = userStore.user;
  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'Unknown user'
  );
});
const initials = computed(() => {
  const user = userStore.user;
  return (
    `${user?.firstName?.trim()[0] ?? ''}${user?.lastName?.trim()[0] ?? ''}`.toUpperCase() ||
    'U'
  );
});

const themeChoice = computed(() =>
  isSystemTheme.value ? 'system' : theme.value,
);
function chooseTheme(value: string): void {
  if (value === 'system') return useSystemValue();
  // toggleTheme flips the theme and pins it as an explicit choice; flipping twice pins the current one.
  if (value !== theme.value) toggleTheme();
  else if (isSystemTheme.value) {
    toggleTheme();
    toggleTheme();
  }
}

const userMenu = computed<MenuEntry[]>(() => [
  { label: 'Preferences', icon: 'preferences', to: { name: 'preferences' } },
  {
    type: 'radio',
    label: 'Theme',
    value: themeChoice.value,
    options: [
      { value: 'light', label: 'Light', icon: 'themeLight' },
      { value: 'dark', label: 'Dark', icon: 'themeDark' },
      { value: 'system', label: 'Match system', icon: 'themeSystem' },
    ],
    onChange: chooseTheme,
  },
  { type: 'separator' },
  { label: 'Sign out', icon: 'signOut', to: { name: 'logout' } },
]);
</script>

<template>
  <TooltipProvider>
    <div class="shell" :class="`shell--${mode}`">
      <a href="#main" class="shell__skip">Skip to main content</a>

      <header class="shell__top">
        <RouterLink
          v-if="mode !== 'drawer'"
          :to="{ name: 'home' }"
          class="shell__corner"
          aria-label="CCF, Continuous Compliance Framework, home"
        >
          <BrandMark />
          <span class="shell__wordmark" aria-hidden="true">CCF</span>
        </RouterLink>
        <div class="shell__header">
          <IconButton
            v-if="mode === 'drawer'"
            icon="menu"
            label="Open navigation"
            aria-haspopup="dialog"
            @click="drawerOpen = true"
          />
          <RouterLink
            v-if="mode === 'drawer'"
            :to="{ name: 'home' }"
            class="shell__brand"
            aria-label="CCF, Continuous Compliance Framework, home"
          >
            <BrandMark />
            <span class="shell__wordmark" aria-hidden="true">CCF</span>
          </RouterLink>
          <div
            v-if="mode === 'drawer' && canReadSystems"
            class="shell__switcher"
          >
            <SystemSwitcher
              :systems="systems"
              :current-id="systemStore.system.securityPlan?.uuid"
              :all-systems-to="{ name: 'systems' }"
              @select="switchSystem"
            />
          </div>
          <div class="shell__tools">
            <Menu :label="`Account menu, ${userName}`" :items="userMenu">
              <template #trigger>
                <button type="button" class="shell__account">
                  <!-- Named by hidden text rather than aria-label, so the name always includes
                       what is visible (WCAG 2.5.3) even when the name is hidden on narrow screens. -->
                  <span class="visually-hidden"
                    >Account menu, {{ userName }}</span
                  >
                  <span class="shell__avatar" aria-hidden="true">{{
                    initials
                  }}</span>
                  <span class="shell__account-name" aria-hidden="true">{{
                    userName
                  }}</span>
                  <Icon name="expand" />
                </button>
              </template>
              <template #header>
                <span class="shell__menu-name">{{ userName }}</span>
                <span class="shell__menu-meta">{{
                  userStore.user?.email
                }}</span>
              </template>
            </Menu>
          </div>
        </div>
      </header>

      <div class="shell__body">
        <nav
          v-if="mode !== 'drawer'"
          id="primary-nav"
          class="shell__nav"
          aria-label="Primary"
        >
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
          title="Navigation"
          side="left"
          title-hidden
        >
          <nav aria-label="Primary">
            <PrimaryNav mode="drawer" @navigate="drawerOpen = false" />
          </nav>
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
  /* App frame (scroll model): header and nav stay put; only the content scrolls. */
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
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

.shell__top {
  display: flex;
  min-width: 0;
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
  background: var(--ds-color-surface-raised);
}

.shell__corner {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-2);
  width: var(--ds-width-nav);
  border-right: var(--ds-border-width) solid var(--ds-color-border-subtle);
  color: var(--ds-color-text-primary);
  text-decoration: none;
}

.shell--rail .shell__corner {
  width: var(--ds-width-rail);
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

.shell__header {
  z-index: var(--ds-z-header);
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: var(--ds-space-2) var(--ds-space-3);
  height: var(--ds-height-header);
  padding: 0 var(--ds-space-page-x);
  background: var(--ds-color-surface-raised);
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

.shell__tools {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--ds-space-1);
  margin-left: auto;
}

.shell__work,
.shell__account {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-2);
  height: var(--ds-size-control-md);
  padding: 0 var(--ds-space-2);
  border: var(--ds-border-width) solid transparent;
  background: transparent;
  color: var(--ds-color-text-primary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  text-decoration: none;
  text-transform: uppercase;
  cursor: pointer;
}

.shell__work:hover,
.shell__account:hover {
  background: var(--ds-color-surface-hover);
}

.shell__avatar {
  display: inline-grid;
  place-items: center;
  width: var(--ds-size-control-sm);
  height: var(--ds-size-control-sm);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-round);
  background: var(--ds-color-surface-sunken);
}

.shell__account-name {
  text-transform: none;
  letter-spacing: normal;
}

.shell__menu-name {
  display: block;
  font-weight: var(--ds-font-weight-bold);
}

.shell__menu-meta {
  display: block;
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
}

.shell__body {
  display: flex;
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
  justify-content: flex-end;
  padding: var(--ds-space-2) var(--ds-space-3);
  border-top: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.shell--rail .shell__nav-footer {
  justify-content: center;
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

/* Below 640px labels give way to icons, and the system switcher takes its own full-width row. */
@media (max-width: 639px) {
  .shell__header {
    flex-wrap: wrap;
    column-gap: var(--ds-space-1);
    height: auto;
    padding-block: var(--ds-space-2);
  }

  .shell__work,
  .shell__account {
    padding-inline: var(--ds-space-1);
  }

  .shell__switcher {
    flex-basis: 100%;
    order: 1;
  }

  .shell__switcher > * {
    flex: 1;
  }

  .shell__wordmark,
  .shell__work-label,
  .shell__account-name {
    display: none;
  }
}

@media (max-width: 1023px) {
  .shell__account-name {
    display: none;
  }
}
</style>
