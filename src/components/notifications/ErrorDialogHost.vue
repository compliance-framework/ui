<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Error"
    :closable="true"
    :draggable="false"
    size="sm"
  >
    <template #title>
      <span class="flex items-center gap-2">
        <span
          class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-red-500"
        >
          !
        </span>
        <span class="font-semibold">
          {{ header }}
        </span>
      </span>
    </template>

    <div class="space-y-4">
      <p class="text-gray-700 dark:text-slate-200 whitespace-pre-line">
        {{ state.detail }}
      </p>
    </div>

    <template #footer>
      <PrimaryButton type="button" @click="dismiss">
        {{ state.closeLabel ?? 'Close' }}
      </PrimaryButton>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import { useErrorDialogController } from '@/services/error-dialog';

const { state, hide } = useErrorDialogController();

const visible = computed({
  get: () => state.visible,
  set: (value: boolean) => {
    if (!value) {
      hide();
    }
  },
});

const header = computed(() => {
  if (state.summary) {
    return state.summary;
  }
  if (state.statusCode) {
    return `Error ${state.statusCode}`;
  }
  return 'Error';
});

function dismiss() {
  hide();
}
</script>

<style scoped>
@reference '@/assets/base.css';
</style>
