<template>
  <Dialog
    unstyled
    :pt="mergedTheme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template #closebutton="{ closeCallback }">
      <SecondaryButton variant="text" rounded @click="closeCallback" autofocus>
        <template #icon>
          <TimesIcon />
        </template>
      </SecondaryButton>
    </template>
    <template #maximizebutton="{ maximized, maximizeCallback }">
      <SecondaryButton
        variant="text"
        rounded
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
import { computed, ref } from 'vue';
import SecondaryButton from './SecondaryButton.vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ DialogProps {
  theme?: DialogPassThroughOptions;
  size?: string;
}

const props = defineProps<Props>();

const getSizeClass = () => {
  const size = props.size;
  const sizes: {[size: string]: string} = {
    'sm': 'w-1/4',
    'md': 'w-1/3',
    'lg': 'w-1/2',
  }
  if (size) {
    if (sizes.hasOwnProperty(size)) {
      return sizes[size];
    }
  }
  return sizes['md'];
};

const sizeClass = computed(() => getSizeClass());

// --- Defaults in OBJECT FORM (each part has { class: '...' }) ---
const defaultTheme: DialogPassThroughOptions = {
  root: {
    class: `max-h-[90%] max-w-screen rounded-xl
            border border-surface-200 dark:border-surface-700
            bg-white dark:bg-slate-900
            text-surface-700 dark:text-surface-0 shadow-lg
            p-maximized:w-screen p-maximized:h-screen p-maximized:top-0
            p-maximized:start-0 p-maximized:max-h-full p-maximized:rounded-none ` + sizeClass.value,
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
};

// Helper to merge two PT parts, concatenating class strings
function mergePtPart(
  a: DialogPassThroughOptionType<any>,
  b: DialogPassThroughOptionType<any>,
) {
  if (!a && !b) return undefined;

  const normalize = (val: typeof a): DialogPassThroughAttributes => {
    if (!val) return {};
    if (typeof val === 'string') return { class: val };
    if (typeof val === 'function') {
      // evaluate function with empty options or pass through later
      const res = val({} as any); // TODO: pass real options if you have them
      return normalize(res);
    }
    return val as DialogPassThroughAttributes;
  };
  const aObj = normalize(a);
  const bObj = normalize(b);
  const mergedClass = [aObj.class, bObj.class].filter(Boolean).join(' ');
  return { ...aObj, ...bObj, class: mergedClass };
}

// Deep-merge default + user theme
const mergedTheme = computed<DialogPassThroughOptions>(() => {
  const user = props.theme ?? {};
  return {
    root: mergePtPart(defaultTheme.root, user.root),
    header: mergePtPart(defaultTheme.header, user.header),
    title: mergePtPart(defaultTheme.title, user.title),
    headerActions: mergePtPart(defaultTheme.headerActions, user.headerActions),
    content: mergePtPart(defaultTheme.content, user.content),
    footer: mergePtPart(defaultTheme.footer, user.footer),
    mask: mergePtPart(defaultTheme.mask, user.mask),
    transition: { ...defaultTheme.transition, ...(user.transition ?? {}) },
  };
});


</script>
