<template>
  <Chip
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template #removeicon="{ removeCallback, keydownCallback }">
      <TimesCircleIcon
        class="cursor-pointer text-base w-4 h-4 rounded-full text-surface-800 dark:text-surface-0 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="removeCallback"
        @keydown="keydownCallback"
      />
    </template>
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Chip>
</template>

<script setup lang="ts">
import TimesCircleIcon from '@primevue/icons/timescircle';
import Chip, {
  type ChipPassThroughOptions,
  type ChipProps,
} from 'primevue/chip';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ ChipProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: ChipPassThroughOptions = {
  root: `inline-flex items-center rounded-2xl gap-2 px-3 py-2
        bg-ccf-100 dark:bg-slate-800
        text-ccf-900 dark:text-slate-300
        has-[img]:pt-1 has-[img]:pb-1
        p-removable:pe-2`,
  image: `rounded-full w-8 h-8 -ms-2`,
  icon: `text-ccf-900 dark:text-slate-300 text-base w-4 h-4`,
};

const v2Theme: ChipPassThroughOptions = {
  root: `inline-flex items-center rounded-none gap-2 px-3 py-1.5 border border-[var(--ui-v2-border)]
        bg-[var(--ui-v2-surface)] text-[var(--ui-v2-foreground)] ui-v2-nav p-removable:pe-2`,
  image: `rounded-none w-8 h-8 -ms-2`,
  icon: `text-[var(--ui-v2-secondary-foreground)] text-base w-4 h-4`,
};

const theme = computed<ChipPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
