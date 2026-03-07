<template>
  <PrimeButton
    unstyled
    v-bind="forwardedProps"
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template v-for="(_, slotName) in $slots" v-slot:[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </PrimeButton>
</template>

<script setup lang="ts">
import PrimeButton, {
  type ButtonPassThroughOptions,
  type ButtonProps,
} from 'primevue/button';
import { computed, useAttrs, useSlots } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ ButtonProps {}
const props = defineProps<Props>();
const attrs = useAttrs();
const slots = useSlots();

const isV2Route = useIsV2Route();

const forwardedProps = computed(() => {
  const {
    unstyled: _unstyled,
    pt: _pt,
    ptOptions: _ptOptions,
    ...rest
  } = props;
  return rest;
});

function attrValue(name: string): unknown {
  return attrs[name];
}

function boolValue(value: unknown): boolean {
  if (value === '' || value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  if (typeof value === 'string') return value !== 'false';
  return Boolean(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

const resolvedLabel = computed(
  () => props.label ?? stringValue(attrValue('label')),
);
const resolvedIcon = computed(
  () => props.icon ?? stringValue(attrValue('icon')),
);
const resolvedIconPos = computed(
  () => props.iconPos ?? stringValue(attrValue('iconPos')) ?? 'left',
);
const resolvedSize = computed(
  () => props.size ?? stringValue(attrValue('size')),
);
const resolvedRounded = computed(
  () => props.rounded ?? boolValue(attrValue('rounded')),
);
const resolvedRaised = computed(
  () => props.raised ?? boolValue(attrValue('raised')),
);
const resolvedFluid = computed(
  () => props.fluid ?? boolValue(attrValue('fluid')),
);
const resolvedLink = computed(() => props.link ?? boolValue(attrValue('link')));
const resolvedText = computed(() => props.text ?? boolValue(attrValue('text')));
const resolvedOutlined = computed(
  () => props.outlined ?? boolValue(attrValue('outlined')),
);

const resolvedVariant = computed(() => {
  if (props.variant) return props.variant;
  if (stringValue(attrValue('variant')))
    return stringValue(attrValue('variant'));
  if (resolvedLink.value) return 'link';
  if (resolvedText.value) return 'text';
  if (resolvedOutlined.value) return 'outlined';
  return 'solid';
});

const resolvedSeverity = computed(
  () => props.severity ?? stringValue(attrValue('severity')) ?? 'primary',
);

const hasDefaultSlot = computed(() => Boolean(slots.default?.().length));
const hasIconSlot = computed(() => Boolean(slots.icon?.().length));
const isIconOnly = computed(
  () =>
    !resolvedLabel.value &&
    !hasDefaultSlot.value &&
    (Boolean(resolvedIcon.value) || hasIconSlot.value),
);

function joinClasses(
  classes: Array<string | false | null | undefined>,
): string {
  return classes.filter(Boolean).join(' ');
}

function getLegacyToneClasses(): string {
  const variant = resolvedVariant.value;
  const severity = resolvedSeverity.value;

  if (variant === 'text' || variant === 'link') {
    if (severity === 'danger') {
      return 'border-transparent bg-transparent text-red-600 enabled:hover:bg-red-50 enabled:hover:text-red-700 enabled:active:bg-red-100';
    }

    return 'border-transparent bg-transparent text-surface-600 enabled:hover:bg-surface-100 enabled:hover:text-surface-700 enabled:active:bg-surface-200';
  }

  if (variant === 'outlined') {
    if (severity === 'danger') {
      return 'border-red-300 bg-transparent text-red-600 enabled:hover:bg-red-50 enabled:hover:border-red-400 enabled:active:bg-red-100';
    }

    if (severity === 'secondary') {
      return 'border-surface-300 bg-transparent text-surface-700 enabled:hover:bg-surface-50 enabled:hover:border-surface-400 enabled:active:bg-surface-100';
    }

    return 'border-primary-200 bg-transparent text-primary enabled:hover:bg-primary-50 enabled:hover:border-primary-300 enabled:active:bg-primary-100';
  }

  if (severity === 'danger') {
    return 'border-red-600 bg-red-600 text-white enabled:hover:border-red-700 enabled:hover:bg-red-700 enabled:active:border-red-800 enabled:active:bg-red-800';
  }

  if (severity === 'secondary') {
    return 'border-surface-200 bg-surface-100 text-surface-700 enabled:hover:border-surface-300 enabled:hover:bg-surface-200 enabled:active:border-surface-400 enabled:active:bg-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200';
  }

  return 'border-primary bg-primary text-primary-contrast enabled:hover:border-primary-emphasis enabled:hover:bg-primary-emphasis enabled:active:border-primary-emphasis-alt enabled:active:bg-primary-emphasis-alt';
}

function getV2ToneClasses(): string {
  const variant = resolvedVariant.value;
  const severity = resolvedSeverity.value;

  if (variant === 'text' || variant === 'link') {
    if (severity === 'danger') {
      return joinClasses([
        'border-transparent bg-transparent text-[var(--ui-v2-error)]',
        'enabled:hover:bg-[var(--ui-v2-error-tint-10)] enabled:hover:text-[var(--ui-v2-error)]',
        variant === 'link' && 'underline underline-offset-2',
      ]);
    }

    if (severity === 'secondary') {
      return joinClasses([
        'border-transparent bg-transparent text-[var(--ui-v2-secondary-foreground)]',
        'enabled:hover:bg-[var(--ui-v2-surface)] enabled:hover:text-[var(--ui-v2-foreground)]',
        variant === 'link' && 'underline underline-offset-2',
      ]);
    }

    return joinClasses([
      'border-transparent bg-transparent text-[var(--ui-v2-primary)]',
      'enabled:hover:bg-[var(--ui-v2-primary-tint-10)] enabled:hover:text-[var(--ui-v2-primary)]',
      variant === 'link' && 'underline underline-offset-2',
    ]);
  }

  if (severity === 'danger') {
    return 'border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] text-[var(--ui-v2-error)] enabled:hover:border-[var(--ui-v2-error)] enabled:hover:bg-[var(--ui-v2-error-tint-10)] enabled:hover:text-[var(--ui-v2-error)] enabled:active:border-[var(--ui-v2-error)] enabled:active:bg-[var(--ui-v2-error-tint-10)] enabled:active:text-[var(--ui-v2-error)]';
  }

  if (severity === 'secondary' || variant === 'outlined') {
    return 'border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] text-[var(--ui-v2-foreground)] enabled:hover:border-[var(--ui-v2-border)] enabled:hover:bg-[var(--ui-v2-background)] enabled:hover:text-[var(--ui-v2-foreground)] enabled:active:border-[var(--ui-v2-border)] enabled:active:bg-[var(--ui-v2-background)] enabled:active:text-[var(--ui-v2-foreground)]';
  }

  if (severity === 'contrast') {
    return 'border-[var(--ui-v2-foreground)] bg-[var(--ui-v2-foreground)] text-[var(--ui-v2-background)] enabled:hover:border-[var(--ui-v2-secondary-foreground)] enabled:hover:bg-[var(--ui-v2-secondary-foreground)] enabled:hover:text-[var(--ui-v2-background)] enabled:active:border-[var(--ui-v2-secondary-foreground)] enabled:active:bg-[var(--ui-v2-secondary-foreground)] enabled:active:text-[var(--ui-v2-background)]';
  }

  return 'border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] text-[var(--ui-v2-primary-foreground)] enabled:hover:border-[var(--ui-v2-primary)] enabled:hover:bg-[var(--ui-v2-primary)] enabled:hover:text-[var(--ui-v2-primary-foreground)] enabled:active:border-[var(--ui-v2-primary)] enabled:active:bg-[var(--ui-v2-primary)] enabled:active:text-[var(--ui-v2-primary-foreground)]';
}

const legacyRootClass = computed(() =>
  joinClasses([
    'inline-flex cursor-pointer select-none items-center justify-center overflow-hidden relative',
    'gap-2 rounded-md transition-colors duration-200',
    'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-60',
    resolvedSize.value === 'small' && 'px-[0.625rem] py-[0.375rem] text-sm',
    resolvedSize.value === 'large' &&
      'px-[0.875rem] py-[0.625rem] text-[1.125rem]',
    !resolvedSize.value && 'px-3 py-2',
    resolvedRounded.value && 'rounded-[2rem]',
    resolvedRaised.value && 'shadow-sm',
    resolvedFluid.value && 'w-full',
    (resolvedIconPos.value === 'top' || resolvedIconPos.value === 'bottom') &&
      'flex-col',
    isIconOnly.value &&
      (resolvedSize.value === 'small'
        ? 'h-8 w-8 px-0'
        : resolvedSize.value === 'large'
          ? 'h-11 w-11 px-0'
          : 'h-10 w-10 px-0'),
    getLegacyToneClasses(),
  ]),
);

const v2RootClass = computed(() =>
  joinClasses([
    'inline-flex cursor-pointer select-none items-center justify-center overflow-hidden relative',
    'gap-2 rounded-none border font-[var(--ui-v2-font-secondary)] font-bold uppercase leading-none tracking-[1px]',
    'transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-60',
    resolvedSize.value === 'small' && 'h-7 px-2.5 py-1 text-[10px]',
    resolvedSize.value === 'large' && 'h-10 px-[18px] py-[9px] text-[11px]',
    !resolvedSize.value && 'h-9 px-3 py-2 text-[11px]',
    resolvedRounded.value && 'rounded-full',
    resolvedRaised.value && 'shadow-none',
    resolvedFluid.value && 'w-full',
    (resolvedIconPos.value === 'top' || resolvedIconPos.value === 'bottom') &&
      'flex-col',
    isIconOnly.value &&
      (resolvedSize.value === 'small'
        ? 'h-7 w-7 px-0'
        : resolvedSize.value === 'large'
          ? 'h-10 w-10 px-0'
          : 'h-9 w-9 px-0'),
    resolvedSeverity.value === 'danger'
      ? 'focus-visible:outline-[var(--ui-v2-error)]'
      : resolvedSeverity.value === 'secondary'
        ? 'focus-visible:outline-[var(--ui-v2-border)]'
        : 'focus-visible:outline-[var(--ui-v2-primary)]',
    getV2ToneClasses(),
  ]),
);

const iconClass = computed(() =>
  joinClasses([
    resolvedIconPos.value === 'right' && 'order-1',
    resolvedIconPos.value === 'bottom' && 'order-2',
  ]),
);

const theme = computed<ButtonPassThroughOptions>(() => {
  if (isV2Route.value) {
    return {
      root: v2RootClass.value,
      loadingIcon: 'animate-spin',
      icon: iconClass.value,
      label: 'font-bold leading-none',
      pcBadge: {
        root: `min-w-4 h-4 leading-4 rounded-none text-[10px] font-bold
              bg-[var(--ui-v2-background)] text-[var(--ui-v2-foreground)]`,
      },
    };
  }

  return {
    root: legacyRootClass.value,
    loadingIcon: 'animate-spin',
    icon: iconClass.value,
    label: 'font-medium leading-none',
    pcBadge: {
      root: `min-w-4 h-4 leading-4 bg-primary-contrast rounded-full text-primary text-xs font-bold`,
    },
  };
});
</script>
