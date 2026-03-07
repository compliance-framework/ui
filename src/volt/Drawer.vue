<template>
  <Drawer
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template #closebutton="{ closeCallback }">
      <SecondaryButton
        variant="text"
        :rounded="!isV2Route"
        :class="
          isV2Route
            ? 'ui-v2-radius-none border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] text-[var(--ui-v2-foreground)] hover:border-[var(--ui-v2-primary)] hover:text-[var(--ui-v2-primary)]'
            : ''
        "
        @click="closeCallback"
        autofocus
      >
        <template #icon>
          <TimesIcon />
        </template>
      </SecondaryButton>
    </template>
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import TimesIcon from '@primevue/icons/times';
import Drawer, {
  type DrawerPassThroughOptions,
  type DrawerProps,
} from 'primevue/drawer';
import { computed } from 'vue';
import SecondaryButton from './SecondaryButton.vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface DrawerShellProps extends /* @vue-ignore */ DrawerProps {
  theme?: DrawerPassThroughOptions;
}

const props = defineProps<DrawerShellProps>();

const isV2Route = useIsV2Route();

const legacyTheme: DrawerPassThroughOptions = {
  root: `flex flex-col pointer-events-auto relative
        border-ccf-200 dark:border-slate-700
        bg-white dark:bg-slate-950
        text-gray-700 dark:text-gray-200
        shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]
        p-left:w-80 p-left:h-full p-left:border-r
        p-right:w-80 p-right:h-full p-right:border-s
        p-top:h-40 p-top:w-full p-top:border-b
        p-bottom:h-40 p-bottom:w-full p-bottom:border-t
        p-full-screen:transition-opacity p-full-screen:transform-none p-full-screen:w-screen p-full-screen:h-screen p-full-screen:max-h-full p-full-screen:top-0 p-full-screen:left-0`,
  header: `flex items-center justify-between flex-shrink-0 p-5`,
  title: `font-semibold text-2xl`,
  content: `overflow-y-auto flex-grow pt-0 pb-5 px-5`,
  footer: `p-5`,
  mask: `p-modal:bg-black/50`,
  transition: {
    enterFromClass: `p-left:-translate-x-full p-right:translate-x-full p-top:-translate-y-full p-bottom:translate-y-full p-full-screen:opacity-0`,
    enterActiveClass: `transition-transform duration-100 ease-out p-full-screen:transition-opacity`,
    leaveActiveClass: `transition-transform duration-100 ease-in p-full-screen:transition-opacity`,
    leaveToClass: `p-left:-translate-x-full p-right:translate-x-full p-top:-translate-y-full p-bottom:translate-y-full p-full-screen:opacity-0`,
  },
};

const v2Theme: DrawerPassThroughOptions = {
  root: `flex flex-col pointer-events-auto relative rounded-none
        border-0 border-[var(--ui-v2-border)]
        bg-[var(--ui-v2-card)] text-[var(--ui-v2-foreground)] font-[var(--ui-v2-font-secondary)]
        p-left:w-[520px] p-left:h-full p-left:border-r
        p-right:w-[520px] p-right:h-full p-right:border-s
        p-top:h-[560px] p-top:w-full p-top:border-b
        p-bottom:h-[560px] p-bottom:w-full p-bottom:border-t
        p-full-screen:transition-opacity p-full-screen:transform-none p-full-screen:w-screen p-full-screen:h-screen p-full-screen:max-h-full p-full-screen:top-0 p-full-screen:left-0`,
  header: 'flex items-center justify-between flex-shrink-0 px-5 pb-0 pt-5',
  title:
    'font-[var(--ui-v2-font-primary)] text-[16px] font-bold uppercase leading-[1.1] text-[var(--ui-v2-foreground)]',
  content:
    'overflow-y-auto flex-grow px-5 pb-5 pt-3 bg-[var(--ui-v2-card)] text-[var(--ui-v2-muted-foreground)] font-[var(--ui-v2-font-secondary)]',
  footer: 'p-5 pt-3 bg-[var(--ui-v2-card)] font-[var(--ui-v2-font-secondary)]',
  mask: 'p-modal:bg-black/45',
  transition: {
    enterFromClass:
      'p-left:-translate-x-full p-right:translate-x-full p-top:-translate-y-full p-bottom:translate-y-full p-full-screen:opacity-0',
    enterActiveClass:
      'transition-transform duration-120 ease-out p-full-screen:transition-opacity',
    leaveActiveClass:
      'transition-transform duration-120 ease-in p-full-screen:transition-opacity',
    leaveToClass:
      'p-left:-translate-x-full p-right:translate-x-full p-top:-translate-y-full p-bottom:translate-y-full p-full-screen:opacity-0',
  },
};

const theme = computed<DrawerPassThroughOptions>(() => {
  const baseTheme = isV2Route.value ? v2Theme : legacyTheme;

  if (!props.theme) {
    return baseTheme;
  }

  return {
    ...baseTheme,
    ...props.theme,
    transition: props.theme.transition ?? baseTheme.transition,
  };
});
</script>
