<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import Drawer from '@/volt/Drawer.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';

interface Props {
  title: string;
  description?: string;
  formId: string;
  submitLabel?: string;
  submitting?: boolean;
  disableSubmit?: boolean;
  widthClass?: string;
}

withDefaults(defineProps<Props>(), {
  description: '',
  submitLabel: 'Save',
  submitting: false,
  disableSubmit: false,
  widthClass: 'w-screen! sm:w-[94vw]! lg:w-[1040px]!',
});

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
    @update:visible="handleVisibleChange"
  >
    <template #header>
      <div class="flex min-w-0 flex-1 items-start justify-between gap-4 pr-2">
        <div class="min-w-0 space-y-2">
          <h3
            class="font-[var(--ui-v2-font-primary)] text-[16px] font-bold uppercase leading-[1.1] text-[var(--ui-v2-foreground)]"
          >
            {{ title }}
          </h3>
          <p
            v-if="description"
            class="ui-v2-body max-w-[64ch] text-[var(--ui-v2-muted-foreground)]"
          >
            {{ description }}
          </p>
        </div>

        <PrimaryButton
          class="shrink-0"
          type="submit"
          :form="formId"
          :disabled="disableSubmit || submitting"
        >
          {{ submitting ? 'Saving...' : submitLabel }}
        </PrimaryButton>
      </div>
    </template>

    <div class="min-h-full">
      <slot />
    </div>
  </Drawer>
</template>

<style>
.ssp-editor-drawer {
  overscroll-behavior: contain;
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
</style>
