<script setup lang="ts">
import { reactive, watch } from 'vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Icon from '@/ds/components/Icon/Icon.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import Tooltip from '@/ds/components/Tooltip/Tooltip.vue';
import type { NavMode } from './useNavMode';
import { useNav } from './useNav';

/**
 * Primary navigation. Expanded and drawer modes show icon + label, with Global, Control
 * definitions and Admin as disclosure groups. Rail mode shows icons with their labels as
 * accessible names and tooltips; the disclosure groups become flyout menus. Links to pages not
 * yet redesigned carry a marker, because they leave this shell for the legacy layout.
 */
defineProps<{ mode: NavMode }>();
const emit = defineEmits<{ navigate: [] }>();
const { groups, system } = useNav();

// Disclosure groups start open when they hold the current page; afterwards the user decides.
function savedGroups(): Record<string, boolean> {
  try {
    const value = JSON.parse(localStorage.getItem('ccf-nav-groups') ?? '{}');
    return Object.fromEntries(
      Object.entries(value).filter(([, v]) => typeof v === 'boolean') as [
        string,
        boolean,
      ][],
    );
  } catch {
    return {};
  }
}
const open = reactive<Record<string, boolean>>(savedGroups());
watch(
  open,
  (value) => localStorage.setItem('ccf-nav-groups', JSON.stringify(value)),
  { deep: true },
);
watch(
  () =>
    groups.value
      .filter((g) => g.containsActive)
      .map((g) => g.id)
      .join(','),
  () => {
    for (const group of groups.value)
      if (group.containsActive) open[group.id] = true;
  },
  { immediate: true },
);
const isOpen = (id: string, containsActive: boolean) =>
  open[id] ?? containsActive;
</script>

<template>
  <div class="primary-nav" :class="`primary-nav--${mode}`">
    <div
      v-for="group in groups"
      :key="group.id"
      class="primary-nav__group"
      :class="{ 'primary-nav__group--system': group.id === 'system' }"
    >
      <Menu
        v-if="group.collapsible && mode === 'rail'"
        :label="group.label ?? ''"
        :items="
          group.items.map((item) => ({
            label: item.label,
            icon: item.icon,
            to: item.to,
            current: item.active,
          }))
        "
        side="right"
      >
        <template #trigger>
          <button
            type="button"
            class="primary-nav__link primary-nav__link--rail"
            :class="{ 'primary-nav__link--active': group.containsActive }"
            :aria-label="group.label"
          >
            <Icon :name="group.icon ?? 'more'" />
          </button>
        </template>
      </Menu>

      <Disclosure
        v-else-if="group.collapsible"
        :label="group.label ?? ''"
        :icon="group.icon"
        variant="nav"
        :active="group.containsActive"
        :open="isOpen(group.id, group.containsActive)"
        @update:open="open[group.id] = $event"
      >
        <ul class="primary-nav__list primary-nav__list--nested">
          <li v-for="item in group.items" :key="item.name">
            <RouterLink
              :to="item.to"
              class="primary-nav__link"
              :class="{ 'primary-nav__link--active': item.active }"
              :aria-current="item.active ? 'page' : undefined"
              @click="emit('navigate')"
            >
              <Icon :name="item.icon" />
              <span>{{ item.label }}</span>
              <span v-if="item.legacy" class="primary-nav__legacy"
                ><Icon name="external" size="sm" /><span class="visually-hidden"
                  >(classic page)</span
                ></span
              >
            </RouterLink>
          </li>
        </ul>
      </Disclosure>

      <ul
        v-else
        class="primary-nav__list"
        :aria-label="
          group.id === 'system'
            ? `System: ${system?.metadata.title ?? 'none chosen'}`
            : group.label
        "
      >
        <li v-for="item in group.items" :key="item.name">
          <Tooltip
            v-if="mode === 'rail'"
            :text="
              group.id === 'system'
                ? `${item.label} · ${system?.metadata.title ?? 'none chosen'}`
                : item.label
            "
            side="right"
          >
            <RouterLink
              :to="item.to"
              class="primary-nav__link primary-nav__link--rail"
              :class="{ 'primary-nav__link--active': item.active }"
              :aria-current="item.active ? 'page' : undefined"
              :aria-label="item.label"
            >
              <Icon :name="item.icon" />
            </RouterLink>
          </Tooltip>
          <RouterLink
            v-else
            :to="item.to"
            class="primary-nav__link"
            :class="{ 'primary-nav__link--active': item.active }"
            :aria-current="item.active ? 'page' : undefined"
            @click="emit('navigate')"
          >
            <Icon :name="item.icon" />
            <span>{{ item.label }}</span>
            <span v-if="item.legacy" class="primary-nav__legacy"
              ><Icon name="external" size="sm" /><span class="visually-hidden"
                >(classic page)</span
              ></span
            >
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.primary-nav {
  display: flex;
  flex-direction: column;
  padding: 0 0 var(--space-3);
}

.primary-nav__group--system {
  padding: 0 var(--space-3) var(--space-2);
}

.primary-nav__group--system > .primary-nav__list {
  border: var(--border-width) solid var(--color-border-subtle);
  background: var(--color-surface-sunken);
}

.primary-nav:not(.primary-nav--rail)
  .primary-nav__group--system
  .primary-nav__link {
  padding-left: var(--space-6);
}

/* Directory guides connect the selected system to its pages without changing link semantics. */
.primary-nav:not(.primary-nav--rail)
  .primary-nav__group--system
  .primary-nav__list
  > li {
  position: relative;
}

.primary-nav:not(.primary-nav--rail)
  .primary-nav__group--system
  .primary-nav__list
  > li::before,
.primary-nav:not(.primary-nav--rail)
  .primary-nav__group--system
  .primary-nav__list
  > li::after {
  position: absolute;
  left: var(--space-3);
  content: '';
  pointer-events: none;
}

.primary-nav:not(.primary-nav--rail)
  .primary-nav__group--system
  .primary-nav__list
  > li::before {
  top: 0;
  bottom: 0;
  border-left: var(--border-width) solid var(--color-border-strong);
}

.primary-nav:not(.primary-nav--rail)
  .primary-nav__group--system
  .primary-nav__list
  > li:last-child::before {
  bottom: 50%;
}

.primary-nav:not(.primary-nav--rail)
  .primary-nav__group--system
  .primary-nav__list
  > li::after {
  top: 50%;
  width: var(--space-2);
  border-top: var(--border-width) solid var(--color-border-strong);
}

.primary-nav__group + .primary-nav__group {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: var(--border-width) solid var(--color-border-subtle);
}

.primary-nav__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.primary-nav__list--nested .primary-nav__link {
  padding-left: var(--space-8);
}

.primary-nav__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--size-control-md);
  padding: var(--space-2) var(--space-3);
  border: none;
  border-left: var(--border-width-indicator) solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--tracking-wide);
  line-height: var(--leading-snug);
  text-decoration: none;
  text-transform: uppercase;
  cursor: pointer;
}

.primary-nav__link:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.primary-nav__group--system .primary-nav__link:hover {
  background: var(--color-surface-base);
}

.primary-nav__link--active {
  border-left-color: var(--color-indicator);
  background: var(--color-surface-selected);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-bold);
}

.primary-nav__link:focus-visible {
  outline-offset: calc(var(--focus-width) * -1);
}

.primary-nav__legacy {
  display: inline-flex;
  margin-left: auto;
  color: var(--color-text-disabled);
}

.primary-nav__link--rail {
  justify-content: center;
  padding: 0;
}
</style>
