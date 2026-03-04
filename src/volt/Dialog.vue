<template>
  <Dialog
    unstyled
    :pt="mergedTheme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template #closebutton="{ closeCallback }">
      <SecondaryButton
        :variant="isV2Route ? undefined : 'text'"
        :rounded="!isV2Route"
        :class="
          isV2Route
            ? 'ui-v2-radius-none !h-9 !w-9 !p-0 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] text-[var(--ui-v2-secondary-foreground)] hover:border-[var(--ui-v2-primary)] hover:text-[var(--ui-v2-primary)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-v2-primary)]'
            : ''
        "
        aria-label="Close"
        @click="closeCallback"
        autofocus
      >
        <template #icon>
          <TimesIcon />
        </template>
      </SecondaryButton>
    </template>
    <template #maximizebutton="{ maximized, maximizeCallback }">
      <SecondaryButton
        :variant="isV2Route ? undefined : 'text'"
        :rounded="!isV2Route"
        :class="
          isV2Route
            ? 'ui-v2-radius-none !h-9 !w-9 !p-0 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] text-[var(--ui-v2-secondary-foreground)] hover:border-[var(--ui-v2-primary)] hover:text-[var(--ui-v2-primary)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-v2-primary)]'
            : ''
        "
        :aria-label="maximized ? 'Restore' : 'Maximize'"
        @click="maximizeCallback"
        autofocus
      >
        <template #icon>
          <WindowMinimizeIcon v-if="maximized" />
          <WindowMaximizeIcon v-else />
        </template>
      </SecondaryButton>
    </template>
    <template v-for="(_, slotName) in $slots" v-slot:[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import TimesIcon from '@primevue/icons/times';
import WindowMaximizeIcon from '@primevue/icons/windowmaximize';
import WindowMinimizeIcon from '@primevue/icons/windowminimize';
import Dialog, {
  type DialogPassThroughAttributes,
  type DialogPassThroughOptions,
  type DialogPassThroughOptionType,
  type DialogProps,
} from 'primevue/dialog';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SecondaryButton from './SecondaryButton.vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ DialogProps {
  theme?: DialogPassThroughOptions;
  size?: string;
}

const props = defineProps<Props>();
const route = useRoute();

const isV2Route = computed(() =>
  route.matched.some((record) => record.meta.uiVersion === 'v2'),
);

const getSizeClass = () => {
  const size = props.size;
  const sizes: { [size: string]: string } = {
    sm: 'w-1/4',
    md: 'w-1/3',
    lg: 'w-1/2',
  };
  if (size) {
    if (sizes.hasOwnProperty(size)) {
      return sizes[size];
    }
  }
  return sizes['md'];
};

const sizeClass = computed(() => getSizeClass());

const legacyTheme = computed<DialogPassThroughOptions>(() => ({
  root: {
    class:
      `max-h-[90%] max-w-screen rounded-xl
            border border-surface-200 dark:border-surface-700
            bg-white dark:bg-slate-900
            text-surface-700 dark:text-surface-0 shadow-lg
            p-maximized:w-screen p-maximized:h-screen p-maximized:top-0
            p-maximized:start-0 p-maximized:max-h-full p-maximized:rounded-none ` +
      sizeClass.value,
  },
  header: { class: 'flex items-center justify-between shrink-0 p-5' },
  title: { class: 'font-semibold text-xl dark:text-gray-200' },
  headerActions: { class: 'flex items-center gap-2 dark:text-gray-200' },
  content: {
    class:
      'overflow-y-auto pt-0 px-5 pb-5 p-maximized:grow dark:text-gray-200 flex flex-col',
  },
  footer: { class: 'shrink-0 pt-0 px-5 pb-5 flex justify-end gap-2' },
  mask: {
    class:
      'p-modal:bg-black/50 p-modal:fixed p-modal:top-0 p-modal:start-0 p-modal:w-full p-modal:h-full z-50',
  },
  transition: {
    enterFromClass: 'opacity-0 scale-75',
    enterActiveClass:
      'transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)]',
    leaveActiveClass:
      'transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
    leaveToClass: 'opacity-0 scale-75',
  },
}));

const v2Theme = computed<DialogPassThroughOptions>(() => ({
  root: {
    class:
      `max-h-[90%] max-w-screen rounded-none
            border border-[var(--ui-v2-border)]
            bg-[var(--ui-v2-card)] text-[var(--ui-v2-foreground)] font-[var(--ui-v2-font-secondary)]
            p-maximized:w-screen p-maximized:h-screen p-maximized:top-0
            p-maximized:start-0 p-maximized:max-h-full p-maximized:rounded-none ` +
      sizeClass.value,
  },
  header: {
    class:
      'flex items-center justify-between shrink-0 bg-[var(--ui-v2-card)] px-5 pb-0 pt-5 gap-4',
  },
  title: {
    class:
      'font-[var(--ui-v2-font-primary)] text-[32px] font-bold uppercase leading-[0.95] tracking-[-0.5px] text-[var(--ui-v2-foreground)]',
  },
  headerActions: {
    class: 'flex items-center gap-2 text-[var(--ui-v2-secondary-foreground)]',
  },
  content: {
    class:
      'flex flex-col overflow-y-auto bg-[var(--ui-v2-card)] px-5 pb-5 pt-4 text-[var(--ui-v2-muted-foreground)] font-[var(--ui-v2-font-secondary)] p-maximized:grow',
  },
  footer: {
    class:
      'shrink-0 flex justify-end gap-3 bg-[var(--ui-v2-card)] px-5 pb-5 pt-4',
  },
  mask: {
    class:
      'p-modal:fixed p-modal:top-0 p-modal:start-0 p-modal:h-full p-modal:w-full p-modal:bg-black/45 z-50',
  },
  transition: {
    enterFromClass: 'opacity-0 scale-95',
    enterActiveClass:
      'transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)]',
    leaveActiveClass:
      'transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
    leaveToClass: 'opacity-0 scale-95',
  },
}));

// Helper to merge two PT parts, concatenating class strings
function mergePtPart(
  a: DialogPassThroughOptionType<any>,
  b: DialogPassThroughOptionType<any>,
) {
  if (!a && !b) return undefined;

  const normalize = (
    val: typeof a,
  ): DialogPassThroughAttributes | undefined => {
    if (!val) return {};
    if (typeof val === 'string') return { class: val };
    if (typeof val === 'function') {
      console.warn('Unable to normalize dialog pass through attribute: ', val);
      return;
    }
    return val as DialogPassThroughAttributes;
  };
  const aObj = normalize(a);
  const bObj = normalize(b);

  if (!aObj || !bObj) {
    return {};
  }

  const mergedClass = [aObj.class, bObj.class].filter(Boolean).join(' ');
  return { ...aObj, ...bObj, class: mergedClass };
}

// Deep-merge default + user theme
const mergedTheme = computed<DialogPassThroughOptions>(() => {
  const baseTheme = isV2Route.value ? v2Theme.value : legacyTheme.value;
  const user = props.theme ?? {};
  return {
    root: mergePtPart(baseTheme.root, user.root),
    header: mergePtPart(baseTheme.header, user.header),
    title: mergePtPart(baseTheme.title, user.title),
    headerActions: mergePtPart(baseTheme.headerActions, user.headerActions),
    content: mergePtPart(baseTheme.content, user.content),
    footer: mergePtPart(baseTheme.footer, user.footer),
    mask: mergePtPart(baseTheme.mask, user.mask),
    transition: { ...baseTheme.transition, ...(user.transition ?? {}) },
  };
});
</script>
