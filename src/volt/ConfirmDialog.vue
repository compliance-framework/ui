<template>
  <ConfirmDialog
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template #container="{ message, acceptCallback, rejectCallback }">
      <div v-if="isV2Route" class="flex flex-col gap-4 p-5">
        <p
          class="font-[var(--ui-v2-font-primary)] text-[32px] font-bold uppercase leading-[0.95] tracking-[-0.5px] text-[var(--ui-v2-foreground)]"
        >
          {{
            toDialogHeading(getDialogLabel(message.header, 'Confirm action?'))
          }}
        </p>

        <p
          class="font-[var(--ui-v2-font-secondary)] text-[14px] font-normal leading-[1.6] text-[var(--ui-v2-muted-foreground)]"
        >
          {{ message.message }}
        </p>

        <div
          v-if="isDestructive(message.acceptProps?.severity)"
          class="flex items-stretch gap-3 border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-4"
        >
          <div class="w-[3px] bg-[var(--ui-v2-error)]" />
          <div class="flex flex-col gap-1">
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold uppercase tracking-[1px] text-[var(--ui-v2-error)]"
            >
              Destructive action
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[12px] font-normal leading-[1.6] text-[var(--ui-v2-muted-foreground)]"
            >
              Review impact before continuing. This cannot be reversed.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3">
          <DangerButton
            v-if="isDestructive(message.acceptProps?.severity)"
            type="button"
            :ref="focusPrimaryActionButton"
            @click="acceptCallback"
          >
            {{ getDialogLabel(message.acceptProps?.label, 'Delete') }}
          </DangerButton>

          <PrimaryButton
            v-else
            type="button"
            :ref="focusPrimaryActionButton"
            @click="acceptCallback"
          >
            {{ getDialogLabel(message.acceptProps?.label, 'Confirm') }}
          </PrimaryButton>

          <SecondaryButton
            type="button"
            :class="cancelButtonClass(message.acceptProps?.severity)"
            @click="rejectCallback"
          >
            {{ getDialogLabel(message.rejectProps?.label, 'Cancel') }}
          </SecondaryButton>
        </div>

        <p
          class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold uppercase tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
        >
          {{ keyboardHint(message.acceptProps?.severity) }}
        </p>
      </div>

      <div v-else>
        <div class="flex shrink-0 items-center justify-between p-5">
          <span class="text-xl font-semibold">{{ message.header }}</span>
          <SecondaryButton
            variant="text"
            rounded
            @click="rejectCallback"
            autofocus
          >
            <template #icon>
              <TimesIcon />
            </template>
          </SecondaryButton>
        </div>
        <div class="flex items-center gap-4 overflow-y-auto px-5 pb-5 pt-0">
          <ExclamationTriangleIcon class="size-6" />
          {{ message.message }}
        </div>
        <div class="flex justify-end gap-2 px-5 pb-5 pt-0">
          <SecondaryButton
            @click="rejectCallback"
            :label="message.rejectProps.label"
            size="small"
          />
          <Button
            @click="acceptCallback"
            :class="message.acceptProps.severity"
            :label="message.acceptProps.label"
            size="small"
          />
        </div>
      </div>
    </template>
  </ConfirmDialog>
</template>

<script setup lang="ts">
import ExclamationTriangleIcon from '@primevue/icons/exclamationtriangle';
import TimesIcon from '@primevue/icons/times';
import ConfirmDialog, {
  type ConfirmDialogPassThroughOptions,
  type ConfirmDialogProps,
} from 'primevue/confirmdialog';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Button from './Button.vue';
import DangerButton from './DangerButton.vue';
import PrimaryButton from './PrimaryButton.vue';
import SecondaryButton from './SecondaryButton.vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ ConfirmDialogProps {}
defineProps<Props>();

const route = useRoute();

const isV2Route = computed(() =>
  route.matched.some((record) => record.meta.uiVersion === 'v2'),
);

const legacyTheme: ConfirmDialogPassThroughOptions = {
  root: `max-h-[90%] max-w-screen rounded-xl
        border border-surface-200 dark:border-slate-800
        bg-white dark:bg-slate-600
        text-surface-700 dark:text-gray-200 shadow-lg`,
  mask: `bg-black/50 fixed top-0 start-0 w-full h-full`,
  transition: {
    enterFromClass: 'opacity-0 scale-75',
    enterActiveClass:
      'transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)]',
    leaveActiveClass:
      'transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
    leaveToClass: 'opacity-0 scale-75',
  },
};

const v2Theme: ConfirmDialogPassThroughOptions = {
  root: `max-h-[90%] w-[min(92vw,45rem)] rounded-none
        border border-[var(--ui-v2-border)]
        bg-[var(--ui-v2-card)] text-[var(--ui-v2-foreground)] font-[var(--ui-v2-font-secondary)]`,
  mask: `fixed top-0 start-0 h-full w-full bg-black/45`,
  transition: {
    enterFromClass: 'opacity-0 scale-95',
    enterActiveClass:
      'transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)]',
    leaveActiveClass:
      'transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
    leaveToClass: 'opacity-0 scale-95',
  },
};

const theme = computed<ConfirmDialogPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);

function getDialogLabel(label: unknown, fallback: string): string {
  if (typeof label === 'string' && label.length > 0) {
    return label;
  }
  return fallback;
}

function isDestructive(severity: unknown): boolean {
  if (typeof severity !== 'string') {
    return false;
  }

  return severity === 'danger' || severity === 'error';
}

function toDialogHeading(value: string): string {
  return value.toUpperCase();
}

function keyboardHint(severity: unknown): string {
  if (isDestructive(severity)) {
    return 'ESC TO CANCEL  •  ENTER TO DELETE';
  }

  return 'ESC TO CANCEL  •  ENTER TO CONFIRM';
}

function cancelButtonClass(severity: unknown): string {
  if (isDestructive(severity)) {
    return 'text-[var(--ui-v2-muted-foreground)]';
  }

  return '';
}

function focusPrimaryActionButton(target: unknown): void {
  if (target === null) {
    return;
  }

  const targetWithElement = target as { $el?: unknown };

  const el =
    target instanceof HTMLElement
      ? target
      : targetWithElement.$el instanceof HTMLElement
        ? targetWithElement.$el
        : null;

  if (!el) {
    return;
  }

  requestAnimationFrame(() => {
    el.focus({ preventScroll: true });
  });
}
</script>
