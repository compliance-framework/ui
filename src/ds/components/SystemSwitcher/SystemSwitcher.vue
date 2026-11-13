<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui';
import type { AcceptableValue } from 'reka-ui';
import type { RouteLocationRaw } from 'vue-router';
import Icon from '../Icon/Icon.vue';

/**
 * The always-visible system context (P2, F-07 AC1): shows the current system in the sidebar or mobile header and
 * switches it in two interactions (open, choose), with search. The parent updates the URL.
 */
const props = defineProps<{
  systems: { id: string; name: string; description: string }[];
  currentId: string | undefined;
  allSystemsTo: RouteLocationRaw;
  variant?: 'sidebar' | 'compact';
}>();
const emit = defineEmits<{ select: [id: string] }>();

const open = ref(false);
const query = ref('');
const listId = useId();
const current = computed(() =>
  props.systems.find((system) => system.id === props.currentId),
);
const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return props.systems.filter((system) =>
    `${system.name} ${system.description}`.toLowerCase().includes(needle),
  );
});

function choose(value: AcceptableValue | AcceptableValue[] | undefined): void {
  if (typeof value !== 'string') return;
  open.value = false;
  query.value = '';
  emit('select', value);
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger
      class="switcher__trigger"
      :class="variant ? `switcher__trigger--${variant}` : undefined"
      :aria-label="
        variant === 'compact'
          ? `System: ${current?.name ?? 'Choose a system'}`
          : undefined
      "
      :title="
        variant === 'compact'
          ? `System: ${current?.name ?? 'Choose a system'}`
          : undefined
      "
    >
      <span v-if="variant === 'compact'" aria-hidden="true">S</span>
      <template v-else>
        <span class="switcher__eyebrow">System</span>
        <span class="switcher__name">{{
          current?.name ?? 'Choose a system'
        }}</span>
        <Icon name="expand" class="switcher__chevron" />
      </template>
    </PopoverTrigger>
    <PopoverPortal>
      <!-- as-child: reka's content wrapper drops scoped attributes, so the styled element is ours. -->
      <PopoverContent
        as-child
        align="start"
        :side-offset="4"
        :collision-padding="8"
      >
        <div class="switcher__content">
          <ListboxRoot
            :model-value="currentId"
            highlight-on-hover
            @update:model-value="choose"
          >
            <div class="switcher__search">
              <Icon name="search" />
              <ListboxFilter
                v-model="query"
                auto-focus
                class="switcher__filter"
                aria-label="Search systems"
                :aria-controls="listId"
                placeholder="Search systems"
              />
            </div>
            <ListboxContent
              :id="listId"
              class="switcher__list"
              aria-label="Systems"
              data-scroll
            >
              <ListboxItem
                v-for="system in filtered"
                :key="system.id"
                :value="system.id"
                class="switcher__option"
              >
                <span class="switcher__option-text">
                  <span class="switcher__option-name">{{ system.name }}</span>
                  <span class="switcher__option-description">{{
                    system.description
                  }}</span>
                </span>
                <ListboxItemIndicator class="switcher__indicator">
                  <Icon name="check" label="Current system" />
                </ListboxItemIndicator>
              </ListboxItem>
            </ListboxContent>
            <p
              v-if="filtered.length === 0"
              class="switcher__none"
              role="status"
            >
              No systems match “{{ query }}”.
            </p>
          </ListboxRoot>
          <RouterLink
            :to="allSystemsTo"
            class="switcher__all"
            @click="open = false"
            >All systems</RouterLink
          >
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
.switcher__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  height: var(--size-control-md);
  padding: 0 var(--space-3);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-none);
  background: var(--color-surface-sunken);
  color: var(--color-text-primary);
  cursor: pointer;
}

.switcher__trigger--sidebar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-1) var(--space-2);
  height: auto;
  min-height: var(--size-control-md);
  padding: var(--space-2);
  text-align: left;
}

.switcher__trigger--sidebar .switcher__eyebrow {
  grid-column: 1;
}

.switcher__trigger--sidebar .switcher__name {
  grid-column: 1;
  white-space: normal;
  overflow-wrap: anywhere;
}

.switcher__trigger--sidebar .switcher__chevron {
  grid-column: 2;
  grid-row: 1 / 3;
}

.switcher__trigger--compact {
  justify-content: center;
  padding: 0;
  min-width: var(--size-target-min);
  font-weight: var(--font-weight-bold);
}

.switcher__trigger:hover {
  background: var(--color-surface-base);
}

.switcher__eyebrow {
  color: var(--color-text-secondary);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.switcher__chevron {
  flex: none;
}

/* Narrow headers keep the system name visible; "System" stays in the accessible name. */
@media (max-width: 639px) {
  .switcher__eyebrow {
    position: absolute;
    width: var(--border-width);
    height: var(--border-width);
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}

.switcher__name {
  min-width: 0;
  overflow: hidden;
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.switcher__content {
  z-index: var(--z-overlay);
  width: min(var(--width-dialog-s), calc(100vw - var(--space-4)));
  border: var(--border-width) solid var(--color-border-strong);
  background: var(--color-surface-overlay);
  box-shadow: var(--shadow-raised);
}

.switcher__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  border-bottom: var(--border-width) solid var(--color-border-subtle);
  color: var(--color-text-secondary);
}

.switcher__filter {
  flex: 1;
  min-width: 0;
  height: var(--size-control-md);
  border: none;
  background: transparent;
  color: var(--color-text-primary);
}

.switcher__filter::placeholder {
  color: var(--color-text-secondary);
}

.switcher__filter:focus-visible {
  outline-offset: calc(var(--focus-width) * -1);
}

.switcher__list {
  max-height: calc(var(--size-control-md) * 7);
  overflow-y: auto;
  padding: var(--space-1) 0;
}

.switcher__option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-left: var(--border-width-indicator) solid transparent;
  cursor: pointer;
}

.switcher__option[data-highlighted] {
  background: var(--color-surface-hover);
  outline: var(--focus-width) solid var(--color-border-focus);
  outline-offset: calc(var(--focus-width) * -1);
}

.switcher__option[data-state='checked'] {
  border-left-color: var(--color-indicator);
  background: var(--color-surface-selected);
}

.switcher__option-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.switcher__option-name {
  font-weight: var(--font-weight-bold);
}

.switcher__option-description,
.switcher__none {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  line-height: var(--leading-snug);
}

.switcher__none {
  padding: var(--space-3);
}

.switcher__all {
  display: block;
  padding: var(--space-3);
  border-top: var(--border-width) solid var(--color-border-subtle);
  color: var(--color-text-primary);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.switcher__all:hover {
  background: var(--color-surface-hover);
}
</style>
