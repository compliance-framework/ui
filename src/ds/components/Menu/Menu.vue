<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue';
import { RouterLink } from 'vue-router';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui';
import Icon from '../Icon/Icon.vue';
import Tooltip from '../Tooltip/Tooltip.vue';
import { arrange, type MenuAction, type MenuEntry } from './menuEntries';

/**
 * An overflow or user menu (F-16 AC5, F-11). Danger items always sit last after a separator.
 * Disabled items stay focusable and show their reason as a caption (F-19 AC3). Items with `to`
 * are links. A `radio` entry is a single-choice group, e.g. the theme. The default trigger is an
 * icon button named by `label`, which should include the object ("Actions for risk Log retention
 * gap"); the `trigger` slot takes a custom trigger, which must be a native `button` element.
 * The `header` slot holds non-interactive content, e.g. the signed-in user, and describes the menu.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    items: MenuEntry[];
    /** Where the menu opens; `right` suits triggers in the navigation rail. */
    side?: 'bottom' | 'right';
  }>(),
  { side: 'bottom' },
);

const baseId = useId();
const entries = computed(() => arrange(props.items));
// The Tooltip around the default trigger provides its own popper context, which hides the
// trigger from the menu's; position the content against the trigger explicitly instead.
const defaultTrigger =
  useTemplateRef<InstanceType<typeof DropdownMenuTrigger>>('defaultTrigger');
const reference = computed(
  () => (defaultTrigger.value?.$el as HTMLElement | undefined) ?? undefined,
);

function onSelect(event: Event, entry: MenuAction): void {
  if (entry.disabledReason) {
    event.preventDefault();
    return;
  }
  entry.onSelect?.();
}
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <Tooltip v-else :text="label">
      <DropdownMenuTrigger
        ref="defaultTrigger"
        class="menu-trigger"
        :aria-label="label"
      >
        <Icon name="more" />
      </DropdownMenuTrigger>
    </Tooltip>
    <DropdownMenuPortal>
      <DropdownMenuContent
        as-child
        :side="side"
        :align="side === 'right' ? 'start' : 'end'"
        :side-offset="4"
        :collision-padding="8"
        :reference="reference"
        :aria-describedby="$slots.header ? `${baseId}-header` : undefined"
      >
        <!-- as-child: the role="menu" element is ours, so the scoped styles reach it -->
        <div class="menu" data-scroll>
          <template v-if="$slots.header">
            <div :id="`${baseId}-header`" class="menu__header">
              <slot name="header" />
            </div>
            <DropdownMenuSeparator class="menu__separator" />
          </template>
          <template v-for="(entry, i) in entries" :key="i">
            <DropdownMenuSeparator
              v-if="entry.type === 'separator'"
              class="menu__separator"
            />
            <DropdownMenuRadioGroup
              v-else-if="entry.type === 'radio'"
              :model-value="entry.value"
              @update:model-value="(value) => entry.onChange(String(value))"
            >
              <DropdownMenuLabel class="menu__label">{{
                entry.label
              }}</DropdownMenuLabel>
              <DropdownMenuRadioItem
                v-for="option in entry.options"
                :key="option.value"
                :value="option.value"
                :text-value="option.label"
                class="menu__item"
              >
                <Icon v-if="option.icon" :name="option.icon" />
                <span class="menu__text">{{ option.label }}</span>
                <DropdownMenuItemIndicator class="menu__indicator"
                  ><Icon name="check"
                /></DropdownMenuItemIndicator>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuItem
              v-else-if="entry.to && !entry.disabledReason"
              as-child
              :text-value="entry.label"
              @select="entry.onSelect?.()"
            >
              <RouterLink
                :to="entry.to"
                class="menu__item"
                :class="{
                  'menu__item--danger': entry.tone === 'danger',
                  'menu__item--current': entry.current,
                }"
                :aria-current="entry.current ? 'page' : undefined"
              >
                <Icon v-if="entry.icon" :name="entry.icon" />
                <span class="menu__text">{{ entry.label }}</span>
              </RouterLink>
            </DropdownMenuItem>
            <!-- as-child, so our aria-disabled wins over reka's (which would also make the item unfocusable) -->
            <DropdownMenuItem
              v-else
              as-child
              :text-value="entry.label"
              @select="(event: Event) => onSelect(event, entry)"
            >
              <div
                class="menu__item"
                :class="{
                  'menu__item--danger': entry.tone === 'danger',
                  'menu__item--disabled': entry.disabledReason,
                }"
                :aria-disabled="entry.disabledReason ? 'true' : undefined"
                :aria-labelledby="
                  entry.disabledReason ? `${baseId}-${i}-label` : undefined
                "
                :aria-describedby="
                  entry.disabledReason ? `${baseId}-${i}-reason` : undefined
                "
              >
                <Icon v-if="entry.icon" :name="entry.icon" />
                <span class="menu__text">
                  <span :id="`${baseId}-${i}-label`">{{ entry.label }}</span>
                  <span
                    v-if="entry.disabledReason"
                    :id="`${baseId}-${i}-reason`"
                    class="menu__reason"
                    >{{ entry.disabledReason }}</span
                  >
                </span>
              </div>
            </DropdownMenuItem>
          </template>
        </div>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style scoped>
.menu-trigger {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--size-control-md);
  height: var(--size-control-md);
  padding: 0;
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-none);
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-standard);
}

.menu-trigger:hover,
.menu-trigger[aria-expanded='true'] {
  background: var(--color-surface-hover);
}

.menu {
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  min-width: var(--width-column-sm);
  max-width: min(
    var(--width-column-lg),
    var(--reka-dropdown-menu-content-available-width)
  );
  max-height: var(--reka-dropdown-menu-content-available-height);
  overflow-y: auto;
  padding: var(--space-1) 0;
  background: var(--color-surface-overlay);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-raised);
}

.menu[data-state='open'] {
  animation: menu-in var(--duration-fast) var(--ease-standard);
}

.menu__header {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-body);
  overflow-wrap: anywhere;
}

.menu__separator {
  height: var(--border-width);
  margin: var(--space-1) 0;
  background: var(--color-border-subtle);
}

.menu__label {
  padding: var(--space-2) var(--space-3) var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-wide);
  line-height: var(--leading-snug);
  text-transform: uppercase;
}

.menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--size-control-md);
  padding: var(--space-2) var(--space-3);
  border: var(--border-width) solid transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  line-height: var(--leading-snug);
  text-decoration: none;
  cursor: pointer;
  user-select: none;
}

.menu__item[data-highlighted] {
  background: var(--color-surface-hover);
}

.menu__item--current {
  border-left: var(--border-width-indicator) solid var(--color-indicator);
  background: var(--color-surface-selected);
  font-weight: var(--font-weight-bold);
}

.menu__item--danger {
  color: var(--color-action-danger-fg);
}

.menu__item--danger[data-highlighted] {
  background: var(--color-action-danger-bg);
}

.menu__item.menu__item--disabled,
.menu__item.menu__item--disabled[data-highlighted] {
  border-style: dashed;
  border-color: var(--color-border-strong);
  background: transparent;
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.menu__text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
}

.menu__reason {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
}

.menu__indicator {
  display: inline-flex;
  margin-left: auto;
}

@keyframes menu-in {
  from {
    opacity: 0;
  }
}
</style>
