<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfigStore } from '@/stores/config';
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';

// Shown only on the public demo, where DEMO_FEEDBACK_URL points at the demo portal. The portal
// works out who sent the feedback from its LinkedIn session cookie, so the request carries
// credentials, and posts it to Slack.
const MAX_LENGTH = 4000;

const toast = useToast();
const configStore = useConfigStore();

const feedbackUrl = ref('');
const visible = ref(false);
const message = ref('');
const sending = ref(false);
const error = ref('');

const tooLong = computed(() => message.value.length > MAX_LENGTH);
const canSend = computed(
  () => message.value.trim() !== '' && !tooLong.value && !sending.value,
);

onMounted(async () => {
  try {
    feedbackUrl.value = (await configStore.getConfig()).DEMO_FEEDBACK_URL ?? '';
  } catch {
    feedbackUrl.value = '';
  }
});

function open() {
  error.value = '';
  visible.value = true;
}

async function send() {
  if (!canSend.value) return;
  sending.value = true;
  error.value = '';
  try {
    const response = await fetch(feedbackUrl.value, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.value,
        page: window.location.href,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      error.value =
        body.error ?? 'Your feedback could not be sent. Please try again.';
      return;
    }
    message.value = '';
    visible.value = false;
    toast.add({
      severity: 'success',
      summary: 'Thank you',
      detail: 'Your feedback has been sent to the CCF team.',
      life: 4000,
    });
  } catch {
    error.value = 'Your feedback could not be sent. Please try again.';
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <template v-if="feedbackUrl">
    <button
      class="fixed bottom-5 right-20 z-50 h-12 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-lg border border-gray-200 dark:border-slate-700 px-4 flex items-center gap-2 text-gray-700 dark:text-slate-200 hover:scale-105 transition-transform"
      type="button"
      data-testid="demo-feedback-button"
      @click="open"
    >
      <i class="pi pi-comment" aria-hidden="true" />
      <span class="text-sm font-medium">Feedback</span>
    </button>

    <Dialog
      v-model:visible="visible"
      modal
      header="Send feedback"
      class="w-full max-w-lg"
    >
      <form class="space-y-4 p-1" @submit.prevent="send">
        <p class="text-sm text-gray-600 dark:text-slate-400">
          Tell the CCF team what you think, what's confusing or what you'd like
          to see. We'll see your LinkedIn name and email with it.
        </p>
        <FormTextarea
          v-model="message"
          rows="6"
          :maxlength="MAX_LENGTH"
          :disabled="sending"
          aria-label="Feedback"
          placeholder="Your feedback"
          data-testid="demo-feedback-message"
        />
        <p
          v-if="error"
          class="text-sm text-red-500"
          data-testid="demo-feedback-error"
        >
          {{ error }}
        </p>
        <div class="flex justify-end gap-2">
          <SecondaryButton
            type="button"
            :disabled="sending"
            @click="visible = false"
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            :disabled="!canSend"
            data-testid="demo-feedback-send"
          >
            {{ sending ? 'Sending…' : 'Send' }}
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  </template>
</template>
