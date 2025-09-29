<template>
  <Button
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
    @click="handleClick"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Button>
</template>

<script setup lang="ts">
import Button, {
  type ButtonPassThroughOptions,
  type ButtonProps,
} from 'primevue/button';
import { ptViewMerge } from './utils';
import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

interface Props extends /* @vue-ignore */ ButtonProps {
  to?: RouteLocationRaw;
}

const props = defineProps<Props>();
const router = useRouter();

function handleClick(event: MouseEvent) {
  if (props.to) {
    router.push(props.to);
  }
}

const theme: ButtonPassThroughOptions = {
  root: `inline-flex cursor-pointer select-none items-center justify-center overflow-hidden relative
        px-3 py-2 gap-2 rounded-md disabled:pointer-events-none disabled:opacity-60 transition-colors duration-200
        bg-transparent enabled:hover:bg-zinc-100 enabled:active:bg-zinc-200
        border border-ccf-400 enabled:hover:border-ccf-400 enabled:active:border-ccf-400
        text-slate-700 font-light enabled:hover:text-slate-800 enabled:active:text-slate-900
        dark:bg-transparent dark:enabled:hover:bg-slate-800 dark:enabled:active:bg-slate-700
        dark:border-slate-700 dark:enabled:hover:border-slate-700 dark:enabled:active:border-slate-600
        dark:text-slate-300 dark:enabled:hover:text-slate-200 dark:enabled:active:text-slate-100
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2
        focus-visible:outline-ccf-400 dark:focus-visible:outline-slate-500
        p-vertical:flex-col p-fluid:w-full p-fluid:p-icon-only:w-10
        p-icon-only:w-10 p-icon-only:px-0 p-icon-only:gap-0
        p-icon-only:p-rounded:rounded-full p-icon-only:p-rounded:h-10
        p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]
        p-large:text-[1.125rem] p-large:px-[0.875rem] p-large:py-[0.625rem]
        p-raised:shadow-sm p-rounded:rounded-[2rem]
    `,
  loadingIcon: ``,
  icon: `p-right:order-1 p-bottom:order-2`,
  label: `font-light p-icon-only:invisible p-icon-only:w-0
        p-small:text-sm p-large:text-[1.125rem]`,
  pcBadge: {
    root: `min-w-4 h-4 leading-4`,
  },
};
</script>
