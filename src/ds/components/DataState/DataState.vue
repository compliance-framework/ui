<script setup lang="ts">
import { computed, useId } from 'vue';
import type { QueryStatus } from '@/ds/query';
import { useUserStore } from '@/stores/auth';
import Button from '../Button/Button.vue';
import Icon from '../Icon/Icon.vue';
import type { IconName } from '../Icon/icons';
import InlineMessage from '../InlineMessage/InlineMessage.vue';
import Skeleton from '../Skeleton/Skeleton.vue';

/**
 * The one component every data view uses for its non-ready states (F-14 AC1–4, F-19 AC1, P5).
 * States: loading → Skeleton; empty → neutral first-use panel with the create action (slot
 * `empty-actions`, gated by the screen); empty with `filters` → names the filters, with Clear
 * filters; error → plain-language message with Try again; forbidden → the user's role and who
 * to ask. The default slot renders only when ready. `headingLevel: 'none'` when the parent
 * already provides the heading.
 */
const props = withDefaults(
  defineProps<{
    status: QueryStatus;
    /** Plural noun used in the copy, e.g. "risks". */
    subject: string;
    emptyTitle?: string;
    /** Explains what the object is, for the first-use empty state. */
    emptyBody?: string;
    /** Labels of the active filters, e.g. "Status: Open". */
    filters?: string[];
    errorMessage?: string;
    skeleton?: 'text' | 'table' | 'panel';
    /** Icon concept for the first-use empty state, e.g. "risks". */
    icon?: IconName;
    headingLevel?: 2 | 3 | 4 | 'none';
  }>(),
  {
    emptyTitle: undefined,
    emptyBody: undefined,
    filters: () => [],
    errorMessage: undefined,
    skeleton: 'table',
    icon: 'info',
    headingLevel: 2,
  },
);
const emit = defineEmits<{ retry: []; clearFilters: [] }>();

const filtersLabelId = useId();
const headingTag = computed(() =>
  props.headingLevel === 'none' ? 'p' : `h${props.headingLevel}`,
);
const filtered = computed(
  () => props.status === 'empty' && props.filters.length > 0,
);
const userStore = useUserStore();
const signedInName = computed(
  () =>
    [userStore.user?.firstName, userStore.user?.lastName]
      .filter(Boolean)
      .join(' ') ||
    userStore.user?.email ||
    'an unknown user',
);
const panel = computed<{ icon: IconName; title: string }>(() => {
  if (props.status === 'forbidden')
    return {
      icon: 'forbidden',
      title: `You don't have access to ${props.subject}`,
    };
  if (filtered.value)
    return { icon: 'filter', title: 'Nothing matches these filters' };
  return {
    icon: props.icon,
    title: props.emptyTitle ?? `No ${props.subject} yet`,
  };
});
</script>

<template>
  <slot v-if="status === 'ready'" />

  <div v-else-if="status === 'loading'" aria-busy="true">
    <span class="visually-hidden">Loading {{ subject }}</span>
    <Skeleton :variant="skeleton" />
  </div>

  <InlineMessage
    v-else-if="status === 'error'"
    tone="error"
    :title="`We couldn't load ${subject}.`"
  >
    <p>
      {{
        errorMessage ??
        'Something went wrong on our side. Check your connection, then try again.'
      }}
    </p>
    <template #actions>
      <Button size="sm" icon="refresh" @click="emit('retry')">Try again</Button>
    </template>
  </InlineMessage>

  <div v-else class="data-state">
    <Icon :name="panel.icon" size="lg" class="data-state__icon" />
    <div class="data-state__content">
      <component :is="headingTag" class="data-state__title">{{
        panel.title
      }}</component>

      <template v-if="status === 'forbidden'">
        <p class="data-state__body">
          You're signed in as {{ signedInName }}. Your access doesn't include
          {{ subject }}.
        </p>
        <p class="data-state__body">
          To get access, contact your CCF administrator.
        </p>
      </template>

      <template v-else-if="filtered">
        <p :id="filtersLabelId" class="data-state__body">Active filters</p>
        <ul class="data-state__filters" :aria-labelledby="filtersLabelId">
          <li
            v-for="filter in filters"
            :key="filter"
            class="data-state__filter"
          >
            {{ filter }}
          </li>
        </ul>
        <div class="data-state__actions">
          <Button size="sm" icon="close" @click="emit('clearFilters')"
            >Clear filters</Button
          >
        </div>
      </template>

      <template v-else>
        <p v-if="emptyBody" class="data-state__body">{{ emptyBody }}</p>
        <div v-if="$slots['empty-actions']" class="data-state__actions">
          <slot name="empty-actions" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.data-state {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-4);
  min-width: 0;
  padding: var(--ds-space-8) var(--ds-space-6);
  background: var(--ds-color-surface-sunken);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  border-radius: var(--ds-radius-none);
}

.data-state__icon {
  color: var(--ds-color-text-secondary);
}

.data-state__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--ds-space-2);
  min-width: 0;
  max-width: var(--ds-width-form);
}

.data-state__title {
  font-family: var(--ds-font-display);
  font-size: var(--ds-font-size-h2);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-card);
  line-height: var(--ds-leading-snug);
}

.data-state__body {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-body);
}

.data-state__filters {
  display: flex;
  padding: 0;
  list-style: none;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}

.data-state__filter {
  padding: var(--ds-space-1) var(--ds-space-2);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
  overflow-wrap: anywhere;
}

.data-state__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
  margin-block-start: var(--ds-space-2);
}
</style>
