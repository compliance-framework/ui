<script setup lang="ts">
import type { DrawerPassThroughOptions } from 'primevue/drawer';
import { computed, onBeforeUnmount, ref } from 'vue';
import V2LucideIcon from '@/components/v2/primitives/V2LucideIcon.vue';
import Drawer from '@/volt/Drawer.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';

interface Props {
  title: string;
  description?: string;
  formId: string;
  submitMode?: 'create' | 'save';
  submitting?: boolean;
  disableSubmit?: boolean;
  widthClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  submitMode: 'save',
  submitting: false,
  disableSubmit: false,
  widthClass: 'w-screen! sm:w-[94vw]! lg:w-[560px]!',
});

const submitCopy = computed(() => {
  if (props.submitMode === 'create') {
    return {
      idle: 'Create',
      active: 'Creating',
    } as const;
  }

  return {
    idle: 'Save',
    active: 'Saving',
  } as const;
});

const drawerTheme: DrawerPassThroughOptions = {
  root: `flex flex-col pointer-events-auto relative rounded-none shadow-[0_24px_80px_rgba(25,29,45,0.16)]
        border-0 border-[var(--ui-v2-border)]
        bg-[var(--ui-v2-background)] text-[var(--ui-v2-foreground)] font-[var(--ui-v2-font-secondary)]
        p-left:w-[520px] p-left:h-full p-left:border-r
        p-right:w-[520px] p-right:h-full p-right:border-s
        p-top:h-[560px] p-top:w-full p-top:border-b
        p-bottom:h-[560px] p-bottom:w-full p-bottom:border-t
        p-full-screen:transform-none p-full-screen:w-screen p-full-screen:h-screen p-full-screen:max-h-full p-full-screen:top-0 p-full-screen:left-0`,
  header:
    'flex items-start justify-between gap-4 shrink-0 border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-6 py-5',
  content:
    'overflow-y-auto flex-grow bg-[var(--ui-v2-card)] p-6 text-[var(--ui-v2-muted-foreground)] font-[var(--ui-v2-font-secondary)]',
  footer:
    'border-t border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 pt-3 font-[var(--ui-v2-font-secondary)]',
};

const emit = defineEmits<{
  close: [];
}>();

const drawerVisible = ref(true);
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let closeQueued = false;

function queueClose(): void {
  if (closeQueued) {
    return;
  }

  closeQueued = true;
  closeTimer = setTimeout(() => {
    emit('close');
  }, 140);
}

function handleVisibleChange(visible: boolean): void {
  if (!visible) {
    queueClose();
  }
}

onBeforeUnmount(() => {
  if (closeTimer) {
    clearTimeout(closeTimer);
  }
});
</script>

<template>
  <Drawer
    v-model:visible="drawerVisible"
    modal
    blockScroll
    position="right"
    :class="['ssp-editor-drawer', widthClass]"
    :theme="drawerTheme"
    @update:visible="handleVisibleChange"
  >
    <template #closebutton="{ closeCallback }">
      <button
        type="button"
        class="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--ui-v2-muted-foreground)] transition-colors duration-150 hover:text-[var(--ui-v2-foreground)]"
        aria-label="Close drawer"
        @click="closeCallback"
      >
        <V2LucideIcon name="x" :size="18" />
      </button>
    </template>

    <template #header>
      <div class="flex min-w-0 flex-1 items-start justify-between gap-4 pr-0">
        <div class="min-w-0 flex-1 space-y-1">
          <h3
            class="font-[var(--ui-v2-font-primary)] text-[16px] font-bold uppercase leading-[1.1] text-[var(--ui-v2-foreground)]"
          >
            {{ title }}
          </h3>
          <p
            v-if="description"
            class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold leading-[1.45] tracking-[0.5px] text-[var(--ui-v2-secondary-foreground)]"
          >
            {{ description }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-3">
          <PrimaryButton
            class="!h-8 !px-4 !py-0 !text-[10px] shrink-0"
            size="small"
            type="submit"
            :form="formId"
            :disabled="disableSubmit || submitting"
          >
            <span class="ssp-editor-drawer__submit-label">
              <template v-if="submitting">
                <span>{{ submitCopy.active }}</span>
                <span
                  aria-hidden="true"
                  class="ssp-editor-drawer__ellipsis-shell"
                >
                  <span class="ssp-editor-drawer__ellipsis">...</span>
                </span>
              </template>
              <template v-else>
                {{ submitCopy.idle }}
              </template>
            </span>
          </PrimaryButton>
        </div>
      </div>
    </template>

    <div class="ssp-editor-drawer__canvas">
      <slot />
    </div>
  </Drawer>
</template>

<style>
.ssp-editor-drawer {
  overscroll-behavior: contain;
}

.ssp-editor-drawer__canvas {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 1.5rem;
}

.ssp-editor-drawer__submit-label {
  display: inline-flex;
  align-items: center;
}

.ssp-editor-drawer__ellipsis-shell {
  display: inline-block;
  width: 3ch;
  overflow: hidden;
}

.ssp-editor-drawer__ellipsis {
  display: inline-block;
  width: 3ch;
  animation: ssp-editor-drawer-ellipsis 1.2s steps(4, end) infinite;
}

@keyframes ssp-editor-drawer-ellipsis {
  from {
    width: 0;
  }

  to {
    width: 3ch;
  }
}

.ssp-editor-drawer > .overflow-y-auto {
  overscroll-behavior: contain !important;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.ssp-editor-drawer > .overflow-y-auto::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.ssp-editor-drawer input:not([type='checkbox']):not([type='radio']),
.ssp-editor-drawer textarea,
.ssp-editor-drawer select {
  background: var(--ui-v2-background) !important;
  border-color: var(--ui-v2-border) !important;
  font-size: 11px !important;
  font-weight: 500;
  letter-spacing: 0.3px;
  line-height: 1.45;
}

.ssp-editor-drawer input:not([type='checkbox']):not([type='radio']):focus,
.ssp-editor-drawer textarea:focus,
.ssp-editor-drawer select:focus {
  border-color: var(--ui-v2-primary) !important;
}
</style>
