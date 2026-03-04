<template>
  <MultiSelect
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template #dropdownicon>
      <ChevronDownIcon />
    </template>
    <template #loadingicon>
      <SpinnerIcon class="animate-spin" />
    </template>
    <template #filtericon>
      <SearchIcon
        :class="
          isV2Route
            ? 'text-[var(--ui-v2-secondary-foreground)]'
            : 'text-surface-400'
        "
      />
    </template>
    <template #clearicon="{ clearCallback }">
      <TimesIcon
        @click="clearCallback"
        :class="
          isV2Route
            ? 'absolute top-1/2 -mt-2 end-10 text-[var(--ui-v2-secondary-foreground)]'
            : 'text-surface-400 absolute top-1/2 -mt-2 end-10'
        "
      />
    </template>
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </MultiSelect>
</template>

<script setup lang="ts">
import ChevronDownIcon from '@primevue/icons/chevrondown';
import SearchIcon from '@primevue/icons/search';
import SpinnerIcon from '@primevue/icons/spinner';
import TimesIcon from '@primevue/icons/times';
import MultiSelect, {
  type MultiSelectPassThroughOptions,
  type MultiSelectProps,
} from 'primevue/multiselect';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ MultiSelectProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: MultiSelectPassThroughOptions = {
  root: `inline-flex cursor-pointer relative select-none rounded-md p-fluid:flex
        bg-surface-0 dark:bg-surface-950
        border border-ccf-300 dark:border-slate-700 dark:hover:border-slate-600
        p-focus:border-ccf-400
        p-filled:bg-surface-50 dark:p-filled:bg-surface-800
        p-invalid:border-red-400 dark:p-invalid:border-red-300
        p-disabled:bg-surface-200 p-disabled:text-surface-500 dark:p-disabled:bg-surface-700 dark:p-disabled:text-surface-400 p-disabled:pointer-events-none
        shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]
        transition-colors duration-200`,
  labelContainer: `overflow-hidden flex-auto`,
  label: `flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2 p-has-chip:py-1 p-has-chip:px-[0.375rem]
        text-surface-700 dark:text-surface-0
        p-placeholder:text-surface-500 dark:p-placeholder:text-surface-400
        p-disabled:text-surface-500 dark:p-disabled:text-surface-400
        p-empty:overflow-hidden p-empty:opacity-0
        p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]
        p-large:text-lg p-large:px-[0.875rem] p-large:py-[0.625rem]`,
  chipItem: `bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md`,
  pcChip: {
    root: `inline-flex items-center gap-2 px-3 py-1 rounded-sm
            bg-surface-100 dark:bg-surface-800
            text-surface-800 dark:text-surface-0
            has-[img]:pt-1 has-[img]:pb-1
            p-removable:pe-2`,
    removeIcon: `cursor-pointer text-base w-4 h-4 rounded-full text-surface-800 dark:text-surface-0`,
  },
  dropdown: `flex items-center justify-center shrink-0 bg-transparent
        text-surface-400 w-10 rounded-e-md`,
  overlay: `absolute top-0 left-0 rounded-md p-portal-self:min-w-full
        bg-white dark:bg-slate-700
        border border-surface-200 dark:border-surface-700
        text-surface-700 dark:text-white
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]`,
  header: `flex items-center pt-2 pb-1 px-4 gap-2`,
  pcHeaderCheckbox: {
    root: `relative inline-flex select-none w-5 h-5 align-bottom`,
    input: `peer cursor-pointer disabled:cursor-default appearance-none
            absolute start-0 top-0 w-full h-full m-0 p-0 opacity-0 z-10
            border border-transparent rounded-xs`,
    box: `flex justify-center items-center rounded-sm w-5 h-5
            border border-surface-300 dark:border-surface-700
            bg-surface-0 dark:bg-surface-950
            text-surface-700 dark:text-surface-0
            peer-enabled:peer-hover:border-surface-400 dark:peer-enabled:peer-hover:border-surface-600
            p-checked:border-primary p-checked:bg-primary p-checked:text-primary-contrast
            peer-enabled:peer-hover:p-checked:bg-primary-emphasis peer-enabled:peer-hover:p-checked:border-primary-emphasis
            peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-focus-visible:outline
            p-disabled:bg-surface-200 dark:p-disabled:bg-surface-400 p-disabled:border-surface-300 dark:p-disabled:border-surface-700 p-disabled:text-surface-700 dark:p-disabled:text-surface-400
            shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] transition-colors duration-200`,
    icon: `text-sm w-[0.875rem] h-[0.875rem] transition-none`,
  },
  pcFilterContainer: {
    root: `relative flex-auto`,
  },
  pcFilter: {
    root: `w-full appearance-none rounded-md outline-hidden
            bg-surface-0 dark:bg-surface-950
            text-surface-700 dark:text-surface-0
            placeholder:text-surface-500 dark:placeholder:text-surface-400
            border border-surface-300 dark:border-surface-700
            enabled:hover:border-surface-400 dark:enabled:hover:border-surface-600
            enabled:focus:border-primary
            disabled:bg-surface-200 disabled:text-surface-500
            dark:disabled:bg-surface-700 dark:disabled:text-surface-400
            ps-3 pe-10 py-2 p-fluid:w-full
            transition-colors duration-200 shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]`,
  },
  pcFilterIconContainer: {
    root: `absolute top-1/2 -mt-2 leading-none end-3 z-1`,
  },
  listContainer: `overflow-auto`,
  virtualScroller: ``,
  list: `m-0 p-1 list-none gap-[2px] flex flex-col`,
  optionGroup: `m-0 px-3 py-2 bg-transparent text-surface-500 dark:text-surface-400 font-semibold`,
  option: `cursor-pointer font-normal whitespace-nowrap relative overflow-hidden flex items-center gap-2 px-3 py-2
        rounded-sm text-surface-700 dark:text-surface-0 bg-transparent border-none
        p-focus:bg-surface-100 dark:p-focus:bg-surface-800 p-focus:text-surface-800 dark:p-focus:text-surface-0
        transition-colors duration-200`,
  optionLabel: ``,
  pcOptionCheckbox: {
    root: `relative inline-flex select-none w-5 h-5 align-bottom`,
    input: `peer cursor-pointer disabled:cursor-default appearance-none
            absolute start-0 top-0 w-full h-full m-0 p-0 opacity-0 z-10
            border border-transparent rounded-xs`,
    box: `flex justify-center items-center rounded-sm w-5 h-5
            border border-surface-300 dark:border-surface-700
            bg-surface-0 dark:bg-surface-950
            text-surface-700 dark:text-surface-0
            peer-enabled:peer-hover:border-surface-400 dark:peer-enabled:peer-hover:border-surface-600
            p-checked:border-primary p-checked:bg-primary p-checked:text-primary-contrast
            peer-enabled:peer-hover:p-checked:bg-primary-emphasis peer-enabled:peer-hover:p-checked:border-primary-emphasis
            peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-focus-visible:outline
            p-disabled:bg-surface-200 dark:p-disabled:bg-surface-400 p-disabled:border-surface-300 dark:p-disabled:border-surface-700 p-disabled:text-surface-700 dark:p-disabled:text-surface-400
            shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] transition-colors duration-200`,
    icon: `text-sm w-[0.875rem] h-[0.875rem] transition-none`,
  },
  emptyMessage: `px-3 py-2`,
  transition: {
    enterFromClass: 'opacity-0 scale-y-75',
    enterActiveClass: 'transition duration-120 ease-[cubic-bezier(0,0,0.2,1)]',
    leaveActiveClass: 'transition-opacity duration-100 ease-linear',
    leaveToClass: 'opacity-0',
  },
};

const v2Theme: MultiSelectPassThroughOptions = {
  root: `inline-flex cursor-pointer relative select-none rounded-none p-fluid:flex
        min-h-6 bg-[var(--ui-v2-primary-tint-15)] border border-[var(--ui-v2-primary)]
        p-focus:border-[var(--ui-v2-primary)] p-focus:bg-[var(--ui-v2-primary-tint-15)]
        p-invalid:border-[var(--ui-v2-error)] p-invalid:bg-[var(--ui-v2-error-tint-10)]
        p-disabled:pointer-events-none p-disabled:bg-[var(--ui-v2-surface)] p-disabled:border-[var(--ui-v2-border)] p-disabled:text-[var(--ui-v2-secondary-foreground)]
        transition-colors duration-150`,
  labelContainer: `overflow-hidden flex-auto`,
  label: `flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis px-2 py-[4px] p-has-chip:py-[2px] p-has-chip:px-[4px]
        font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] leading-none uppercase
        text-[var(--ui-v2-foreground)] p-placeholder:text-[var(--ui-v2-tertiary-foreground)]
        p-disabled:text-[var(--ui-v2-secondary-foreground)]
        p-empty:overflow-hidden p-empty:opacity-0
        p-small:text-[10px] p-small:px-2 p-small:py-[4px]
        p-large:text-[11px] p-large:px-2 p-large:py-[4px]`,
  chipItem: `bg-[var(--ui-v2-surface)] rounded-none border border-[var(--ui-v2-border)]`,
  pcChip: {
    root: `inline-flex items-center gap-1 px-2 py-[2px] rounded-none border border-[var(--ui-v2-border)]
            bg-[var(--ui-v2-surface)] text-[var(--ui-v2-muted-foreground)] font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[0.5px] p-removable:pe-1`,
    removeIcon:
      'cursor-pointer text-[10px] w-3 h-3 rounded-none text-[var(--ui-v2-secondary-foreground)]',
  },
  dropdown: `flex items-center justify-center shrink-0 bg-transparent
        text-[var(--ui-v2-foreground)] w-8 rounded-none border-s border-[var(--ui-v2-primary)]`,
  overlay: `absolute top-0 left-0 rounded-none p-portal-self:min-w-full
        bg-[var(--ui-v2-card)] border border-[var(--ui-v2-border)] text-[var(--ui-v2-foreground)]`,
  header: `flex items-center p-1 gap-2`,
  pcHeaderCheckbox: {
    root: `relative inline-flex select-none w-5 h-5 align-bottom`,
    input: `peer cursor-pointer disabled:cursor-default appearance-none
            absolute start-0 top-0 w-full h-full m-0 p-0 opacity-0 z-10
            border border-transparent rounded-none`,
    box: `flex justify-center items-center rounded-none w-4 h-4
            border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] text-[var(--ui-v2-muted-foreground)]
            peer-enabled:peer-hover:border-[var(--ui-v2-border)]
            p-checked:border-[var(--ui-v2-primary)] p-checked:bg-[var(--ui-v2-primary)] p-checked:text-[var(--ui-v2-primary-foreground)]
            peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ui-v2-primary)] peer-focus-visible:outline
            transition-colors duration-150`,
    icon: `text-[10px] w-3 h-3 transition-none`,
  },
  pcFilterContainer: {
    root: `relative flex-auto`,
  },
  pcFilter: {
    root: `w-full appearance-none rounded-none outline-hidden
            bg-[var(--ui-v2-surface)] text-[var(--ui-v2-foreground)]
            placeholder:text-[var(--ui-v2-tertiary-foreground)]
            border border-[var(--ui-v2-border)]
            enabled:hover:border-[var(--ui-v2-border)] enabled:focus:border-[var(--ui-v2-primary)]
            font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[0.5px]
            ps-2 pe-8 py-[4px] p-fluid:w-full transition-colors duration-150`,
  },
  pcFilterIconContainer: {
    root: `absolute top-1/2 -mt-2 leading-none end-3 z-1 text-[var(--ui-v2-secondary-foreground)]`,
  },
  listContainer: `overflow-auto`,
  virtualScroller: ``,
  list: `m-0 p-1 list-none gap-[2px] flex flex-col`,
  optionGroup: `m-0 px-2 py-[4px] bg-transparent text-[var(--ui-v2-secondary-foreground)]
        font-[var(--ui-v2-font-secondary)] text-[10px] font-bold tracking-[1px] uppercase`,
  option: `cursor-pointer whitespace-nowrap relative overflow-hidden flex items-center gap-2 h-6 px-2 py-[4px]
        rounded-none bg-[var(--ui-v2-surface)] border border-transparent
        text-[var(--ui-v2-muted-foreground)] font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px]
        p-focus:bg-[var(--ui-v2-primary-tint-15)] p-focus:border-[var(--ui-v2-primary)] p-focus:text-[var(--ui-v2-foreground)]
        p-selected:bg-[var(--ui-v2-primary-tint-15)] p-selected:border-[var(--ui-v2-primary)] p-selected:text-[var(--ui-v2-foreground)] p-selected:font-bold
        transition-colors duration-150`,
  optionLabel: ``,
  pcOptionCheckbox: {
    root: `relative inline-flex select-none w-5 h-5 align-bottom`,
    input: `peer cursor-pointer disabled:cursor-default appearance-none
            absolute start-0 top-0 w-full h-full m-0 p-0 opacity-0 z-10
            border border-transparent rounded-none`,
    box: `flex justify-center items-center rounded-none w-4 h-4
            border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] text-[var(--ui-v2-muted-foreground)]
            peer-enabled:peer-hover:border-[var(--ui-v2-border)]
            p-checked:border-[var(--ui-v2-primary)] p-checked:bg-[var(--ui-v2-primary)] p-checked:text-[var(--ui-v2-primary-foreground)]
            peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ui-v2-primary)] peer-focus-visible:outline
            transition-colors duration-150`,
    icon: `text-[10px] w-3 h-3 transition-none`,
  },
  emptyMessage: `px-3 py-2 ui-v2-meta text-[var(--ui-v2-muted-foreground)]`,
  transition: {
    enterFromClass: 'opacity-0 scale-y-75',
    enterActiveClass: 'transition duration-120 ease-[cubic-bezier(0,0,0.2,1)]',
    leaveActiveClass: 'transition-opacity duration-100 ease-linear',
    leaveToClass: 'opacity-0',
  },
};

const theme = computed<MultiSelectPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
