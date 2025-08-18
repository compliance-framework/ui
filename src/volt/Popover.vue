<template>
  <Popover
    ref="el"
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Popover>
</template>

<script setup lang="ts">
import Popover, {
  type PopoverPassThroughOptions,
  type PopoverProps,
} from 'primevue/popover';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ PopoverProps {}
defineProps<Props>();

const theme = ref<PopoverPassThroughOptions>({
  root: `mt-[10px] p-flipped:-mt-[10px] p-flipped:mb-[10px]
        bg-white dark:bg-slate-900 text-ccf-700 dark:text-slate-400
        border border-ccf-200 dark:border-slate-700
        rounded-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]
        before:bottom-full before:left-5 before:h-0 before:w-0 before:absolute before:pointer-events-none
        before:border-[10px] before:-ms-[10px] before:border-transparent before:border-b-ccf-200 dark:before:border-b-slate-700
        after:bottom-full after:left-5 after:h-0 after:w-0 after:absolute after:pointer-events-none
        after:border-[8px] after:-ms-[8px] after:border-transparent after:border-b-ccf-0 dark:after:border-b-slate-900
        p-flipped:before:bottom-auto p-flipped:before:top-full p-flipped:after:bottom-auto p-flipped:after:top-full
        p-flipped:after:border-b-transparent p-flipped:after:border-t-ccf-0 dark:p-flipped:after:border-t-slate-900
        p-flipped:before:border-b-transparent p-flipped:before:border-t-ccf-200 dark:p-flipped:before:border-t-slate-700`,
  content: `p-3`,
  transition: {
    enterFromClass: 'opacity-0 scale-y-75',
    enterActiveClass: 'transition duration-120 ease-[cubic-bezier(0,0,0.2,1)]',
    leaveActiveClass: 'transition-opacity duration-100 ease-linear',
    leaveToClass: 'opacity-0',
  },
});

const el = ref();
defineExpose({
  toggle: (event: Event, target: EventTarget) => el.value.toggle(event, target),
  show: (event: Event, target: EventTarget) => el.value.show(event, target),
  hide: () => el.value.toggle(),
});
</script>
