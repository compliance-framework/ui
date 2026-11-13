<script setup lang="ts">
import { computed } from 'vue';
import { TooltipProvider } from 'reka-ui';
import { useErrorDialogController } from '@/services/error-dialog';
import Button from '../Button/Button.vue';
import InlineMessage from '../InlineMessage/InlineMessage.vue';
import Cluster from '../layout/Cluster.vue';
import Stack from '../layout/Stack.vue';
import Dialog from './Dialog.vue';

/**
 * The app-wide error dialog (`services/error-dialog`, used by `useAxiosErrorDialog`) in
 * design-system form. Mounted once in App.
 */
const { state, hide } = useErrorDialogController();

const open = computed({
  get: () => state.visible,
  set: (value: boolean) => {
    if (!value) hide();
  },
});
const title = computed(
  () =>
    state.summary || (state.statusCode ? `Error ${state.statusCode}` : 'Error'),
);
</script>

<template>
  <!-- Outside AppShell, so it provides tooltips for the dialog's buttons itself. -->
  <TooltipProvider>
    <Dialog v-model:open="open" :title="title" size="s">
      <Stack gap="4">
        <InlineMessage tone="error">
          <p>{{ state.detail }}</p>
        </InlineMessage>
        <Cluster justify="end">
          <Button variant="primary" @click="hide()">{{
            state.closeLabel ?? 'Close'
          }}</Button>
        </Cluster>
      </Stack>
    </Dialog>
  </TooltipProvider>
</template>
